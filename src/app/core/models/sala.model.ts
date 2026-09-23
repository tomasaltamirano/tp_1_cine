export type TipoButaca = 'normal' | 'vip' | 'accesible';
export type EstadoButaca = 'libre' | 'ocupada' | 'seleccionada';

export interface Sala {
  id: string;
  nombre: string;
  /** Viene de select('*, butacas(count)') */
  butacas?: { count: number }[];
}

export interface Butaca {
  id: string;
  sala_id: string;
  fila: string; // 'A'..'T'
  columna: number; // número de butaca dentro de la fila (1..28, o 1..14 en filas accesibles)
  tipo: TipoButaca;
}

/**
 * La base guarda solo el número de butaca por fila; los 3 bloques (izquierda / centro / derecha)
 * se derivan del tipo: normal y VIP = 4 / 20 / 4, accesible = 2 / 10 / 2.
 */
const BLOQUES: Record<TipoButaca, [number, number, number]> = {
  normal: [4, 20, 4],
  vip: [4, 20, 4],
  accesible: [2, 10, 2],
};

/** 0 = izquierda, 1 = centro, 2 = derecha */
export function bloqueDe(b: Butaca): 0 | 1 | 2 {
  const [izq, centro] = BLOQUES[b.tipo];
  if (b.columna <= izq) return 0;
  return b.columna <= izq + centro ? 1 : 2;
}
