import { Injectable, computed, inject, signal } from '@angular/core';
import { Session, User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { DatosRegistro, Perfil, Rol } from '../models/perfil.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService).client;

  // --- Estado (signals) ---
  readonly sesion = signal<Session | null>(null);
  readonly perfil = signal<Perfil | null>(null);

  readonly usuario = computed(() => this.sesion()?.user ?? null);
  readonly esAnonimo = computed(() => this.usuario()?.is_anonymous === true);
  readonly estaRegistrado = computed(() => !!this.usuario() && !this.esAnonimo());

  /**
   * Rol para la UI y los guards. OJO: esto solo decide qué se muestra.
   * Lo que realmente protege los datos son las políticas RLS en Supabase.
   */
  readonly rol = computed<Rol>(() => {
    if (!this.usuario()) return 'visitante';
    if (this.esAnonimo()) return 'anonimo';
    return this.perfil()?.rol ?? 'cliente';
  });

  readonly nombreVisible = computed(() => {
    if (this.esAnonimo()) return 'Invitado';
    return this.perfil()?.nombre || this.usuario()?.email?.split('@')[0] || '';
  });

  /** Se resuelve cuando ya se restauró la sesión guardada (y su perfil). Los guards lo esperan. */
  readonly listo: Promise<void>;
  private resolverListo!: () => void;

  constructor() {
    this.listo = new Promise<void>((resolve) => (this.resolverListo = resolve));

    this.supabase.auth.onAuthStateChange((_evento, sesion) => {
      this.sesion.set(sesion);
      // Supabase advierte: no hacer llamadas a la API dentro de este callback (puede colgarse).
      // Se difiere con setTimeout, que es la solución que recomiendan.
      setTimeout(async () => {
        await this.cargarPerfil(sesion?.user ?? null);
        this.resolverListo();
      }, 0);
    });
  }

  // --- Acciones ---

  async registrar(datos: DatosRegistro): Promise<{ requiereConfirmacion: boolean }> {
    // Si venía como invitado, se descarta esa sesión para crear la cuenta real.
    if (this.esAnonimo()) {
      await this.supabase.auth.signOut();
    }

    const { email, password, ...resto } = datos;
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      // Estos datos los toma el trigger de la base para crear la fila en "perfiles".
      options: { data: resto },
    });
    if (error) throw new Error(this.traducirError(error.message));

    // Con "Confirm email" activado en Supabase no hay sesión hasta que confirme el mail.
    return { requiereConfirmacion: !data.session };
  }

  async login(email: string, password: string): Promise<Perfil | null> {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(this.traducirError(error.message));

    // Se carga el perfil acá para poder chequear el rol antes de navegar.
    await this.cargarPerfil(data.user);
    return this.perfil();
  }

  async loginAnonimo(): Promise<void> {
    const { error } = await this.supabase.auth.signInAnonymously();
    if (error) throw new Error(this.traducirError(error.message));
  }

  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
    this.perfil.set(null);
  }

  /** Actualiza campos del perfil en memoria (p. ej. tras sumar puntos o usar cupón). */
  parchearPerfil(parcial: Partial<Perfil>): void {
    const actual = this.perfil();
    if (actual) this.perfil.set({ ...actual, ...parcial });
  }

  // --- Internos ---

  private async cargarPerfil(user: User | null): Promise<void> {
    if (!user || user.is_anonymous) {
      this.perfil.set(null);
      return;
    }
    const { data, error } = await this.supabase
      .from('perfiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) console.error('Error al cargar el perfil:', error);
    this.perfil.set((data as Perfil | null) ?? null);
  }

  private traducirError(mensaje: string): string {
    const m = mensaje.toLowerCase();
    if (m.includes('invalid login credentials')) return 'Email o contraseña incorrectos.';
    if (m.includes('email not confirmed')) return 'Tenés que confirmar tu email antes de ingresar.';
    if (m.includes('already registered')) return 'Ya existe una cuenta con ese email.';
    if (m.includes('password should be at least')) return 'La contraseña es demasiado corta.';
    if (m.includes('anonymous sign-ins are disabled'))
      return 'El acceso como invitado no está habilitado todavía.';
    if (m.includes('rate limit')) return 'Demasiados intentos. Probá de nuevo en unos minutos.';
    return mensaje;
  }
}
