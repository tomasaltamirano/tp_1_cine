import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Funcion, FuncionDetalle } from '../models/funcion.model';

export interface CambioButaca {
  tipo: 'ocupada' | 'liberada';
  butacaId: string;
}

@Injectable({ providedIn: 'root' })
export class FuncionesService {
  private readonly supabase = inject(SupabaseService).client;

  async getFuncion(id: string): Promise<FuncionDetalle | null> {
    const { data, error } = await this.supabase
      .from('funciones')
      .select('*, peliculas(*), salas(nombre)')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as FuncionDetalle | null;
  }

  /** Funciones futuras de una película, para el selector de horarios. */
  async getFuncionesDePelicula(peliculaId: string): Promise<Funcion[]> {
    const { data, error } = await this.supabase
      .from('funciones')
      .select('*')
      .eq('pelicula_id', peliculaId)
      .gte('fecha_hora_inicio', new Date().toISOString())
      .order('fecha_hora_inicio');

    if (error) throw error;
    return (data as Funcion[]) ?? [];
  }

  async getButacasOcupadas(funcionId: string): Promise<Set<string>> {
    const { data, error } = await this.supabase
      .from('butacas_ocupadas')
      .select('butaca_id')
      .eq('funcion_id', funcionId);

    if (error) throw error;
    return new Set((data ?? []).map((fila) => fila.butaca_id as string));
  }

  /**
   * Tiempo real: avisa cada vez que una butaca de esta función se ocupa o se libera.
   * alConectar se ejecuta cuando el canal queda listo (y en cada reconexión), para volver a
   * pedir el estado completo y no perder cambios ocurridos mientras estaba desconectado.
   * Devuelve la función para cancelar la suscripción.
   */
  suscribirOcupadas(
    funcionId: string,
    alCambiar: (cambio: CambioButaca) => void,
    alConectar: () => void,
  ): () => void {
    const canal = this.supabase
      .channel(`butacas-ocupadas-${funcionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'butacas_ocupadas',
          filter: `funcion_id=eq.${funcionId}`,
        },
        (payload) => alCambiar({ tipo: 'ocupada', butacaId: payload.new['butaca_id'] }),
      )
      // Supabase no permite filtrar eventos DELETE, así que se filtra acá.
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'butacas_ocupadas' },
        (payload) => {
          if (payload.old['funcion_id'] === funcionId) {
            alCambiar({ tipo: 'liberada', butacaId: payload.old['butaca_id'] });
          }
        },
      )
      .subscribe((estado) => {
        if (estado === 'SUBSCRIBED') alConectar();
      });

    return () => {
      void this.supabase.removeChannel(canal);
    };
  }
}
