import { calcularEdad, fechaNacimientoValida } from './edad';
import { precioButaca, precioEntrada } from './precios';
import { Funcion } from '../models/funcion.model';

const funcion = (extra: Partial<Funcion> = {}): Funcion => ({
  id: 'f1',
  pelicula_id: 'p1',
  sala_id: 's1',
  fecha_hora_inicio: '2030-01-01T20:00:00Z',
  fecha_hora_fin: '2030-01-01T22:30:00Z',
  formato: '2D',
  idioma: 'castellano',
  precio_base: 8000,
  precio_vip: null,
  es_preventa: false,
  precio_preventa: null,
  fecha_fin_preventa: null,
  ...extra,
});

describe('calcularEdad', () => {
  const hoy = new Date(2026, 8, 23); // 23/09/2026
  it('cuenta los años cumplidos', () => {
    expect(calcularEdad('2000-09-23', hoy)).toBe(26); // cumple hoy
    expect(calcularEdad('2000-09-24', hoy)).toBe(25); // cumple mañana
    expect(calcularEdad('2008-12-31', hoy)).toBe(17);
  });
  it('valida fechas de nacimiento', () => {
    expect(fechaNacimientoValida('1990-05-01', hoy)).toBe(true);
    expect(fechaNacimientoValida('2030-01-01', hoy)).toBe(false);
    expect(fechaNacimientoValida('2001-02-31', hoy)).toBe(false);
    expect(fechaNacimientoValida('', hoy)).toBe(false);
  });
});

describe('precios', () => {
  it('normal y accesible cuestan el precio base', () => {
    expect(precioButaca(funcion(), 'normal')).toBe(8000);
    expect(precioButaca(funcion(), 'accesible')).toBe(8000);
  });
  it('VIP usa precio_vip o, si no hay, base x 1.5', () => {
    expect(precioButaca(funcion({ precio_vip: 12000 }), 'vip')).toBe(12000);
    expect(precioButaca(funcion(), 'vip')).toBe(12000);
  });
  it('la preventa aplica solo hasta su fecha de fin', () => {
    const f = funcion({
      es_preventa: true,
      precio_preventa: 6000,
      fecha_fin_preventa: '2026-10-01T00:00:00Z',
    });
    expect(precioEntrada(f, new Date('2026-09-23T12:00:00Z'))).toBe(6000);
    expect(precioEntrada(f, new Date('2026-10-02T12:00:00Z'))).toBe(8000);
  });
});
