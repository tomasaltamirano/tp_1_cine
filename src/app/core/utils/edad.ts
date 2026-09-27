/** Edad en años cumplidos a una fecha. fechaNac en formato 'YYYY-MM-DD' (se lee a mano para evitar líos de zona horaria). */
export function calcularEdad(fechaNac: string, hoy = new Date()): number {
  const [anio, mes, dia] = fechaNac.split('-').map(Number);
  let edad = hoy.getFullYear() - anio;
  const yaCumplio =
    hoy.getMonth() + 1 > mes || (hoy.getMonth() + 1 === mes && hoy.getDate() >= dia);
  if (!yaCumplio) edad--;
  return edad;
}

/** ¿Es una fecha 'YYYY-MM-DD' real, no futura y no anterior a 1900? */
export function fechaNacimientoValida(valor: string, hoy = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [anio, mes, dia] = valor.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  const existe =
    fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
  return existe && anio >= 1900 && fecha <= hoy;
}
