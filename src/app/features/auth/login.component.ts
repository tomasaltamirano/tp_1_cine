import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { destinoSeguro } from './redireccion';

/**
 * Un solo componente para dos pantallas, según data.modo de la ruta:
 *  - 'cliente' -> /login
 *  - 'admin'   -> /admin/login (valida el rol después de autenticar)
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './auth.css',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly esAdmin = this.route.snapshot.data['modo'] === 'admin';
  protected readonly redirect = this.route.snapshot.queryParamMap.get('redirect');

  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected async ingresar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.error.set(null);
    try {
      const { email, password } = this.form.getRawValue();
      const perfil = await this.auth.login(email, password);

      if (this.esAdmin && perfil?.rol !== 'admin') {
        await this.auth.logout();
        this.error.set('Esta cuenta no tiene permisos de administrador.');
        return;
      }

      const porDefecto = this.esAdmin ? '/admin/salas' : '/peliculas';
      await this.router.navigateByUrl(destinoSeguro(this.redirect, porDefecto));
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.cargando.set(false);
    }
  }
}
