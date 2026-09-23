import { Pipe, PipeTransform } from '@angular/core';

/** 148 -> "2 h 28 min" | 120 -> "2 h" | 45 -> "45 min" */
@Pipe({ name: 'duracion', standalone: true })
export class DuracionPipe implements PipeTransform {
  transform(minutos: number | null | undefined): string {
    if (!minutos || minutos <= 0) return '—';
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    if (h === 0) return `${m} min`;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
  }
}
