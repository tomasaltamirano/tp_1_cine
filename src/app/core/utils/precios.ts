import { Funcion } from '../models/funcion.model';
import { TipoButaca } from '../models/sala.model';

/** Si la función no define precio_vip, la butaca VIP cuesta la entrada x 1.5. */
export const RECARGO_VIP_POR_DEFECTO = 1.5;

/** True si la función está en ventana de preventa vigente. */
export function estaEnPreventa(f: Funcion, ahora = new Date()): boolean {
  return (
    !!f.es_preventa &&
    f.precio_preventa != null &&
    (!f.fecha_fin_preventa || ahora < new Date(f.fecha_fin_preventa))
  );
}

/** Precio vigente de una entrada: preventa si aplica, si no el base. */
export function precioEntrada(f: Funcion, ahora = new Date()): number {
  return estaEnPreventa(f, ahora) ? (f.precio_preventa as number) : f.precio_base;
}

/** Normal y accesible cuestan lo mismo; la VIP tiene precio propio. */
export function precioButaca(f: Funcion, tipo: TipoButaca, ahora = new Date()): number {
  const base = precioEntrada(f, ahora);
  return tipo === 'vip' ? (f.precio_vip ?? Math.round(base * RECARGO_VIP_POR_DEFECTO)) : base;
}

/** Estreno en el futuro (solo fecha calendario YYYY-MM-DD). */
export function esProximamente(fechaEstreno: string | null | undefined, hoy = new Date()): boolean {
  if (!fechaEstreno) return false;
  const estreno = fechaEstreno.slice(0, 10);
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, '0');
  const d = String(hoy.getDate()).padStart(2, '0');
  const hoyStr = `${y}-${m}-${d}`;
  return estreno > hoyStr;
}
