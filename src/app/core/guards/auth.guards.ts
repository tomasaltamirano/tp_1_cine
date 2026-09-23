import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Rol } from '../models/perfil.model';

/**
 * Exige cualquier sesión (registrado o anónimo).
 * Para el flujo de compra: el cine permite comprar sin cuenta.
 */
export const sesionGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.listo;

  return auth.usuario()
    ? true
    : router.createUrlTree(['/acceso'], { queryParams: { redirect: state.url } });
};

/** Exige una cuenta real (no anónima): perfil, mis películas, puntos, etc. */
export const registradoGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.listo;

  return auth.estaRegistrado()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { redirect: state.url } });
};

/** Para /login y /registro: si ya tenés cuenta, no tiene sentido mostrarlos. */
export const visitanteGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.listo;

  return auth.estaRegistrado() ? router.createUrlTree(['/peliculas']) : true;
};

/** Guard "fábrica": rolGuard('admin'), rolGuard('admin', 'empleado'), etc. */
export const rolGuard =
  (...rolesPermitidos: Rol[]): CanActivateFn =>
  async (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    await auth.listo;

    if (rolesPermitidos.includes(auth.rol())) return true;

    // Sin sesión real -> pantalla de ingreso de admin; con sesión pero sin permiso -> inicio.
    return auth.estaRegistrado()
      ? router.createUrlTree(['/peliculas'])
      : router.createUrlTree(['/admin/login'], { queryParams: { redirect: state.url } });
  };
