import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Funcion, FuncionDetalle } from '../models/funcion.model';

export interface CambioButaca {
  tipo: 'ocupada' | 'liberada';
  butacaId: string;
}

export interface DatosNuevaFuncion {
  pelicula_id: string;
  fecha_hora_inicio: string; // ISO
  formato: string;
  idioma: string;
  precio_base: number;
  precio_vip: number | null;
  es_preventa: boolean;
  precio_preventa: number | null;
  fecha_fin_preventa: string | null;
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

  /** Todas las funciones futuras, con su película y sala, para el panel de admin. */
  async getFuncionesFuturas(): Promise<FuncionDetalle[]> {
    const { data, error } = await this.supabase
      .from('funciones')
      .select('*, peliculas(*), salas(nombre)')
      .gte('fecha_hora_inicio', new Date().toISOString())
      .order('fecha_hora_inicio');

    if (error) throw error;
    return (data as FuncionDetalle[]) ?? [];
  }

  /**
   * Crea una función. La sala la asigna la base automáticamente: busca una libre
   * en ese horario (respetando el margen de 30 min entre funciones) y, si no hay
   * ninguna, rechaza la operación.
   */
  async crearFuncion(datos: DatosNuevaFuncion): Promise<Funcion> {
    const { data, error } = await this.supabase.rpc('crear_funcion', {
      p_pelicula_id: datos.pelicula_id,
      p_fecha_hora_inicio: datos.fecha_hora_inicio,
      p_formato: datos.formato,
      p_idioma: datos.idioma,
      p_precio_base: datos.precio_base,
      p_precio_vip: datos.precio_vip,
      p_es_preventa: datos.es_preventa,
      p_precio_preventa: datos.precio_preventa,
      p_fecha_fin_preventa: datos.fecha_fin_preventa,
    });
    if (error) throw error;
    return data as Funcion;
  }

  async eliminarFuncion(id: string): Promise<void> {
    const { error } = await this.supabase.rpc('eliminar_funcion', { p_funcion_id: id });
    if (error) throw error;
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
