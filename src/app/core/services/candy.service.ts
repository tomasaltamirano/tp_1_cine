import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ProductoCandy } from '../models/candy.model';

export type DatosProductoCandy = {
  nombre: string;
  categoria: string;
  precio: number;
  imagen_url: string | null;
  activo: boolean;
};

@Injectable({ providedIn: 'root' })
export class CandyService {
  private readonly supabase = inject(SupabaseService).client;

  async getProductos(): Promise<ProductoCandy[]> {
    const { data, error } = await this.supabase
      .from('productos_candy')
      .select('*')
      .eq('activo', true)
      .order('categoria')
      .order('nombre');
    if (error) throw error;
    return (data as ProductoCandy[]) ?? [];
  }

  /** Admin: todos los productos, activos e inactivos. */
  async getTodosAdmin(): Promise<ProductoCandy[]> {
    const { data, error } = await this.supabase
      .from('productos_candy')
      .select('*')
      .order('categoria')
      .order('nombre');
    if (error) throw error;
    return (data as ProductoCandy[]) ?? [];
  }

  async guardarAdmin(id: string | null, datos: DatosProductoCandy): Promise<string> {
    const { data, error } = await this.supabase.rpc('admin_upsert_producto_candy', {
      p_id: id,
      p_nombre: datos.nombre,
      p_categoria: datos.categoria,
      p_precio: datos.precio,
      p_imagen_url: datos.imagen_url,
      p_activo: datos.activo,
    });
    if (error) throw error;
    return data as string;
  }
}
