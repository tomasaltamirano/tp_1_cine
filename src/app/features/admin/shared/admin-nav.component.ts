import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-admin-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="admin-nav">
      <a routerLink="/admin/salas" routerLinkActive="activo">Salas</a>
      <a routerLink="/admin/funciones" routerLinkActive="activo">Funciones</a>
      <a routerLink="/admin/peliculas" routerLinkActive="activo">Películas</a>
      <a routerLink="/admin/candy" routerLinkActive="activo">Candy</a>
    </nav>
  `,
  styles: [
    `
      .admin-nav {
        display: flex;
        flex-wrap: wrap;
        gap: 1.25rem;
        max-width: 1100px;
        margin: 1.5rem auto 0;
        padding: 0 1rem;
      }
      .admin-nav a {
        padding-bottom: 0.5rem;
        font-size: 0.85rem;
        font-weight: 600;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        text-decoration: none;
        color: var(--text-secondary);
        border-bottom: 2px solid transparent;
      }
      .admin-nav a.activo {
        color: var(--text-primary);
        border-bottom-color: var(--acento-cyan);
      }
    `,
  ],
})
export class AdminNavComponent {}
