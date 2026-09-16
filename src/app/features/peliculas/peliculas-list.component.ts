import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <-- 1. Importación necesaria para [(ngModel)]
import { PeliculasService } from '../../core/services/peliculas.service';
import { Pelicula } from '../../core/models/pelicula.model';

@Component({
  selector: 'app-peliculas-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './peliculas-list.component.html',
  styleUrl: './peliculas-list.component.css',
})
export class PeliculasListComponent implements OnInit {
  private peliculasService = inject(PeliculasService);

  peliculas = signal<Pelicula[]>([]);
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);

  peliculaParaHorario = signal<Pelicula | null>(null);

  // Datos para la UI
  fechasDisponibles = ['Hoy, 16 Sep', 'Jue 17', 'Vie 18', 'Sáb 19', 'Dom 20'];
  fechaSeleccionada = signal<string>('Hoy, 16 Sep');

  formatosDisponibles = ['2D Español', '3D Español', '2D Subtitulado'];
  formatoSeleccionado = signal<string>('2D Español');

  horariosDisponibles = ['18:30', '21:45', '23:15'];
  sedeActual = 'Temperley - Av. H. Yrigoyen 1234';

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
  butacasCentro = Array.from({ length: 20 }, (_, i) => i + 1);
  peliculaSeleccionada = signal<Pelicula | null>(null);

  terminoBusqueda = signal<string>('');
  generosActivos = signal<string[]>([]);
  mostrarCategorias = signal<boolean>(false);

  listaGeneros = ['Acción', 'Comedia', 'Terror', 'Ciencia Ficción', 'Animación', 'Drama'];

  toggleCategorias(): void {
    this.mostrarCategorias.update((v) => !v);
  }

  peliculasFiltradas = computed(() => {
    let filtradas = this.peliculas();
    const texto = this.terminoBusqueda().toLowerCase();

    if (texto) {
      filtradas = filtradas.filter((p) => p.nombre.toLowerCase().includes(texto));
    }

    return filtradas;
  });

  // Top 3 y Grilla basadas en las filtradas
  peliculasDestacadas = computed(() => this.peliculasFiltradas().slice(0, 3));
  peliculasGrilla = computed(() => this.peliculasFiltradas().slice(3));

  // --- MÉTODOS
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

  toggleGenero(genero: string): void {
    const actuales = this.generosActivos();
    if (actuales.includes(genero)) {
      this.generosActivos.set(actuales.filter((g) => g !== genero));
    } else {
      this.generosActivos.set([...actuales, genero]);
    }
  }

  // Métodos del modal de horarios
  abrirModalHorarios(peli: Pelicula, event: Event): void {
    event.stopPropagation();
    this.peliculaParaHorario.set(peli);
  }

  cerrarModalHorarios(): void {
    this.peliculaParaHorario.set(null);
  }

  seleccionarFecha(fecha: string): void {
    this.fechaSeleccionada.set(fecha);
  }

  seleccionarFormato(formato: string): void {
    this.formatoSeleccionado.set(formato);
  }

  continuarACompra(): void {
    console.log(
      'Continuar con:',
      this.peliculaParaHorario()?.nombre,
      this.fechaSeleccionada(),
      this.formatoSeleccionado(),
    );
  }
}
