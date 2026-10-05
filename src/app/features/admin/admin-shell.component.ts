import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AdminNavComponent } from './shared/admin-nav.component';

/**
 * Contenedor del panel admin: nav + outlet para salas/funciones/películas/candy.
 * Evita que una ruta hija sin host termine en el wildcard → /peliculas.
 */
@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterOutlet, AdminNavComponent],
  template: `
    <app-admin-nav />
    <router-outlet />
  `,
})
export class AdminShellComponent {}
