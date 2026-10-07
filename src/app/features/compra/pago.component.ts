import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CompraService, CUPON_BIENVENIDA_PCT, DESCUENTO_MAYOR_PCT } from '../../core/services/compra.service';
import { CarritoCompra } from '../../core/models/compra.model';
import { DuracionPipe } from '../../shared/pipes/duracion.pipe';
import { ClasificacionPipe } from '../../shared/pipes/clasificacion.pipe';
import {
  DatosTarjeta,
  formatearNumeroTarjeta,
  formatearVencimiento,
  validarTarjeta,
} from '../../core/utils/tarjeta';

@Component({
  selector: 'app-pago',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, DuracionPipe, ClasificacionPipe, FormsModule],
  templateUrl: './pago.component.html',
  styleUrl: './pago.component.css',
})
export class PagoComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly compraService = inject(CompraService);
  protected readonly auth = inject(AuthService);

  protected readonly carrito = signal<CarritoCompra | null>(null);
  protected readonly procesando = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Datos de la tarjeta ficticia */
  protected tarjeta: DatosTarjeta = {
    titular: '',
    numero: '',
    vencimiento: '',
    cvv: '',
  };

  protected readonly pelicula = computed(() => this.carrito()?.funcion.peliculas ?? null);
  protected readonly funcion = computed(() => this.carrito()?.funcion ?? null);

  protected readonly puedeUsarCupon = computed(() => {
    const p = this.auth.perfil();
    return !!p && this.auth.estaRegistrado() && !p.cupon_bienvenida_usado;
  });

  protected readonly esMayor = computed(() => {
    const p = this.auth.perfil();
    if (!p?.fecha_nacimiento) return false;
    const [y, m, d] = p.fecha_nacimiento.split('-').map(Number);
    const hoy = new Date();
    let edad = hoy.getFullYear() - y;
    if (hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d)) edad--;
    return edad >= 50;
  });

  protected readonly cuponPct = Math.round(CUPON_BIENVENIDA_PCT * 100);
  protected readonly descuentoMayorPct = Math.round(DESCUENTO_MAYOR_PCT * 100);

  ngOnInit(): void {
    const state = history.state as { carrito?: CarritoCompra } | null;
    if (state?.carrito) {
      this.carrito.set(state.carrito);
      return;
    }
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      void this.router.navigate(['/funcion', id, 'butacas']);
    } else {
      void this.router.navigateByUrl('/peliculas');
    }
  }

  protected onNumeroInput(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.tarjeta.numero = formatearNumeroTarjeta(input.value);
    input.value = this.tarjeta.numero;
  }

  protected onVencimientoInput(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.tarjeta.vencimiento = formatearVencimiento(input.value);
    input.value = this.tarjeta.vencimiento;
  }

  protected onCvvInput(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.tarjeta.cvv = input.value.replace(/\D/g, '').slice(0, 4);
    input.value = this.tarjeta.cvv;
  }

  /** Rellena tarjeta de prueba Visa (pasa Luhn). */
  protected usarTarjetaPrueba(): void {
    this.tarjeta = {
      titular: 'CLIENTE PRUEBA',
      numero: '4242 4242 4242 4242',
      vencimiento: '12/30',
      cvv: '123',
    };
    this.error.set(null);
  }

  protected async confirmarPago(): Promise<void> {
    const c = this.carrito();
    if (!c || this.procesando()) return;

    const errorTarjeta = validarTarjeta(this.tarjeta);
    if (errorTarjeta) {
      this.error.set(errorTarjeta);
      return;
    }

    this.procesando.set(true);
    this.error.set(null);

    try {
      // Simulación de validación con el "gateway" (delay ficticio)
      await this.simularAutorizacion();

      const detalle = await this.compraService.confirmar(c);
      await this.router.navigate(['/funcion', c.funcionId, 'confirmacion'], {
        state: { detalle },
        replaceUrl: true,
      });
    } catch (e) {
      this.error.set(
        (e as { message?: string })?.message ??
          'No se pudo completar la compra. Probá de nuevo o elegí otras butacas.',
      );
      this.procesando.set(false);
    }
  }

  /** Simula autorización de tarjeta (1–1.5 s). Nunca cobra dinero real. */
  private simularAutorizacion(): Promise<void> {
    return new Promise((resolve, reject) => {
      const delay = 900 + Math.random() * 600;
      setTimeout(() => {
        // Rechazo simulado si CVV es 000 (para demo de error)
        if (this.tarjeta.cvv === '000') {
          reject(new Error('Pago rechazado por el emisor. Verificá los datos de la tarjeta.'));
          return;
        }
        resolve();
      }, delay);
    });
  }

  protected volver(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) void this.router.navigate(['/funcion', id, 'butacas']);
    else void this.router.navigateByUrl('/peliculas');
  }
}
