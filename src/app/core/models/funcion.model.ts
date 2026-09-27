import { Pelicula } from './pelicula.model';

export type Formato = '2D' | '3D' | '4D' | '5D';
export type Idioma = 'castellano' | 'subtitulada';

export interface Funcion {
  id: string;
  pelicula_id: string;
  sala_id: string;
  fecha_hora_inicio: string; // ISO (timestamptz)
  fecha_hora_fin: string;
  formato: Formato;
  idioma: Idioma;
  precio_base: number;
  precio_vip: number | null;
  es_preventa: boolean;
  precio_preventa: number | null;
  fecha_fin_preventa: string | null;
}

/** Función con su película y su sala (select('*, peliculas(*), salas(nombre)')). */
export interface FuncionDetalle extends Funcion {
  peliculas: Pelicula;
  salas: { nombre: string };
}
