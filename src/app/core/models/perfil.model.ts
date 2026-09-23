/** Roles que se guardan en la base (tabla perfiles). */
export type RolDb = 'cliente' | 'empleado' | 'admin';

/** Roles que maneja la app: además de los de la base, se distingue quién no ingresó y quién es anónimo. */
export type Rol = 'visitante' | 'anonimo' | RolDb;

export const TIPOS_SANGRE = ['0+', '0-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'] as const;
export const COLORES_OJOS = ['Marrón', 'Negro', 'Azul', 'Celeste', 'Verde', 'Gris', 'Avellana'] as const;

/** Fila de la tabla perfiles. El email no está ahí: vive en auth.users (auth.usuario()?.email). */
export interface Perfil {
  id: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string; // 'YYYY-MM-DD'
  tipo_sangre: string | null;
  color_ojos: string | null;
  dias_vacaciones: number | null;
  rol: RolDb;
  puntos_fidelidad: number;
  credito_disponible: number;
  cupon_bienvenida_usado: boolean;
  creado_en?: string;
}

export interface DatosRegistro {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  tipo_sangre: string;
  color_ojos: string;
  dias_vacaciones: number;
}
