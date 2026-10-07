# CineApp · TP 1 Programación IV

Aplicación web para un cine: cartelera, compra de entradas con mapa de butacas en tiempo real, candy bar, cancelación con crédito y panel de administración. Hecha con Angular 21 y Supabase, instalable como PWA.

|                 |                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------- |
| **Deploy**      | [https://tp1cine.vercel.app](https://tp1cine.vercel.app/)                                    |
| **Repositorio** | [https://github.com/tomasaltamirano/tp_1_cine](https://github.com/tomasaltamirano/tp_1_cine) |
| **Estado**      | Compra y administración implementadas; los pendientes están marcados en FUNCIONAL.md         |

## Documentación

| Documento                 | Qué contiene                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------ |
| [FUNCIONAL](FUNCIONAL.MD) | Qué hace la app: roles, pantallas, flujo de compra, reglas y lista de requerimientos |
| [TECNICO](TECNICO.MD)     | Cómo está hecha: instalación, arquitectura, modelo de datos y decisiones técnicas    |

## Qué hace

- Cartelera con las películas más vendidas destacadas, buscador y filtro por género.
- Sección "Próximamente" para las películas con estreno futuro.
- Detalle de película con sinopsis, puntaje promedio, reseñas y horarios (fecha, formato e idioma).
- Compra de entradas con mapa de butacas en tiempo real (normales, VIP y accesibles) y productos del candy bar.
- Compra con cuenta o como invitado, con restricción de edad por película.
- Descuentos (cupón de bienvenida y mayores de 50), crédito en la cuenta y 1 punto por peso pagado.
- Cancelación desde el perfil hasta 2 horas antes de la función, con el total devuelto como crédito.
- Entrada con código QR. El pago es simulado.
- Panel de administración de películas, funciones (con asignación automática de sala), salas y candy bar.

## Stack

| Capa         | Tecnología                                       |
| ------------ | ------------------------------------------------ |
| **Frontend** | Angular 21 (standalone, signals)                 |
| **Backend**  | Supabase (PostgreSQL, Auth, RLS, RPC y Realtime) |
| **PWA**      | @angular/service-worker                          |
| **Hosting**  | Vercel                                           |

## Arranque rápido

```bash
npm install
npm start   # http://localhost:4200
```
