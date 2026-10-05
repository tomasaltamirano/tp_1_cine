import { Routes } from '@angular/router';
import { registradoGuard, rolGuard, sesionGuard, visitanteGuard } from './core/guards/auth.guards';

export const routes: Routes = [
  { path: '', redirectTo: 'peliculas', pathMatch: 'full' },
  {
    path: 'peliculas',
    loadComponent: () =>
      import('./features/peliculas/peliculas-list.component').then((m) => m.PeliculasListComponent),
  },
  {
    path: 'peliculas/:id',
    loadComponent: () =>
      import('./features/peliculas/pelicula-detalle.component').then(
        (m) => m.PeliculaDetalleComponent,
      ),
  },

  // --- Resumen de la función: público, no exige cuenta ---
  {
    path: 'funcion/:id',
    loadComponent: () =>
      import('./features/compra/resumen-funcion.component').then(
        (m) => m.ResumenFuncionComponent,
      ),
  },
  // --- Butacas: recién acá se exige sesión (registrado o invitado) ---
  {
    path: 'funcion/:id/butacas',
    canActivate: [sesionGuard],
    loadComponent: () =>
      import('./features/compra/seleccion-butacas.component').then(
        (m) => m.SeleccionButacasComponent,
      ),
  },
  // --- Pago simulado + QR ---
  {
    path: 'funcion/:id/pago',
    canActivate: [sesionGuard],
    loadComponent: () =>
      import('./features/compra/pago.component').then((m) => m.PagoComponent),
  },
  {
    path: 'funcion/:id/confirmacion',
    canActivate: [sesionGuard],
    loadComponent: () =>
      import('./features/compra/confirmacion.component').then((m) => m.ConfirmacionComponent),
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
    loadComponent: () =>
      import('./features/admin/admin-shell.component').then((m) => m.AdminShellComponent),
    children: [
      { path: '', redirectTo: 'salas', pathMatch: 'full' },
      {
        path: 'salas',
        loadComponent: () =>
          import('./features/admin/salas/admin-salas.component').then(
            (m) => m.AdminSalasComponent,
          ),
      },
      {
        path: 'funciones',
        loadComponent: () =>
          import('./features/admin/funciones/admin-funciones.component').then(
            (m) => m.AdminFuncionesComponent,
          ),
      },
      {
        path: 'peliculas',
        loadComponent: () =>
          import('./features/admin/peliculas/admin-peliculas.component').then(
            (m) => m.AdminPeliculasComponent,
          ),
      },
      {
        path: 'candy',
        loadComponent: () =>
          import('./features/admin/candy/admin-candy.component').then(
            (m) => m.AdminCandyComponent,
          ),
      },
    ],
  },

  { path: '**', redirectTo: 'peliculas' },
];
