export function destinoSeguro(redirect: string | null, porDefecto = '/peliculas'): string {
  return redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : porDefecto;
}
