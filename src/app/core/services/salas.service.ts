import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Butaca, Sala } from '../models/sala.model';

@Injectable({ providedIn: 'root' })
export class SalasService {
  private readonly supabase = inject(SupabaseService).client;

  async getSalas(): Promise<Sala[]> {
    const { data, error } = await this.supabase
      .from('salas')
      .select('*, butacas(count)')
      .order('nombre');

    if (error) throw error;
    return (data as Sala[]) ?? [];
  }

  async getButacas(salaId: string): Promise<Butaca[]> {
    const { data, error } = await this.supabase
      .from('butacas')
      .select('*')
      .eq('sala_id', salaId)
      .order('fila')
      .order('columna');

    if (error) throw error;
    return (data as Butaca[]) ?? [];
  }

  /**
   * Crea la sala y genera todas sus butacas de una sola vez en la base
   * (función crear_sala, solo ejecutable por admin). Devuelve el id de la sala.
   */
  async crearSala(nombre: string): Promise<string> {
    const { data, error } = await this.supabase.rpc('crear_sala', { p_nombre: nombre });
    if (error) throw error;
    return data as string;
  }
}
