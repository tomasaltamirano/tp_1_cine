/** Solo se aceptan rutas internas (evita open redirect con ?redirect=https://sitio-malo.com). */
export function destinoSeguro(redirect: string | null, porDefecto = '/peliculas'): string {
  return redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : porDefecto;
}
