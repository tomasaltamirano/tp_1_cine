/** Validación y formato de tarjeta de crédito ficticia (solo simulación). */

export interface DatosTarjeta {
  titular: string;
  numero: string;
  vencimiento: string; // MM/AA
  cvv: string;
}

/** Algoritmo de Luhn: verifica dígito de control del número de tarjeta. */
export function validarLuhn(numero: string): boolean {
  const digits = numero.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/** Formatea número con espacios cada 4 dígitos (máx 19). */
export function formatearNumeroTarjeta(valor: string): string {
  const digits = valor.replace(/\D/g, '').slice(0, 19);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

/** Formatea vencimiento MM/AA. */
export function formatearVencimiento(valor: string): string {
  const digits = valor.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

/** Verifica que MM/AA sea un mes válido y no esté vencida. */
export function validarVencimiento(mmAa: string): boolean {
  const m = mmAa.match(/^(\d{2})\/(\d{2})$/);
  if (!m) return false;
  const mes = parseInt(m[1], 10);
  const anio = 2000 + parseInt(m[2], 10);
  if (mes < 1 || mes > 12) return false;
  const ahora = new Date();
  const finMes = new Date(anio, mes, 0, 23, 59, 59);
  return finMes >= ahora;
}

export function validarCvv(cvv: string): boolean {
  return /^\d{3,4}$/.test(cvv);
}

export function validarTitular(nombre: string): boolean {
  return nombre.trim().length >= 3 && /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.]+$/.test(nombre.trim());
}

/** Devuelve mensaje de error o null si todo es válido. */
export function validarTarjeta(datos: DatosTarjeta): string | null {
  if (!validarTitular(datos.titular)) {
    return 'Ingresá el nombre del titular (solo letras).';
  }
  const num = datos.numero.replace(/\s/g, '');
  if (num.length < 13) {
    return 'El número de tarjeta es incompleto.';
  }
  if (!validarLuhn(num)) {
    return 'Número de tarjeta inválido. Probá con 4242 4242 4242 4242.';
  }
  if (!validarVencimiento(datos.vencimiento)) {
    return 'Vencimiento inválido o tarjeta vencida (formato MM/AA).';
  }
  if (!validarCvv(datos.cvv)) {
    return 'CVV inválido (3 o 4 dígitos).';
  }
  return null;
}

/** Números de prueba comunes (siempre pasan Luhn). */
export const TARJETAS_PRUEBA = [
  '4242424242424242', // Visa
  '5555555555554444', // Mastercard
  '378282246310005', // Amex
];
