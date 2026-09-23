import { Pipe, PipeTransform } from '@angular/core';

/** null -> "ATP" | 13 -> "+13" | 18 -> "+18" */
@Pipe({ name: 'clasificacion', standalone: true })
export class ClasificacionPipe implements PipeTransform {
  transform(edad: number | null | undefined): string {
    return edad ? `+${edad}` : 'ATP';
  }
}
