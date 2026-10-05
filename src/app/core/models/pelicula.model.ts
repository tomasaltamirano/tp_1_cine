export interface Pelicula {
  id: string;
  nombre: string;
  sinopsis?: string;
  imagen_url?: string;
  duracion_minutos: number;
  clasificacion_edad: number | null; // null = ATP, 13, 18
  fecha_estreno: string;
  activa: boolean;
  ventas_historicas?: number;
  creado_en?: string;
}

export interface Genero {
  id: string;
  nombre: string;
}

/** Reseña de un usuario sobre una película (tabla resenas). */
export interface Resena {
  id: string;
  pelicula_id: string;
  usuario_id?: string | null;
  estrellas: number; // 1–5
  comentario: string | null;
  creado_en?: string;
}
