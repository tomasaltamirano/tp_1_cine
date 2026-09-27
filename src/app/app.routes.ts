import { Routes } from '@angular/router';
import { registradoGuard, rolGuard, sesionGuard, visitanteGuard } from './core/guards/auth.guards';

export const routes: Routes = [
  { path: '', redirectTo: 'peliculas', pathMatch: 'full' },
  {
    path: 'peliculas',
    loadComponent: () =>
      import('./features/peliculas/peliculas-list.component').then((m) => m.PeliculasListComponent),
  },

  // --- Compra: exige sesión (registrado o invitado) ---
  {
    path: 'funcion/:id',
    canActivate: [sesionGuard],
    loadComponent: () =>
      import('./features/compra/seleccion-butacas.component').then(
        (m) => m.SeleccionButacasComponent,
      ),
  },

  // --- Acceso de clientes ---
  {
    path: 'acceso',
    loadComponent: () =>
      import('./features/auth/acceso.component').then((m) => m.AccesoComponent),
  },
  {
    path: 'login',
    canActivate: [visitanteGuard],
    data: { modo: 'cliente' },
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'registro',
    canActivate: [visitanteGuard],
    loadComponent: () =>
      import('./features/auth/registro.component').then((m) => m.RegistroComponent),
  },
  {
    path: 'perfil',
    canActivate: [registradoGuard],
    loadComponent: () =>
      import('./features/perfil/perfil.component').then((m) => m.PerfilComponent),
  },

  // --- Administración ---
  {
    path: 'admin/login',
    data: { modo: 'admin' },
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'admin',
    canActivate: [rolGuard('admin')],
    children: [
      { path: '', redirectTo: 'salas', pathMatch: 'full' },
      {
        path: 'salas',
        loadComponent: () =>
          import('./features/admin/salas/admin-salas.component').then(
            (m) => m.AdminSalasComponent,
          ),
      },
    ],
  },

  { path: '**', redirectTo: 'peliculas' },
];
