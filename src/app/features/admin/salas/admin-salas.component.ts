import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SalasService } from '../../../core/services/salas.service';
import { Butaca, Sala } from '../../../core/models/sala.model';
import { SalaMapaComponent } from '../../../shared/components/sala-mapa/sala-mapa.component';
import { AdminNavComponent } from '../shared/admin-nav.component';

@Component({
  selector: 'app-admin-salas',
  standalone: true,
  imports: [ReactiveFormsModule, SalaMapaComponent, AdminNavComponent],
  templateUrl: './admin-salas.component.html',
  styleUrl: './admin-salas.component.css',
})
export class AdminSalasComponent implements OnInit {
  private readonly salasService = inject(SalasService);
  private readonly fb = inject(FormBuilder);

  protected readonly salas = signal<Sala[]>([]);
  protected readonly cargando = signal(true);
  protected readonly creando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly salaAbierta = signal<Sala | null>(null);
  protected readonly butacas = signal<Butaca[]>([]);
  protected readonly cargandoMapa = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(40)]],
  });

  async ngOnInit(): Promise<void> {
    await this.recargar();
  }

  protected cantidadButacas(sala: Sala): number {
    return sala.butacas?.[0]?.count ?? 0;
  }

  protected async crear(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.creando.set(true);
    this.error.set(null);
    try {
      await this.salasService.crearSala(this.form.controls.nombre.value.trim());
      this.form.reset();
      await this.recargar();
    } catch (e) {
      this.error.set(this.mensaje(e));
    } finally {
      this.creando.set(false);
    }
  }

  protected async verMapa(sala: Sala): Promise<void> {
    if (this.salaAbierta()?.id === sala.id) {
      this.salaAbierta.set(null);
      return;
    }
    this.salaAbierta.set(sala);
    this.cargandoMapa.set(true);
    try {
      this.butacas.set(await this.salasService.getButacas(sala.id));
    } catch (e) {
      this.error.set(this.mensaje(e));
    } finally {
      this.cargandoMapa.set(false);
    }
  }

  private async recargar(): Promise<void> {
    try {
      this.salas.set(await this.salasService.getSalas());
    } catch (e) {
      this.error.set(this.mensaje(e));
    } finally {
      this.cargando.set(false);
    }
  }

  private mensaje(e: unknown): string {
    const msg = (e as { message?: string })?.message ?? 'Ocurrió un error inesperado.';
    return msg.includes('duplicate key') ? 'Ya existe una sala con ese nombre.' : msg;
  }
}
