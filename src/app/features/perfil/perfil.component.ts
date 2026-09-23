import { Component, inject } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, DecimalPipe],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css',
})
export class PerfilComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected async salir(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/peliculas');
  }
}
