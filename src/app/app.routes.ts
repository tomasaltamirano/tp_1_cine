import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'peliculas',
    pathMatch: 'full',
  },
  {
    path: 'peliculas',
    loadComponent: () =>
      import('./features/peliculas/peliculas-list.component').then((m) => m.PeliculasListComponent),
  },
  {
    path: '**',
    redirectTo: 'peliculas',
  },
];
