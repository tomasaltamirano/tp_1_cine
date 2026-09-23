import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { COLORES_OJOS, TIPOS_SANGRE } from '../../core/models/perfil.model';
import { destinoSeguro } from './redireccion';

/** La fecha de nacimiento no puede ser futura ni anterior a 1900. */
const fechaNacimientoValida: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const valor = control.value as string;
  if (!valor) return null;
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return { fechaInvalida: true };
  if (fecha > new Date() || fecha.getFullYear() < 1900) return { fechaInvalida: true };
  return null;
};

const passwordsIguales: ValidatorFn = (grupo: AbstractControl): ValidationErrors | null => {
  const a = grupo.get('password')?.value;
  const b = grupo.get('confirmar')?.value;
  return a && b && a !== b ? { noCoinciden: true } : null;
};

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './registro.component.html',
  styleUrl: './auth.css',
})
export class RegistroComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly tiposSangre = TIPOS_SANGRE;
  protected readonly coloresOjos = COLORES_OJOS;
  protected readonly hoy = new Date().toISOString().split('T')[0];
  protected readonly redirect = this.route.snapshot.queryParamMap.get('redirect');

  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly confirmarEmail = signal(false);

  protected readonly form = this.fb.nonNullable.group(
    {
      nombre: ['', [Validators.required, Validators.maxLength(60)]],
      apellido: ['', [Validators.required, Validators.maxLength(60)]],
      email: ['', [Validators.required, Validators.email]],
      fecha_nacimiento: ['', [Validators.required, fechaNacimientoValida]],
      tipo_sangre: ['', Validators.required],
      color_ojos: ['', Validators.required],
      dias_vacaciones: [14, [Validators.required, Validators.min(0), Validators.max(365)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmar: ['', Validators.required],
    },
    { validators: passwordsIguales },
  );

  protected invalido(nombre: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[nombre];
    return c.touched && c.invalid;
  }

  protected async registrar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.error.set(null);
    try {
      const { confirmar: _confirmar, ...datos } = this.form.getRawValue();
      const { requiereConfirmacion } = await this.auth.registrar(datos);

      if (requiereConfirmacion) {
        this.confirmarEmail.set(true);
      } else {
        await this.router.navigateByUrl(destinoSeguro(this.redirect));
      }
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.cargando.set(false);
    }
  }
}
