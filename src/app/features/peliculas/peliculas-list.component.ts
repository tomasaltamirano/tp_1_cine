import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PeliculasService } from '../../core/services/peliculas.service';
import { Pelicula } from '../../core/models/pelicula.model';

@Component({
  selector: 'app-peliculas-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './peliculas-list.component.html',
  styleUrl: './peliculas-list.component.css',
})
export class PeliculasListComponent implements OnInit {
  private peliculasService = inject(PeliculasService);

  peliculas = signal<Pelicula[]>([]);
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);

  // Filas de la A a la T (20 filas requeridas en Mail 1)
  filas = [
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'I',
    'J',
    'K',
    'L',
    'M',
    'N',
    'O',
    'P',
    'Q',
    'R',
    'S',
    'T',
  ];
  // Array auxiliar de 20 números para las butacas del bloque central
  butacasCentro = Array.from({ length: 20 }, (_, i) => i + 1);

  peliculaSeleccionada = signal<Pelicula | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const data = await this.peliculasService.getPeliculas();
      this.peliculas.set(data);
    } catch (err: any) {
      this.error.set(err.message || 'Error al obtener películas');
    } finally {
      this.cargando.set(false);
    }
  }

  abrirModalSala(peli: Pelicula): void {
    this.peliculaSeleccionada.set(peli);
  }

  cerrarModalSala(): void {
    this.peliculaSeleccionada.set(null);
  }
}
