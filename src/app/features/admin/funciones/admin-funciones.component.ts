import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PeliculasService } from '../../../core/services/peliculas.service';
import { CambioButaca, FuncionesService } from '../../../core/services/funciones.service';
import { SalasService } from '../../../core/services/salas.service';
import { Pelicula } from '../../../core/models/pelicula.model';
import { FuncionDetalle, Formato, Idioma } from '../../../core/models/funcion.model';
import { Butaca } from '../../../core/models/sala.model';
import { DuracionPipe } from '../../../shared/pipes/duracion.pipe';
import { SalaMapaComponent } from '../../../shared/components/sala-mapa/sala-mapa.component';
import { AdminNavComponent } from '../shared/admin-nav.component';

const FORMATOS: Formato[] = ['2D', '3D', '4D', '5D'];
const IDIOMAS: { valor: Idioma; etiqueta: string }[] = [
  { valor: 'castellano', etiqueta: 'Castellano' },
  { valor: 'subtitulada', etiqueta: 'Subtitulada' },
];

@Component({
  selector: 'app-admin-funciones',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    DatePipe,
    DuracionPipe,
    SalaMapaComponent,
    AdminNavComponent,
  ],
  templateUrl: './admin-funciones.component.html',
  styleUrl: './admin-funciones.component.css',
})
export class AdminFuncionesComponent implements OnInit {
  private readonly funcionesService = inject(FuncionesService);
  private readonly peliculasService = inject(PeliculasService);
  private readonly salasService = inject(SalasService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly formatos = FORMATOS;
  protected readonly idiomas = IDIOMAS;

  protected readonly peliculas = signal<Pelicula[]>([]);
  protected readonly funciones = signal<FuncionDetalle[]>([]);
  protected readonly cargando = signal(true);
  protected readonly creando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly ahora = new Date();
  protected readonly hoy = this.ahora.toISOString().split('T')[0];

  protected readonly form = this.fb.nonNullable.group({
    pelicula_id: ['', Validators.required],
    fecha: ['', Validators.required],
    hora: ['', Validators.required],
    formato: ['2D' as Formato, Validators.required],
    idioma: ['castellano' as Idioma, Validators.required],
    precio_base: [8000, [Validators.required, Validators.min(1)]],
    precio_vip: [null as number | null],
    es_preventa: [false],
    precio_preventa: [null as number | null],
    fecha_fin_preventa: [''],
  });

  protected readonly peliculaElegida = computed(() =>
    this.peliculas().find((p) => p.id === this.form.controls.pelicula_id.value),
  );

  // --- Monitor en vivo de una función ---
  protected readonly funcionMonitoreada = signal<FuncionDetalle | null>(null);
  protected readonly butacasMonitor = signal<Butaca[]>([]);
  protected readonly ocupadasMonitor = signal<ReadonlySet<string>>(new Set());
  protected readonly cargandoMonitor = signal(false);
  private cancelarSuscripcion: (() => void) | null = null;

  async ngOnInit(): Promise<void> {
    try {
      const [peliculas, funciones] = await Promise.all([
        this.peliculasService.getPeliculas(),
        this.funcionesService.getFuncionesFuturas(),
      ]);
      this.peliculas.set(peliculas);
      this.funciones.set(funciones);
    } catch (e) {
      this.error.set(this.mensaje(e));
    } finally {
      this.cargando.set(false);
    }

    this.destroyRef.onDestroy(() => this.cancelarSuscripcion?.());
  }

  protected async crear(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.creando.set(true);
    this.error.set(null);
    try {
      await this.funcionesService.crearFuncion({
        pelicula_id: v.pelicula_id,
        fecha_hora_inicio: new Date(`${v.fecha}T${v.hora}`).toISOString(),
        formato: v.formato,
        idioma: v.idioma,
        precio_base: v.precio_base,
        precio_vip: v.precio_vip || null,
        es_preventa: v.es_preventa,
        precio_preventa: v.es_preventa ? v.precio_preventa : null,
        fecha_fin_preventa: v.es_preventa && v.fecha_fin_preventa ? new Date(v.fecha_fin_preventa).toISOString() : null,
      });
      this.form.patchValue({ fecha: '', hora: '' });
      this.funciones.set(await this.funcionesService.getFuncionesFuturas());
    } catch (e) {
      this.error.set(this.mensaje(e));
    } finally {
      this.creando.set(false);
    }
  }

  protected async eliminar(funcion: FuncionDetalle): Promise<void> {
    this.error.set(null);
    try {
      await this.funcionesService.eliminarFuncion(funcion.id);
      this.funciones.set(await this.funcionesService.getFuncionesFuturas());
      if (this.funcionMonitoreada()?.id === funcion.id) this.cerrarMonitor();
    } catch (e) {
      this.error.set(this.mensaje(e));
    }
  }

  protected async verOcupacion(funcion: FuncionDetalle): Promise<void> {
    if (this.funcionMonitoreada()?.id === funcion.id) {
      this.cerrarMonitor();
      return;
    }
    this.cancelarSuscripcion?.();
    this.funcionMonitoreada.set(funcion);
    this.cargandoMonitor.set(true);
    try {
      const [butacas, ocupadas] = await Promise.all([
        this.salasService.getButacas(funcion.sala_id),
        this.funcionesService.getButacasOcupadas(funcion.id),
      ]);
      this.butacasMonitor.set(butacas);
      this.ocupadasMonitor.set(ocupadas);
      this.cancelarSuscripcion = this.funcionesService.suscribirOcupadas(
        funcion.id,
        (cambio) => this.aplicarCambio(cambio),
        () => void this.refrescarOcupadas(funcion.id),
      );
    } catch (e) {
      this.error.set(this.mensaje(e));
    } finally {
      this.cargandoMonitor.set(false);
    }
  }

  private cerrarMonitor(): void {
    this.cancelarSuscripcion?.();
    this.cancelarSuscripcion = null;
    this.funcionMonitoreada.set(null);
  }

  private aplicarCambio(cambio: CambioButaca): void {
    this.ocupadasMonitor.update((s) => {
      const copia = new Set(s);
      cambio.tipo === 'ocupada' ? copia.add(cambio.butacaId) : copia.delete(cambio.butacaId);
      return copia;
    });
  }

  private async refrescarOcupadas(funcionId: string): Promise<void> {
    this.ocupadasMonitor.set(await this.funcionesService.getButacasOcupadas(funcionId));
  }

  private mensaje(e: unknown): string {
    return (e as { message?: string })?.message ?? 'Ocurrió un error inesperado.';
  }
}
