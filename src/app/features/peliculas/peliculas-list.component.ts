import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <-- 1. Importación necesaria para [(ngModel)]
import { PeliculasService } from '../../core/services/peliculas.service';
import { Pelicula } from '../../core/models/pelicula.model';
import { Funcion } from '../../core/models/funcion.model';
import { FuncionesService } from '../../core/services/funciones.service';
import { DuracionPipe } from '../../shared/pipes/duracion.pipe';
import { ClasificacionPipe } from '../../shared/pipes/clasificacion.pipe';

@Component({
  selector: 'app-peliculas-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DuracionPipe, ClasificacionPipe],
  templateUrl: './peliculas-list.component.html',
  styleUrl: './peliculas-list.component.css',
})
export class PeliculasListComponent implements OnInit {
  private peliculasService = inject(PeliculasService);

  peliculas = signal<Pelicula[]>([]);
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);

  private funcionesService = inject(FuncionesService);
  private router = inject(Router);

  // --- Modal de horarios (datos reales de la tabla funciones) ---
  peliculaParaHorario = signal<Pelicula | null>(null);
  funcionesPelicula = signal<Funcion[]>([]);
  cargandoFunciones = signal<boolean>(false);
  fechaSeleccionada = signal<string | null>(null);
  formatoSeleccionado = signal<string | null>(null);

  sedeActual = 'Temperley - Av. H. Yrigoyen 1234';

  /** Fechas (una por día) en las que hay funciones. clave = 'YYYY-MM-DD' local. */
  fechasDisponibles = computed(() => {
    const vistas = new Map<string, string>();
    for (const f of this.funcionesPelicula()) {
      const clave = claveFecha(f.fecha_hora_inicio);
      if (!vistas.has(clave)) vistas.set(clave, etiquetaFecha(f.fecha_hora_inicio));
    }
    return [...vistas].map(([clave, etiqueta]) => ({ clave, etiqueta }));
  });

  fechaActiva = computed(() => {
    const lista = this.fechasDisponibles();
    return lista.find((x) => x.clave === this.fechaSeleccionada())?.clave ?? lista[0]?.clave ?? null;
  });

  private funcionesDelDia = computed(() =>
    this.funcionesPelicula().filter((f) => claveFecha(f.fecha_hora_inicio) === this.fechaActiva()),
  );

  /** Combinaciones formato + idioma disponibles ese día, ej. "3D · Subtitulada". */
  formatosDisponibles = computed(() => {
    const vistos = new Map<string, string>();
    for (const f of this.funcionesDelDia()) {
      const clave = `${f.formato}|${f.idioma}`;
      const idioma = f.idioma === 'castellano' ? 'Castellano' : 'Subtitulada';
      if (!vistos.has(clave)) vistos.set(clave, `${f.formato} · ${idioma}`);
    }
    return [...vistos].map(([clave, etiqueta]) => ({ clave, etiqueta }));
  });

  formatoActivo = computed(() => {
    const lista = this.formatosDisponibles();
    return lista.find((x) => x.clave === this.formatoSeleccionado())?.clave ?? lista[0]?.clave ?? null;
  });

  horariosDisponibles = computed(() =>
    this.funcionesDelDia()
      .filter((f) => `${f.formato}|${f.idioma}` === this.formatoActivo())
      .map((f) => ({ funcion: f, hora: horaLocal(f.fecha_hora_inicio) })),
  );

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

  toggleGenero(genero: string): void {
    const actuales = this.generosActivos();
    if (actuales.includes(genero)) {
      this.generosActivos.set(actuales.filter((g) => g !== genero));
    } else {
      this.generosActivos.set([...actuales, genero]);
    }
  }

  // Métodos del modal de horarios
  async abrirModalHorarios(peli: Pelicula, event: Event): Promise<void> {
    event.stopPropagation();
    this.peliculaParaHorario.set(peli);
    this.funcionesPelicula.set([]);
    this.fechaSeleccionada.set(null);
    this.formatoSeleccionado.set(null);
    this.cargandoFunciones.set(true);
    try {
      this.funcionesPelicula.set(await this.funcionesService.getFuncionesDePelicula(peli.id));
    } catch (err) {
      console.error('Error al obtener funciones:', err);
    } finally {
      this.cargandoFunciones.set(false);
    }
  }

  cerrarModalHorarios(): void {
    this.peliculaParaHorario.set(null);
  }

  seleccionarFecha(clave: string): void {
    this.fechaSeleccionada.set(clave);
    this.formatoSeleccionado.set(null);
  }

  seleccionarFormato(clave: string): void {
    this.formatoSeleccionado.set(clave);
  }

  irAButacas(funcion: Funcion): void {
    this.cerrarModalHorarios();
    void this.router.navigate(['/funcion', funcion.id]);
  }
}

// --- Helpers de fecha (hora local del navegador) ---
function claveFecha(iso: string): string {
  const d = new Date(iso);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function etiquetaFecha(iso: string): string {
  const hoy = claveFecha(new Date().toISOString());
  const manana = claveFecha(new Date(Date.now() + 86_400_000).toISOString());
  const clave = claveFecha(iso);
  if (clave === hoy) return 'Hoy';
  if (clave === manana) return 'Mañana';
  return new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
    .format(new Date(iso))
    .replace('.', '');
}

function horaLocal(iso: string): string {
  return new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(
    new Date(iso),
  );
}
