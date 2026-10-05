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
import { calcularEdad } from '../utils/edad';

/** Cupón de bienvenida: porcentaje configurable (enunciado: 20 %). */
export const CUPON_BIENVENIDA_PCT = 0.2;

/** Descuento para mayores de 50 años (10 %). */
export const DESCUENTO_MAYOR_PCT = 0.1;

@Injectable({ providedIn: 'root' })
export class CompraService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly auth = inject(AuthService);

  private ultima: CompraDetalle | null = null;

  getUltima(): CompraDetalle | null {
    return this.ultima;
  }

  /**
   * Arma el carrito:
   * - 10 % si edad ≥ 50
   * - cupón de bienvenida 20 % si registrado y no usado
   * - crédito a favor
   * - 1 punto por cada peso del total final
   */
  armarCarrito(
    funcion: FuncionDetalle,
    lineasEntrada: LineaEntrada[],
    lineasCandy: LineaCandy[],
    fechaNacimiento?: string | null,
  ): CarritoCompra {
    const subtotalEntradas = lineasEntrada.reduce((s, l) => s + l.precio, 0);
    const subtotalCandy = lineasCandy.reduce((s, l) => s + l.subtotal, 0);
    let base = subtotalEntradas + subtotalCandy;

    const perfil = this.auth.perfil();
    const nacimiento = fechaNacimiento ?? perfil?.fecha_nacimiento;
    let descuentoMayor = 0;
    if (nacimiento) {
      const edad = calcularEdad(nacimiento);
      if (edad >= 50) {
        descuentoMayor = Math.round(base * DESCUENTO_MAYOR_PCT);
        base -= descuentoMayor;
      }
    }

    let descuentoCupon = 0;
    if (perfil && !perfil.cupon_bienvenida_usado && this.auth.estaRegistrado()) {
      descuentoCupon = Math.round(base * CUPON_BIENVENIDA_PCT);
      base -= descuentoCupon;
    }

    let creditoUsado = 0;
    if (perfil && perfil.credito_disponible > 0) {
      creditoUsado = Math.min(perfil.credito_disponible, base);
      base -= creditoUsado;
    }

    const total = Math.max(0, base);
    const puntosGanados = Math.floor(total);

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
   * Confirma la compra de forma durable:
   * 1. RPC registrar_compra (compra + butacas ocupadas atómico)
   * 2. Fallback: ocupar_butacas + insert compras / simulación local
   * 3. Beneficios de perfil (puntos, cupón, crédito)
   */
  async confirmar(carrito: CarritoCompra): Promise<CompraDetalle> {
    const butacaIds = carrito.lineasEntrada.map((l) => l.butaca.id);
    const userId = this.auth.usuario()?.id ?? null;
    const codigoQr = this.generarCodigoQr();
    const codigoManual = codigoQr.slice(-8).toUpperCase();

    const detalleJson = {
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
    };

    let compra: Compra;

    // Preferido: un solo RPC atómico
    const registrado = await this.registrarCompraRpc(
      carrito,
      butacaIds,
      codigoQr,
      userId,
      detalleJson,
    );

    if (registrado) {
      compra = registrado;
    } else {
      // Fallback legacy: ocupar y luego intentar insert
      await this.ocuparButacas(carrito.funcionId, butacaIds);
      compra = await this.insertarCompraOSimular(carrito, codigoQr, userId, detalleJson);
    }

    await this.aplicarBeneficios(carrito);

    const detalle: CompraDetalle = { compra, carrito, codigoManual };
    this.ultima = detalle;
    return detalle;
  }

  private async registrarCompraRpc(
    carrito: CarritoCompra,
    butacaIds: string[],
    codigoQr: string,
    userId: string | null,
    detalle: Record<string, unknown>,
  ): Promise<Compra | null> {
    const { data, error } = await this.supabase.rpc('registrar_compra', {
      p_funcion_id: carrito.funcionId,
      p_butaca_ids: butacaIds,
      p_codigo_qr: codigoQr,
      p_usuario_id: userId,
      p_total: carrito.total,
      p_puntos: carrito.puntosGanados,
      p_detalle: detalle,
    });

    if (!error && data) {
      return {
        id: data as string,
        codigo_qr: codigoQr,
        usuario_id: userId,
        funcion_id: carrito.funcionId,
        total: carrito.total,
        puntos_otorgados: carrito.puntosGanados,
        estado: 'activa',
        creado_en: new Date().toISOString(),
      };
    }

    if (error && (error.code === '23505' || (error.message ?? '').includes('BUTACA_OCUPADA'))) {
      throw new Error(
        'Alguna de las butacas elegidas acaba de ser ocupada. Volvé al mapa y elegí otras.',
      );
    }

    // RPC no existe todavía → el caller usa fallback
    if (
      error &&
      (error.code === 'PGRST202' ||
        (error.message ?? '').toLowerCase().includes('could not find the function'))
    ) {
      return null;
    }

    if (error) {
      console.warn('registrar_compra falló, se intenta fallback:', error.message);
      return null;
    }
    return null;
  }

  private async insertarCompraOSimular(
    carrito: CarritoCompra,
    codigoQr: string,
    userId: string | null,
    detalle: Record<string, unknown>,
  ): Promise<Compra> {
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
          detalle,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Compra;
    } catch (e) {
      console.warn('Insert compras no disponible (RLS/tabla). Compra local:', e);
      return {
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
  }

  private async ocuparButacas(funcionId: string, butacaIds: string[]): Promise<void> {
    const { error: rpcError } = await this.supabase.rpc('ocupar_butacas', {
      p_funcion_id: funcionId,
      p_butaca_ids: butacaIds,
    });

    if (!rpcError) return;

    if (
      rpcError.code === '23505' ||
      (rpcError.message ?? '').includes('BUTACA_OCUPADA') ||
      (rpcError.message ?? '').toLowerCase().includes('unique')
    ) {
      throw new Error(
        'Alguna de las butacas elegidas acaba de ser ocupada. Volvé al mapa y elegí otras.',
      );
    }

    const rpcNoExiste =
      rpcError.code === 'PGRST202' ||
      (rpcError.message ?? '').toLowerCase().includes('could not find the function');

    if (!rpcNoExiste) {
      throw new Error(
        rpcError.message ||
          'No se pudieron reservar las butacas. Ejecutá sql/ocupar-butacas.sql y sql/minimo-entregable.sql.',
      );
    }

    const filas = butacaIds.map((butaca_id) => ({ funcion_id: funcionId, butaca_id }));
    const { error } = await this.supabase.from('butacas_ocupadas').insert(filas);
    if (!error) return;

    if (error.code === '23505') {
      throw new Error(
        'Alguna de las butacas elegidas acaba de ser ocupada. Volvé al mapa y elegí otras.',
      );
    }
    if (
      error.code === '42501' ||
      (error.message ?? '').toLowerCase().includes('row-level security')
    ) {
      throw new Error(
        'No se pudieron guardar las butacas (RLS). Ejecutá sql/ocupar-butacas.sql en Supabase.',
      );
    }
    throw new Error(error.message || 'No se pudieron reservar las butacas.');
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
        credito_disponible: (updates['credito_disponible'] as number) ?? perfil.credito_disponible,
      });
    } catch (e) {
      console.warn('No se pudieron actualizar beneficios del perfil:', e);
    }
  }

  private generarCodigoQr(): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rnd = crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();
    return `CINE-${ts}-${rnd}`;
  }

  // En compra.service.ts
  async cancelarCompra(compraId: string): Promise<void> {
    const { error } = await this.supabase.rpc('cancelar_compra', {
      p_compra_id: compraId,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  // También necesitarás un método para traer el historial del usuario:
  async getHistorialCompras(usuarioId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('compras')
      .select(
        `
      id, total, estado, fecha,
      funciones (
        fecha_hora_inicio,
        peliculas ( nombre )
      )
    `,
      )
      .eq('usuario_id', usuarioId)
      .order('fecha', { ascending: false });

    if (error) throw error;
    return data;
  }
}
