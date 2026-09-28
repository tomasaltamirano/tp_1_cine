import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CompraService } from '../../core/services/compra.service';
import { CompraDetalle } from '../../core/models/compra.model';
import { DuracionPipe } from '../../shared/pipes/duracion.pipe';

@Component({
  selector: 'app-confirmacion',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe, DuracionPipe],
  templateUrl: './confirmacion.component.html',
  styleUrl: './confirmacion.component.css',
})
export class ConfirmacionComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly compraService = inject(CompraService);

  protected readonly detalle = signal<CompraDetalle | null>(null);

  protected readonly qrUrl = computed(() => {
    const d = this.detalle();
    if (!d) return '';
    // QR generado vía API pública (contenido = código de la compra)
    const data = encodeURIComponent(d.compra.codigo_qr);
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${data}`;
  });

  protected readonly pelicula = computed(() => this.detalle()?.carrito.funcion.peliculas ?? null);
  protected readonly funcion = computed(() => this.detalle()?.carrito.funcion ?? null);

  ngOnInit(): void {
    const state = history.state as { detalle?: CompraDetalle } | null;
    const desdeState = state?.detalle ?? this.compraService.getUltima();
    if (desdeState) {
      this.detalle.set(desdeState);
      return;
    }
    void this.router.navigateByUrl('/peliculas');
  }

  protected irCartelera(): void {
    void this.router.navigateByUrl('/peliculas');
  }
}
