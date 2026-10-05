import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CandyService } from '../../core/services/candy.service';
import { CompraService } from '../../core/services/compra.service';
import { CambioButaca, FuncionesService } from '../../core/services/funciones.service';
import { SalasService } from '../../core/services/salas.service';
import { FuncionDetalle } from '../../core/models/funcion.model';
import { ProductoCandy } from '../../core/models/candy.model';
import { Butaca } from '../../core/models/sala.model';
import { calcularEdad, fechaNacimientoValida } from '../../core/utils/edad';
import { precioButaca } from '../../core/utils/precios';
import { SalaMapaComponent } from '../../shared/components/sala-mapa/sala-mapa.component';
import { DuracionPipe } from '../../shared/pipes/duracion.pipe';
import { ClasificacionPipe } from '../../shared/pipes/clasificacion.pipe';

/** Máximo de butacas por compra (evita que alguien "acapare" una sala entera). */
const MAX_BUTACAS = 8;

@Component({
  selector: 'app-seleccion-butacas',
  standalone: true,
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    SalaMapaComponent,
    DuracionPipe,
    ClasificacionPipe,
  ],
  templateUrl: './seleccion-butacas.component.html',
  styleUrl: './seleccion-butacas.component.css',
})
export class SeleccionButacasComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly funcionesService = inject(FuncionesService);
  private readonly salasService = inject(SalasService);
  private readonly candyService = inject(CandyService);
  private readonly compraService = inject(CompraService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly auth = inject(AuthService);

  protected readonly maxButacas = MAX_BUTACAS;

  // --- Estado ---
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);

  protected readonly funcion = signal<FuncionDetalle | null>(null);
  protected readonly butacas = signal<Butaca[]>([]);
  protected readonly ocupadas = signal<ReadonlySet<string>>(new Set());
  protected readonly seleccionadas = signal<ReadonlySet<string>>(new Set());

  protected readonly productos = signal<ProductoCandy[]>([]);
  protected readonly cantidades = signal<Record<string, number>>({});

  protected readonly pestana = signal<'entradas' | 'candy'>('entradas');
  protected readonly sinopsisAbierta = signal(false);
  protected readonly fechaDeclarada = signal('');

  // --- Datos derivados ---
  protected readonly pelicula = computed(() => this.funcion()?.peliculas ?? null);
  protected readonly restriccion = computed(() => this.pelicula()?.clasificacion_edad ?? null);

  /** La función ya empezó: no se venden más entradas. */
  protected readonly funcionCerrada = computed(() => {
    const f = this.funcion();
    return !!f && new Date(f.fecha_hora_inicio) <= new Date();
  });

  /** Edad conocida: la del perfil (registrado) o la que declaró el invitado. */
  private readonly edadUsuario = computed<number | null>(() => {
    const nacimiento =
      this.auth.perfil()?.fecha_nacimiento ??
      (fechaNacimientoValida(this.fechaDeclarada()) ? this.fechaDeclarada() : null);
    return nacimiento ? calcularEdad(nacimiento) : null;
  });

  /**
   * libre     -> sin restricción, o edad suficiente
   * declarar  -> hay restricción y todavía no sabemos la edad (invitado)
   * bloqueado -> es menor de la edad permitida
   */
  protected readonly estadoEdad = computed<'libre' | 'declarar' | 'bloqueado'>(() => {
    const minima = this.restriccion();
    if (minima == null) return 'libre';
    const edad = this.edadUsuario();
    if (edad == null) return 'declarar';
    return edad >= minima ? 'libre' : 'bloqueado';
  });

  protected readonly puedeElegir = computed(
    () => !this.cargando() && !this.funcionCerrada() && this.estadoEdad() === 'libre',
  );

  private readonly butacasPorId = computed(() => new Map(this.butacas().map((b) => [b.id, b])));

  protected readonly lineasEntrada = computed(() => {
    const f = this.funcion();
    if (!f) return [];
    return [...this.seleccionadas()]
      .map((id) => this.butacasPorId().get(id))
      .filter((b): b is Butaca => !!b)
      .sort((a, b) => a.fila.localeCompare(b.fila) || a.columna - b.columna)
      .map((butaca) => ({ butaca, precio: precioButaca(f, butaca.tipo) }));
  });

  protected readonly lineasCandy = computed(() =>
    this.productos()
      .filter((p) => (this.cantidades()[p.id] ?? 0) > 0)
      .map((producto) => {
        const cantidad = this.cantidades()[producto.id];
        return { producto, cantidad, subtotal: producto.precio * cantidad };
      }),
  );

  protected readonly categorias = computed(() => {
    const porCategoria = new Map<string, ProductoCandy[]>();
    for (const p of this.productos()) {
      porCategoria.set(p.categoria, [...(porCategoria.get(p.categoria) ?? []), p]);
    }
    return [...porCategoria].map(([nombre, items]) => ({ nombre, items }));
  });

  protected readonly subtotalEntradas = computed(() =>
    this.lineasEntrada().reduce((suma, l) => suma + l.precio, 0),
  );
  protected readonly subtotalCandy = computed(() =>
    this.lineasCandy().reduce((suma, l) => suma + l.subtotal, 0),
  );
  protected readonly total = computed(() => this.subtotalEntradas() + this.subtotalCandy());
  protected readonly unidadesCandy = computed(() =>
    this.lineasCandy().reduce((suma, l) => suma + l.cantidad, 0),
  );

  // --- Ciclo de vida ---
  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Función inválida.');
      this.cargando.set(false);
      return;
    }

    try {
      const funcion = await this.funcionesService.getFuncion(id);
      if (!funcion) {
        this.error.set('No encontramos esa función. Puede que ya no esté disponible.');
        return;
      }
      this.funcion.set(funcion);

      const [butacas, ocupadas] = await Promise.all([
        this.salasService.getButacas(funcion.sala_id),
        this.funcionesService.getButacasOcupadas(funcion.id),
      ]);
      this.butacas.set(butacas);
      this.ocupadas.set(ocupadas);

      const cancelar = this.funcionesService.suscribirOcupadas(
        funcion.id,
        (cambio) => this.aplicarCambio(cambio),
        () => void this.refrescarOcupadas(funcion.id),
      );
      this.destroyRef.onDestroy(cancelar);

      // El candy es un extra: si falla, se puede comprar igual la entrada.
      this.candyService
        .getProductos()
        .then((p) => this.productos.set(p))
        .catch((e) => console.error('No se pudo cargar el candy:', e));
    } catch (e) {
      this.error.set((e as { message?: string })?.message ?? 'No se pudo cargar la función.');
    } finally {
      this.cargando.set(false);
    }
  }

  // --- Tiempo real ---
  private aplicarCambio(cambio: CambioButaca): void {
    if (cambio.tipo === 'liberada') {
      this.ocupadas.update((s) => this.sinElemento(s, cambio.butacaId));
      return;
    }

    this.ocupadas.update((s) => new Set(s).add(cambio.butacaId));

    if (this.seleccionadas().has(cambio.butacaId)) {
      const b = this.butacasPorId().get(cambio.butacaId);
      this.seleccionadas.update((s) => this.sinElemento(s, cambio.butacaId));
      this.aviso.set(`La butaca ${b ? b.fila + b.columna : ''} acaba de ser ocupada por otra persona. Elegí otra.`);
    }
  }

  private async refrescarOcupadas(funcionId: string): Promise<void> {
    try {
      const ocupadas = await this.funcionesService.getButacasOcupadas(funcionId);
      this.ocupadas.set(ocupadas);
      // Si alguna de mis butacas quedó ocupada mientras estaba desconectado, se descarta.
      this.seleccionadas.update((s) => new Set([...s].filter((id) => !ocupadas.has(id))));
    } catch (e) {
      console.error('No se pudo refrescar el mapa:', e);
    }
  }

  private sinElemento(conjunto: ReadonlySet<string>, id: string): Set<string> {
    const copia = new Set(conjunto);
    copia.delete(id);
    return copia;
  }

  // --- Acciones ---
  protected alternar(butaca: Butaca): void {
    if (!this.puedeElegir() || this.ocupadas().has(butaca.id)) return;
    this.aviso.set(null);

    if (this.seleccionadas().has(butaca.id)) {
      this.seleccionadas.update((s) => this.sinElemento(s, butaca.id));
      return;
    }
    if (this.seleccionadas().size >= MAX_BUTACAS) {
      this.aviso.set(`Podés elegir hasta ${MAX_BUTACAS} butacas por compra.`);
      return;
    }
    this.seleccionadas.update((s) => new Set(s).add(butaca.id));
  }

  protected quitar(id: string): void {
    this.seleccionadas.update((s) => this.sinElemento(s, id));
  }

  protected cambiarCantidad(producto: ProductoCandy, delta: number): void {
    const actual = this.cantidades()[producto.id] ?? 0;
    const nueva = Math.max(0, Math.min(20, actual + delta));
    this.cantidades.update((c) => ({ ...c, [producto.id]: nueva }));
  }

  protected cantidadDe(producto: ProductoCandy): number {
    return this.cantidades()[producto.id] ?? 0;
  }

  protected continuar(): void {
    const f = this.funcion();
    if (!f || this.lineasEntrada().length === 0) return;

    const fechaNacimiento =
      this.auth.perfil()?.fecha_nacimiento ??
      (fechaNacimientoValida(this.fechaDeclarada()) ? this.fechaDeclarada() : null);
    const carrito = this.compraService.armarCarrito(
      f,
      this.lineasEntrada(),
      this.lineasCandy(),
      fechaNacimiento,
    );
    void this.router.navigate(['/funcion', f.id, 'pago'], {
      state: { carrito },
    });
  }

  protected volver(): void {
    void this.router.navigateByUrl('/peliculas');
  }

  protected setFechaDeclarada(valor: string): void {
    this.fechaDeclarada.set(valor);
  }
}
