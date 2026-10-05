import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { CandyService } from '../../../core/services/candy.service';
import { ProductoCandy } from '../../../core/models/candy.model';

const CATEGORIAS = ['Pochoclos', 'Bebidas', 'Snacks', 'Combos', 'Otros'];

@Component({
  selector: 'app-admin-candy',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe],
  templateUrl: './admin-candy.component.html',
  styleUrl: './admin-candy.component.css',
})
export class AdminCandyComponent implements OnInit {
  private readonly candyService = inject(CandyService);
  private readonly fb = inject(FormBuilder);

  protected readonly categorias = CATEGORIAS;
  protected readonly lista = signal<ProductoCandy[]>([]);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly editandoId = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(80)]],
    categoria: ['Pochoclos', Validators.required],
    precio: [3000, [Validators.required, Validators.min(1)]],
    imagen_url: [''],
    activo: [true],
  });

  async ngOnInit(): Promise<void> {
    await this.recargar();
  }

  protected editar(p: ProductoCandy): void {
    this.editandoId.set(p.id);
    this.form.patchValue({
      nombre: p.nombre,
      categoria: p.categoria,
      precio: p.precio,
      imagen_url: p.imagen_url ?? '',
      activo: p.activo,
    });
  }

  protected cancelarEdicion(): void {
    this.editandoId.set(null);
    this.form.reset({
      nombre: '',
      categoria: 'Pochoclos',
      precio: 3000,
      imagen_url: '',
      activo: true,
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
      await this.candyService.guardarAdmin(this.editandoId(), {
        nombre: v.nombre.trim(),
        categoria: v.categoria,
        precio: v.precio,
        imagen_url: v.imagen_url.trim() || null,
        activo: v.activo,
      });
      this.cancelarEdicion();
      await this.recargar();
    } catch (e) {
      this.error.set((e as { message?: string })?.message ?? 'No se pudo guardar el producto.');
    } finally {
      this.guardando.set(false);
    }
  }

  private async recargar(): Promise<void> {
    try {
      this.lista.set(await this.candyService.getTodosAdmin());
    } catch (e) {
      this.error.set((e as { message?: string })?.message ?? 'Error al listar productos.');
    } finally {
      this.cargando.set(false);
    }
  }
}
