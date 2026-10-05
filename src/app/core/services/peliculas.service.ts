import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Genero, Pelicula, Resena } from '../models/pelicula.model';

export type DatosPelicula = {
  nombre: string;
  sinopsis: string | null;
  imagen_url: string | null;
  duracion_minutos: number;
  clasificacion_edad: number | null;
  fecha_estreno: string;
  activa: boolean;
};

/** Fila cruda del select con join de géneros. */
type PeliculaRow = Pelicula & {
  pelicula_generos?: { generos: { id: string; nombre: string } | null }[] | null;
};

@Injectable({ providedIn: 'root' })
export class PeliculasService {
  private supabase = inject(SupabaseService).client;

  /** Cartelera pública: activas + géneros. */
  async getPeliculas(): Promise<Pelicula[]> {
    const { data, error } = await this.supabase
      .from('peliculas')
      .select('*, pelicula_generos(generos(id, nombre))')
      .eq('activa', true)
      .order('ventas_historicas', { ascending: false });

    if (error) {
      console.error('Error al obtener películas:', error);
      throw error;
    }
    return ((data as PeliculaRow[]) || []).map((row) => this.mapPelicula(row));
  }

  /** Catálogo de géneros para los filtros de cartelera. */
  async getGeneros(): Promise<Genero[]> {
    const { data, error } = await this.supabase
      .from('generos')
      .select('id, nombre')
      .order('nombre');
    if (error) throw error;
    return (data as Genero[]) ?? [];
  }

  /** Admin: todas (activas e inactivas). */
  async getTodasAdmin(): Promise<Pelicula[]> {
    const { data, error } = await this.supabase
      .from('peliculas')
      .select('*, pelicula_generos(generos(id, nombre))')
      .order('nombre');
    if (error) throw error;
    return ((data as PeliculaRow[]) || []).map((row) => this.mapPelicula(row));
  }

  async getPelicula(id: string): Promise<Pelicula | null> {
    const { data, error } = await this.supabase
      .from('peliculas')
      .select('*, pelicula_generos(generos(id, nombre))')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapPelicula(data as PeliculaRow) : null;
  }

  async guardarAdmin(id: string | null, datos: DatosPelicula): Promise<string> {
    const { data, error } = await this.supabase.rpc('admin_upsert_pelicula', {
      p_id: id,
      p_nombre: datos.nombre,
      p_sinopsis: datos.sinopsis,
      p_imagen_url: datos.imagen_url,
      p_duracion_minutos: datos.duracion_minutos,
      p_clasificacion_edad: datos.clasificacion_edad,
      p_fecha_estreno: datos.fecha_estreno,
      p_activa: datos.activa,
    });
    if (error) throw error;
    return data as string;
  }

  async getResenas(peliculaId: string): Promise<Resena[]> {
    const { data, error } = await this.supabase
      .from('resenas')
      .select('*')
      .eq('pelicula_id', peliculaId)
      .order('creado_en', { ascending: false });
    if (error) throw error;
    return (data as Resena[]) ?? [];
  }

  async getPuntuacionPromedio(
    peliculaId: string,
  ): Promise<{ promedio: number; cantidad: number }> {
    const resenas = await this.getResenas(peliculaId);
    if (resenas.length === 0) return { promedio: 0, cantidad: 0 };
    const suma = resenas.reduce((s, r) => s + (r.estrellas ?? 0), 0);
    return {
      promedio: Math.round((suma / resenas.length) * 10) / 10,
      cantidad: resenas.length,
    };
  }

  async crearResena(
    peliculaId: string,
    estrellas: number,
    comentario: string | null,
    usuarioId: string | null,
  ): Promise<Resena> {
    const payload: Record<string, unknown> = {
      pelicula_id: peliculaId,
      estrellas: Math.min(5, Math.max(1, Math.round(estrellas))),
      comentario: comentario?.trim() || null,
    };
    if (usuarioId) payload['usuario_id'] = usuarioId;

    const { data, error } = await this.supabase
      .from('resenas')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as Resena;
  }

  private mapPelicula(row: PeliculaRow): Pelicula {
    const generos =
      row.pelicula_generos
        ?.map((pg) => pg.generos?.nombre)
        .filter((n): n is string => !!n) ?? [];
    const { pelicula_generos: _, ...rest } = row;
    return { ...rest, generos };
  }
}
