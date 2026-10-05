# CineApp - Sistema de Gestión de Cine

**Trabajo Práctico 1 - Programación IV**
**Alumno:** Tomás Nehuén Altamirano

🔗 **URL de la aplicación desplegada:** https://tp1cine.vercel.app/

## 📌 Resumen del Proyecto

CineApp es una Progressive Web App (PWA) desarrollada para la gestión integral de un cine. Permite a los clientes explorar la cartelera, adquirir entradas con selección de butacas en tiempo real, comprar combos en el Candy Bar, y gestionar su historial y cancelaciones. Cuenta con un panel de administración completo para gestionar funciones, asignación automática de salas, precios y catálogos.

## Arquitectura

El sistema utiliza una arquitectura **BaaS (Backend as a Service)**, separando claramente las responsabilidades:

- **Frontend:** Aplicación SPA (Single Page Application) construida con Angular 17+, encargada de la interfaz de usuario, validaciones visuales y la lógica de presentación.
- **Backend & Base de Datos:** Supabase (PostgreSQL), encargado de la autenticación, almacenamiento, seguridad de acceso a datos y ejecución de reglas de negocio complejas directamente en el servidor.

## Decisiones Técnicas

### 1. Angular Moderno (Standalone & Signals)

Se prescindió completamente de `app.module.ts` adoptando una arquitectura **100% Standalone Components**. La gestión del estado y la reactividad se manejan nativamente mediante **Signals** (`signal`, `computed`), reemplazando el uso intensivo de RxJS para lograr un ciclo de detección de cambios más eficiente y un código más declarativo.

### 2. Seguridad a Nivel de Filas (RLS)

Para proteger la integridad de los datos de los clientes, se implementaron políticas **Row-Level Security (RLS)** en PostgreSQL. Las tablas sensibles (como `compras`, `perfiles` o `resenas`) evalúan el `auth.uid()` del token JWT en cada petición, garantizando que un usuario autenticado solo pueda consultar o modificar su propia información, bloqueando el acceso a datos ajenos de raíz.

### 3. Integridad Transaccional (RPC)

La lógica crítica de negocio se delegó a la base de datos mediante **Procedimientos Almacenados (RPC)**. Acciones como la "asignación automática de salas verificando 30 minutos de margen" o la "cancelación de compras con devolución de crédito y liberación de butacas" ocurren atómicamente en PostgreSQL. Esto evita condiciones de carrera (race conditions) y previene estados inconsistentes en la base de datos frente a fallos de red del cliente.

### 4. Progressive Web App (PWA)

La aplicación cuenta con configuración PWA nativa (`@angular/pwa`), incluyendo `manifest.webmanifest` y estrategias de caché mediante Service Workers, permitiendo su instalación como aplicación nativa en dispositivos móviles y de escritorio.
