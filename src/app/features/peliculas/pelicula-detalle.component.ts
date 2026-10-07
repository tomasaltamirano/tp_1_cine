import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PeliculasService } from '../../core/services/peliculas.service';
import { FuncionesService } from '../../core/services/funciones.service';
import { AuthService } from '../../core/services/auth.service';
import { Pelicula, Resena } from '../../core/models/pelicula.model';
import { Funcion } from '../../core/models/funcion.model';
import { DuracionPipe } from '../../shared/pipes/duracion.pipe';
import { ClasificacionPipe } from '../../shared/pipes/clasificacion.pipe';
import { estaEnPreventa, esProximamente, precioEntrada } from '../../core/utils/precios';

@Component({
  selector: 'app-pelicula-detalle',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    DuracionPipe,
    ClasificacionPipe,
  ],
  templateUrl: './pelicula-detalle.component.html',
  styleUrl: './pelicula-detalle.component.css',
})
export class PeliculaDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly peliculasService = inject(PeliculasService);
  private readonly funcionesService = inject(FuncionesService);
  protected readonly auth = inject(AuthService);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pelicula = signal<Pelicula | null>(null);
  protected readonly resenas = signal<Resena[]>([]);
  protected readonly promedio = signal(0);
  protected readonly cantidadResenas = signal(0);

  // Modal horarios (misma lógica que cartelera)
  protected readonly modalHorarios = signal(false);
  protected readonly funciones = signal<Funcion[]>([]);
  protected readonly cargandoFunciones = signal(false);
  protected readonly fechaSeleccionada = signal<string | null>(null);
  protected readonly formatoSeleccionado = signal<string | null>(null);

  // Formulario de reseña
  protected readonly misEstrellas = signal(5);
  protected readonly miComentario = signal('');
  protected readonly enviandoResena = signal(false);
  protected readonly errorResena = signal<string | null>(null);
  protected readonly okResena = signal(false);

  protected readonly fechasDisponibles = computed(() => {
    const vistas = new Map<string, string>();
    for (const f of this.funciones()) {
      const clave = claveFecha(f.fecha_hora_inicio);
      if (!vistas.has(clave)) vistas.set(clave, etiquetaFecha(f.fecha_hora_inicio));
    }
    return [...vistas].map(([clave, etiqueta]) => ({ clave, etiqueta }));
  });

  protected readonly fechaActiva = computed(() => {
    const lista = this.fechasDisponibles();
    return lista.find((x) => x.clave === this.fechaSeleccionada())?.clave ?? lista[0]?.clave ?? null;
  });

  private readonly funcionesDelDia = computed(() =>
    this.funciones().filter((f) => claveFecha(f.fecha_hora_inicio) === this.fechaActiva()),
  );

  protected readonly formatosDisponibles = computed(() => {
    const vistos = new Map<string, string>();
    for (const f of this.funcionesDelDia()) {
      const clave = `${f.formato}|${f.idioma}`;
      const idioma = f.idioma === 'castellano' ? 'Castellano' : 'Subtitulada';
      if (!vistos.has(clave)) vistos.set(clave, `${f.formato} · ${idioma}`);
    }
    return [...vistos].map(([clave, etiqueta]) => ({ clave, etiqueta }));
  });

  protected readonly formatoActivo = computed(() => {
    const lista = this.formatosDisponibles();
    return lista.find((x) => x.clave === this.formatoSeleccionado())?.clave ?? lista[0]?.clave ?? null;
  });

  protected readonly horariosDisponibles = computed(() =>
    this.funcionesDelDia()
      .filter((f) => `${f.formato}|${f.idioma}` === this.formatoActivo())
      .map((f) => ({
        funcion: f,
        hora: horaLocal(f.fecha_hora_inicio),
        precio: precioEntrada(f),
        preventa: estaEnPreventa(f),
      })),
  );

  protected readonly esProximamentePeli = computed(() =>
    esProximamente(this.pelicula()?.fecha_estreno),
  );

  /** Array 1..5 para pintar estrellas del promedio. */
  protected readonly estrellasPromedio = computed(() => {
    const p = this.promedio();
    return [1, 2, 3, 4, 5].map((n) => {
      if (p >= n) return 'llena';
      if (p >= n - 0.5) return 'media';
      return 'vacia';
    });
  });

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Película no encontrada.');
      this.cargando.set(false);
      return;
    }
    try {
      const peli = await this.peliculasService.getPelicula(id);
      if (!peli) {
        this.error.set('No encontramos esa película.');
        return;
      }
      this.pelicula.set(peli);
      await this.cargarResenas(id);
    } catch (e) {
      this.error.set((e as { message?: string })?.message ?? 'Error al cargar la película.');
    } finally {
      this.cargando.set(false);
    }
  }

  private async cargarResenas(peliculaId: string): Promise<void> {
    try {
      const lista = await this.peliculasService.getResenas(peliculaId);
      this.resenas.set(lista);
      if (lista.length === 0) {
        this.promedio.set(0);
        this.cantidadResenas.set(0);
      } else {
        const suma = lista.reduce((s, r) => s + (r.estrellas ?? 0), 0);
        this.promedio.set(Math.round((suma / lista.length) * 10) / 10);
        this.cantidadResenas.set(lista.length);
      }
    } catch (e) {
      console.error('No se pudieron cargar reseñas:', e);
    }
  }

  protected setEstrellas(n: number): void {
    this.misEstrellas.set(n);
  }

  protected async enviarResena(): Promise<void> {
    const p = this.pelicula();
    if (!p || this.enviandoResena()) return;
    if (!this.auth.estaRegistrado()) {
      this.errorResena.set('Tenés que iniciar sesión con una cuenta para dejar una reseña.');
      return;
    }
    this.enviandoResena.set(true);
    this.errorResena.set(null);
    this.okResena.set(false);
    try {
      await this.peliculasService.crearResena(
        p.id,
        this.misEstrellas(),
        this.miComentario(),
        this.auth.usuario()?.id ?? null,
      );
      this.miComentario.set('');
      this.misEstrellas.set(5);
      this.okResena.set(true);
      await this.cargarResenas(p.id);
    } catch (e) {
      this.errorResena.set(
        (e as { message?: string })?.message ??
          'No se pudo guardar la reseña. Puede que ya hayas opinado sobre esta película.',
      );
    } finally {
      this.enviandoResena.set(false);
    }
  }

  protected async abrirHorarios(): Promise<void> {
    const p = this.pelicula();
    if (!p) return;
    this.modalHorarios.set(true);
    this.funciones.set([]);
    this.fechaSeleccionada.set(null);
    this.formatoSeleccionado.set(null);
    this.cargandoFunciones.set(true);
    try {
      this.funciones.set(await this.funcionesService.getFuncionesDePelicula(p.id));
    } catch (e) {
      console.error(e);
    } finally {
      this.cargandoFunciones.set(false);
    }
  }

  protected cerrarHorarios(): void {
    this.modalHorarios.set(false);
  }

  protected seleccionarFecha(clave: string): void {
    this.fechaSeleccionada.set(clave);
    this.formatoSeleccionado.set(null);
  }

  protected seleccionarFormato(clave: string): void {
    this.formatoSeleccionado.set(clave);
  }

  protected irAFuncion(funcion: Funcion): void {
    this.cerrarHorarios();
    void this.router.navigate(['/funcion', funcion.id]);
  }
}

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
  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}
