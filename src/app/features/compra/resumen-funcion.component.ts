import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FuncionesService } from '../../core/services/funciones.service';
import { FuncionDetalle } from '../../core/models/funcion.model';
import { precioButaca, precioEntrada } from '../../core/utils/precios';
import { DuracionPipe } from '../../shared/pipes/duracion.pipe';
import { ClasificacionPipe } from '../../shared/pipes/clasificacion.pipe';

/**
 * Pantalla intermedia entre "elegí un horario" y "elegí tus butacas": muestra la película, la
 * función completa y el precio antes de pedir cuenta o pasar al mapa de butacas. Es pública
 * a propósito (no exige sesión): recién `sesionGuard` la pide al tocar "Continuar".
 */
@Component({
  selector: 'app-resumen-funcion',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe, DuracionPipe, ClasificacionPipe],
  templateUrl: './resumen-funcion.component.html',
  styleUrl: './resumen-funcion.component.css',
})
export class ResumenFuncionComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly funcionesService = inject(FuncionesService);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly funcion = signal<FuncionDetalle | null>(null);

  protected readonly pelicula = computed(() => this.funcion()?.peliculas ?? null);

  protected readonly precioNormal = computed(() => {
    const f = this.funcion();
    return f ? precioEntrada(f) : 0;
  });
  protected readonly precioVip = computed(() => {
    const f = this.funcion();
    return f ? precioButaca(f, 'vip') : 0;
  });
  protected readonly enPreventa = computed(() => {
    const f = this.funcion();
    return !!f && this.precioNormal() !== f.precio_base;
  });

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Función inválida.');
      this.cargando.set(false);
      return;
    }
    try {
      const funcion = await this.funcionesService.getFuncion(id);
      if (!funcion) {
        this.error.set('No encontramos esa función. Puede que ya no esté disponible.');
        return;
      }
      this.funcion.set(funcion);
    } catch (e) {
      this.error.set((e as { message?: string })?.message ?? 'No se pudo cargar la función.');
    } finally {
      this.cargando.set(false);
    }
  }

  protected continuar(): void {
    const f = this.funcion();
    if (f) void this.router.navigate(['/funcion', f.id, 'butacas']);
  }
}
