import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe, UpperCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

import { CompraService } from '../../core/services/compra.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, DecimalPipe, UpperCasePipe],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css',
})
export class PerfilComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly compraService = inject(CompraService); // Inyectamos el servicio

  comprasHistorial = signal<any[]>([]);
  cargandoCancelacion = signal(false);

  async ngOnInit() {
    const user = this.auth.usuario();
    if (user) {
      // Cargar compras del usuario
      const compras = await this.compraService.getHistorialCompras(user.id);
      this.comprasHistorial.set(compras);
    }
  }

  // Comprueba si faltan más de 2 horas
  puedeCancelar(fechaInicio: string, estado: string): boolean {
    if (estado === 'cancelada') return false;

    const inicioFuncion = new Date(fechaInicio).getTime();
    const ahora = new Date().getTime();
    const dosHorasEnMs = 2 * 60 * 60 * 1000;

    return inicioFuncion - ahora > dosHorasEnMs;
  }

  async cancelar(compraId: string) {
    if (!confirm('¿Estás seguro de cancelar esta compra? El dinero irá a tu saldo a favor.'))
      return;

    this.cargandoCancelacion.set(true);
    try {
      await this.compraService.cancelarCompra(compraId);
      // Recargar datos para ver el nuevo saldo y el cambio de estado
      const user = this.auth.usuario();
      if (user) {
        this.comprasHistorial.set(await this.compraService.getHistorialCompras(user.id));
        // Aquí deberías también actualizar el perfil del AuthService para que refresque el saldo en la vista superior.
      }
      alert('Compra cancelada con éxito. Revisa tu crédito disponible.');
    } catch (error: any) {
      alert('Error al cancelar: ' + error.message);
    } finally {
      this.cargandoCancelacion.set(false);
    }
  }

  protected async salir(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/peliculas');
  }
}
