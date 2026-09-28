import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import {
  CarritoCompra,
  Compra,
  CompraDetalle,
  LineaCandy,
  LineaEntrada,
} from '../models/compra.model';
import { FuncionDetalle } from '../models/funcion.model';
import { Butaca } from '../models/sala.model';
import { ProductoCandy } from '../models/candy.model';
import { calcularEdad } from '../utils/edad';

/** Cupón de bienvenida: descuento fijo configurable (ARS). */
export const CUPON_BIENVENIDA_MONTO = 2000;

/** Descuento para mayores de 50 años (10 %). */
export const DESCUENTO_MAYOR_PCT = 0.1;

@Injectable({ providedIn: 'root' })
export class CompraService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly auth = inject(AuthService);

  /** Última compra confirmada (para la pantalla de QR sin depender solo de la URL). */
  private ultima: CompraDetalle | null = null;

  getUltima(): CompraDetalle | null {
    return this.ultima;
  }

  /**
   * Arma el carrito aplicando reglas de negocio:
   * - descuento 10 % si el usuario tiene ≥ 50 años
   * - cupón de bienvenida si está registrado y aún no lo usó
   * - crédito disponible de la cuenta (hasta el total restante)
   * - 1 punto por cada peso del total final
   */
  armarCarrito(
    funcion: FuncionDetalle,
    lineasEntrada: LineaEntrada[],
    lineasCandy: LineaCandy[],
  ): CarritoCompra {
    const subtotalEntradas = lineasEntrada.reduce((s, l) => s + l.precio, 0);
    const subtotalCandy = lineasCandy.reduce((s, l) => s + l.subtotal, 0);
    let base = subtotalEntradas + subtotalCandy;

    const perfil = this.auth.perfil();
    let descuentoMayor = 0;
    if (perfil?.fecha_nacimiento) {
      const edad = calcularEdad(perfil.fecha_nacimiento);
      if (edad >= 50) {
        descuentoMayor = Math.round(base * DESCUENTO_MAYOR_PCT);
        base -= descuentoMayor;
      }
    }

    let descuentoCupon = 0;
    if (perfil && !perfil.cupon_bienvenida_usado && this.auth.estaRegistrado()) {
      descuentoCupon = Math.min(CUPON_BIENVENIDA_MONTO, base);
      base -= descuentoCupon;
    }

    let creditoUsado = 0;
    if (perfil && perfil.credito_disponible > 0) {
      creditoUsado = Math.min(perfil.credito_disponible, base);
      base -= creditoUsado;
    }

    const total = Math.max(0, base);
    const puntosGanados = Math.floor(total); // 1 punto por peso

    return {
      funcionId: funcion.id,
      funcion,
      lineasEntrada,
      lineasCandy,
      subtotalEntradas,
      subtotalCandy,
      descuentoMayor,
      descuentoCupon,
      creditoUsado,
      total,
      puntosGanados,
    };
  }

  /**
   * Confirma la compra:
   * 1. Intenta ocupar las butacas en la base (RPC o insert).
   * 2. Genera código QR único.
   * 3. Guarda la compra si hay tabla; si no, simula en memoria.
   * 4. Actualiza puntos / cupón / crédito del perfil.
   */
  async confirmar(carrito: CarritoCompra): Promise<CompraDetalle> {
    const butacaIds = carrito.lineasEntrada.map((l) => l.butaca.id);
    const userId = this.auth.usuario()?.id ?? null;

    // 1. Ocupar butacas (si falla por carrera, el usuario elige de nuevo)
    await this.ocuparButacas(carrito.funcionId, butacaIds);

    const codigoQr = this.generarCodigoQr();
    const codigoManual = codigoQr.slice(-8).toUpperCase();

    let compra: Compra;

    try {
      const { data, error } = await this.supabase
        .from('compras')
        .insert({
          codigo_qr: codigoQr,
          usuario_id: userId,
          funcion_id: carrito.funcionId,
          total: carrito.total,
          puntos_otorgados: carrito.puntosGanados,
          estado: 'activa',
          detalle: {
            entradas: carrito.lineasEntrada.map((l) => ({
              butaca_id: l.butaca.id,
              fila: l.butaca.fila,
              columna: l.butaca.columna,
              tipo: l.butaca.tipo,
              precio: l.precio,
            })),
            candy: carrito.lineasCandy.map((l) => ({
              producto_id: l.producto.id,
              nombre: l.producto.nombre,
              cantidad: l.cantidad,
              subtotal: l.subtotal,
            })),
            descuentos: {
              mayor: carrito.descuentoMayor,
              cupon: carrito.descuentoCupon,
              credito: carrito.creditoUsado,
            },
          },
        })
        .select()
        .single();

      if (error) throw error;
      compra = data as Compra;
    } catch {
      // Tabla aún no existe o RLS: simulación local para poder avanzar el flujo.
      compra = {
        id: crypto.randomUUID(),
        codigo_qr: codigoQr,
        usuario_id: userId,
        funcion_id: carrito.funcionId,
        total: carrito.total,
        puntos_otorgados: carrito.puntosGanados,
        estado: 'activa',
        creado_en: new Date().toISOString(),
      };
    }

    // Actualizar perfil (puntos, cupón, crédito) — best effort
    await this.aplicarBeneficios(carrito);

    // Marcar butacas en butacas_ocupadas si el insert de compras no lo hizo vía trigger
    await this.asegurarOcupacion(carrito.funcionId, butacaIds, compra.id);

    const detalle: CompraDetalle = { compra, carrito, codigoManual };
    this.ultima = detalle;
    return detalle;
  }

  private async ocuparButacas(funcionId: string, butacaIds: string[]): Promise<void> {
    // Intento con RPC si existe
    try {
      const { error } = await this.supabase.rpc('ocupar_butacas', {
        p_funcion_id: funcionId,
        p_butaca_ids: butacaIds,
      });
      if (!error) return;
    } catch {
      /* seguir con insert directo */
    }

    const filas = butacaIds.map((butaca_id) => ({ funcion_id: funcionId, butaca_id }));
    const { error } = await this.supabase.from('butacas_ocupadas').insert(filas);
    if (error) {
      // Código de unique violation → alguien se adelantó
      if (error.code === '23505') {
        throw new Error(
          'Alguna de las butacas elegidas acaba de ser ocupada. Volvé al mapa y elegí otras.',
        );
      }
      // Si la tabla no permite insert desde el cliente, seguimos (simulación)
      console.warn('No se pudo marcar ocupación en base:', error.message);
    }
  }

  private async asegurarOcupacion(
    funcionId: string,
    butacaIds: string[],
    compraId: string,
  ): Promise<void> {
    try {
      await this.supabase.from('butacas_ocupadas').upsert(
        butacaIds.map((butaca_id) => ({
          funcion_id: funcionId,
          butaca_id,
          compra_id: compraId,
        })),
        { onConflict: 'funcion_id,butaca_id', ignoreDuplicates: true },
      );
    } catch {
      /* ignorar */
    }
  }

  private async aplicarBeneficios(carrito: CarritoCompra): Promise<void> {
    const perfil = this.auth.perfil();
    if (!perfil || !this.auth.estaRegistrado()) return;

    const updates: Record<string, number | boolean> = {
      puntos_fidelidad: (perfil.puntos_fidelidad ?? 0) + carrito.puntosGanados,
    };
    if (carrito.descuentoCupon > 0) {
      updates['cupon_bienvenida_usado'] = true;
    }
    if (carrito.creditoUsado > 0) {
      updates['credito_disponible'] = Math.max(
        0,
        (perfil.credito_disponible ?? 0) - carrito.creditoUsado,
      );
    }

    try {
      await this.supabase.from('perfiles').update(updates).eq('id', perfil.id);
      this.auth.parchearPerfil({
        puntos_fidelidad: updates['puntos_fidelidad'] as number,
        cupon_bienvenida_usado:
          (updates['cupon_bienvenida_usado'] as boolean) ?? perfil.cupon_bienvenida_usado,
        credito_disponible:
          (updates['credito_disponible'] as number) ?? perfil.credito_disponible,
      });
    } catch (e) {
      console.warn('No se pudieron actualizar beneficios del perfil:', e);
    }
  }

  /** Código único legible + sufijo aleatorio (para el QR). */
  private generarCodigoQr(): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rnd = crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();
    return `CINE-${ts}-${rnd}`;
  }
}
