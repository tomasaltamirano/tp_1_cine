import { FuncionDetalle } from './funcion.model';
import { Butaca } from './sala.model';
import { ProductoCandy } from './candy.model';

/** Ítem de entrada en el carrito / compra. */
export interface LineaEntrada {
  butaca: Butaca;
  precio: number;
}

/** Ítem de candy en el carrito / compra. */
export interface LineaCandy {
  producto: ProductoCandy;
  cantidad: number;
  subtotal: number;
}

/** Estado del carrito que viaja de butacas → pago → confirmación. */
export interface CarritoCompra {
  funcionId: string;
  funcion: FuncionDetalle;
  lineasEntrada: LineaEntrada[];
  lineasCandy: LineaCandy[];
  subtotalEntradas: number;
  subtotalCandy: number;
  /** Descuento por edad ≥ 50 (porcentaje 0–1). */
  descuentoMayor: number;
  /** Monto del cupón de bienvenida aplicado (si corresponde). */
  descuentoCupon: number;
  /** Crédito de cuenta aplicado. */
  creditoUsado: number;
  total: number;
  puntosGanados: number;
}

/** Compra persistida (tabla compras + detalle). */
export interface Compra {
  id: string;
  codigo_qr: string;
  usuario_id: string | null;
  funcion_id: string;
  total: number;
  puntos_otorgados: number;
  estado: 'activa' | 'usada' | 'cancelada';
  creado_en: string;
}

export interface CompraDetalle {
  compra: Compra;
  carrito: CarritoCompra;
  /** Código legible corto para ingreso manual por empleados. */
  codigoManual: string;
}
