import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { PeliculasService } from '../../../core/services/peliculas.service';
import { Pelicula } from '../../../core/models/pelicula.model';
import { ClasificacionPipe } from '../../../shared/pipes/clasificacion.pipe';
import { DuracionPipe } from '../../../shared/pipes/duracion.pipe';

@Component({
  selector: 'app-admin-peliculas',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, ClasificacionPipe, DuracionPipe],
  templateUrl: './admin-peliculas.component.html',
  styleUrl: './admin-peliculas.component.css',
})
export class AdminPeliculasComponent implements OnInit {
  private readonly peliculasService = inject(PeliculasService);
  private readonly fb = inject(FormBuilder);

  protected readonly lista = signal<Pelicula[]>([]);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly editandoId = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    sinopsis: [''],
    imagen_url: [''],
    duracion_minutos: [120, [Validators.required, Validators.min(1)]],
    clasificacion_edad: ['' as string], // '' = ATP
    fecha_estreno: ['', Validators.required],
    activa: [true],
  });

  async ngOnInit(): Promise<void> {
    await this.recargar();
  }

  protected editar(p: Pelicula): void {
    this.editandoId.set(p.id);
    this.form.patchValue({
      nombre: p.nombre,
      sinopsis: p.sinopsis ?? '',
      imagen_url: p.imagen_url ?? '',
      duracion_minutos: p.duracion_minutos,
      clasificacion_edad: p.clasificacion_edad == null ? '' : String(p.clasificacion_edad),
      fecha_estreno: p.fecha_estreno?.slice(0, 10) ?? '',
      activa: p.activa,
    });
  }

  protected cancelarEdicion(): void {
    this.editandoId.set(null);
    this.form.reset({
      nombre: '',
      sinopsis: '',
      imagen_url: '',
      duracion_minutos: 120,
      clasificacion_edad: '',
      fecha_estreno: '',
      activa: true,
    });
  }

  protected async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.guardando.set(true);
    this.error.set(null);
    try {
      const clasif = v.clasificacion_edad === '' ? null : Number(v.clasificacion_edad);
      await this.peliculasService.guardarAdmin(this.editandoId(), {
        nombre: v.nombre.trim(),
        sinopsis: v.sinopsis.trim() || null,
        imagen_url: v.imagen_url.trim() || null,
        duracion_minutos: v.duracion_minutos,
        clasificacion_edad: clasif,
        fecha_estreno: v.fecha_estreno,
        activa: v.activa,
      });
      this.cancelarEdicion();
      await this.recargar();
    } catch (e) {
      this.error.set((e as { message?: string })?.message ?? 'No se pudo guardar la película.');
    } finally {
      this.guardando.set(false);
    }
  }

  private async recargar(): Promise<void> {
    try {
      this.lista.set(await this.peliculasService.getTodasAdmin());
    } catch (e) {
      this.error.set((e as { message?: string })?.message ?? 'Error al listar películas.');
    } finally {
      this.cargando.set(false);
    }
  }
}
