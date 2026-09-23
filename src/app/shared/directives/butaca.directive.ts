import { Directive, computed, input } from '@angular/core';
import { EstadoButaca, TipoButaca } from '../../core/models/sala.model';

/**
 * Directiva de atributo para una butaca: aplica clases por tipo/estado y atributos de accesibilidad.
 * Uso: <button [appButaca]="butaca.tipo" [estado]="'libre'" rotulo="A12">12</button>
 * Los colores salen de las variables --asiento-* de styles.css.
 */
@Directive({
  selector: '[appButaca]',
  standalone: true,
  host: {
    class: 'butaca',
    '[class.tipo-vip]': "tipo() === 'vip'",
    '[class.tipo-accesible]': "tipo() === 'accesible'",
    '[class.estado-ocupada]': "estado() === 'ocupada'",
    '[class.estado-seleccionada]': "estado() === 'seleccionada'",
    '[attr.aria-pressed]': "estado() === 'seleccionada'",
    '[attr.aria-label]': 'etiqueta()',
  },
})
export class ButacaDirective {
  readonly tipo = input<TipoButaca>('normal', { alias: 'appButaca' });
  readonly estado = input<EstadoButaca>('libre');
  /** Identificador legible, ej. "A12" (para lectores de pantalla). */
  readonly rotulo = input('');

  protected readonly etiqueta = computed(() => {
    const tipo = this.tipo() === 'normal' ? '' : ` ${this.tipo()}`;
    return `Butaca ${this.rotulo()}${tipo}, ${this.estado()}`.replace('  ', ' ');
  });
}
