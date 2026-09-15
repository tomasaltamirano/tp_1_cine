export interface Pelicula {
  id: string;
  nombre: string;
  sinopsis?: string;
  imagen_url?: string;
  duracion_minutos: number;
  clasificacion_edad: number | null; // null = ATP, 13, 18
  fecha_estreno: string;
  activa: boolean;
  creado_en?: string;
}

export interface Genero {
  id: string;
  nombre: string;
}
