import { Funcion } from '../models/funcion.model';
import { TipoButaca } from '../models/sala.model';

/** Si la función no define precio_vip, la butaca VIP cuesta la entrada x 1.5. */
export const RECARGO_VIP_POR_DEFECTO = 1.5;

/** Precio vigente de una entrada: el de preventa mientras no haya vencido, si no el base. */
export function precioEntrada(f: Funcion, ahora = new Date()): number {
  const enPreventa =
    f.es_preventa &&
    f.precio_preventa != null &&
    (!f.fecha_fin_preventa || ahora < new Date(f.fecha_fin_preventa));
  return enPreventa ? (f.precio_preventa as number) : f.precio_base;
}

/** Normal y accesible cuestan lo mismo; la VIP tiene precio propio. */
export function precioButaca(f: Funcion, tipo: TipoButaca, ahora = new Date()): number {
  const base = precioEntrada(f, ahora);
  return tipo === 'vip' ? (f.precio_vip ?? Math.round(base * RECARGO_VIP_POR_DEFECTO)) : base;
}
