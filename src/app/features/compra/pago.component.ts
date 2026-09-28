import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CompraService, CUPON_BIENVENIDA_MONTO, DESCUENTO_MAYOR_PCT } from '../../core/services/compra.service';
import { CarritoCompra } from '../../core/models/compra.model';
import { DuracionPipe } from '../../shared/pipes/duracion.pipe';
import { ClasificacionPipe } from '../../shared/pipes/clasificacion.pipe';

@Component({
  selector: 'app-pago',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe, DuracionPipe, ClasificacionPipe],
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

  protected readonly cuponMonto = CUPON_BIENVENIDA_MONTO;
  protected readonly descuentoMayorPct = Math.round(DESCUENTO_MAYOR_PCT * 100);

  ngOnInit(): void {
    const state = history.state as { carrito?: CarritoCompra } | null;
    if (state?.carrito) {
      this.carrito.set(state.carrito);
      return;
    }
    // Sin estado (refresh / acceso directo): volver a butacas
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      void this.router.navigate(['/funcion', id, 'butacas']);
    } else {
      void this.router.navigateByUrl('/peliculas');
    }
  }

  protected async confirmarPago(): Promise<void> {
    const c = this.carrito();
    if (!c || this.procesando()) return;

    this.procesando.set(true);
    this.error.set(null);

    try {
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

  protected volver(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) void this.router.navigate(['/funcion', id, 'butacas']);
    else void this.router.navigateByUrl('/peliculas');
  }
}
