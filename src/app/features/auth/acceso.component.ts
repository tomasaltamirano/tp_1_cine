import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { destinoSeguro } from './redireccion';

/** Pantalla previa a la compra: ingresar, crear cuenta o seguir como invitado. */
@Component({
  selector: 'app-acceso',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './acceso.component.html',
  styleUrl: './auth.css',
})
export class AccesoComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly redirect = this.route.snapshot.queryParamMap.get('redirect');

  protected async continuarComoInvitado(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      await this.auth.loginAnonimo();
      await this.router.navigateByUrl(destinoSeguro(this.redirect));
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.cargando.set(false);
    }
  }
}
