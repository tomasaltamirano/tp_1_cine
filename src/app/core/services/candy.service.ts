import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ProductoCandy } from '../models/candy.model';

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
}
