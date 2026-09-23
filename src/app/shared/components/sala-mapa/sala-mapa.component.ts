import { Component, computed, input, output } from '@angular/core';
import { ButacaDirective } from '../../directives/butaca.directive';
import { Butaca, EstadoButaca, bloqueDe } from '../../../core/models/sala.model';

interface FilaMapa {
  fila: string;
  columnas: Butaca[][]; // [izquierda, centro, derecha]
}

/**
 * Mapa de butacas reutilizable. Hoy se usa en modo solo lectura (admin);
 * en la pantalla de compra va en la columna central, con ocupadas/seleccionadas.
 */
@Component({
  selector: 'app-sala-mapa',
  standalone: true,
  imports: [ButacaDirective],
  templateUrl: './sala-mapa.component.html',
  styleUrl: './sala-mapa.component.css',
})
export class SalaMapaComponent {
  readonly butacas = input.required<Butaca[]>();
  readonly ocupadas = input<ReadonlySet<string>>(new Set());
  readonly seleccionadas = input<ReadonlySet<string>>(new Set());
  readonly soloLectura = input(false);

  readonly alternar = output<Butaca>();

  protected readonly filas = computed<FilaMapa[]>(() => {
    const porFila = new Map<string, Butaca[]>();
    for (const b of this.butacas()) {
      const lista = porFila.get(b.fila) ?? [];
      lista.push(b);
      porFila.set(b.fila, lista);
    }
    return [...porFila.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fila, lista]) => ({
        fila,
        columnas: [0, 1, 2].map((bloque) =>
          lista.filter((b) => bloqueDe(b) === bloque).sort((x, y) => x.columna - y.columna),
        ),
      }));
  });

  protected estadoDe(b: Butaca): EstadoButaca {
    if (this.ocupadas().has(b.id)) return 'ocupada';
    if (this.seleccionadas().has(b.id)) return 'seleccionada';
    return 'libre';
  }
}
