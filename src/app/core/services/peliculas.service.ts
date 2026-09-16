import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Pelicula } from '../models/pelicula.model';

@Injectable({
  providedIn: 'root',
})
export class PeliculasService {
  private supabase = inject(SupabaseService).client;

  async getPeliculas(): Promise<Pelicula[]> {
    const { data, error } = await this.supabase
      .from('peliculas')
      .select('*')
      .eq('activa', true)
      .order('ventas_historicas', { ascending: false });

    if (error) {
      console.error('Error al obtener películas:', error);
      throw error;
    }

    return data || [];
  }
}
