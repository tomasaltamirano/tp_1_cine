# CineApp · Documento funcional

Qué hace la aplicación, para quién y con qué reglas.
La parte técnica (instalación, arquitectura y decisiones) está en [TECNICO.md](TECNICO.md).

## Índice

- [CineApp · Documento funcional](#cineapp--documento-funcional)
  - [Índice](#índice)
  - [1. Qué es CineApp](#1-qué-es-cineapp)
  - [2. Roles](#2-roles)
  - [3. Pantallas](#3-pantallas)
  - [4. Flujo de compra](#4-flujo-de-compra)
  - [5. Reglas de negocio](#5-reglas-de-negocio)
  - [6. Requerimientos](#6-requerimientos)
    - [Consigna](#consigna)
    - [Cartelera, películas y reseñas](#cartelera-películas-y-reseñas)
    - [Salas y funciones](#salas-y-funciones)
    - [Compra, usuarios y beneficios](#compra-usuarios-y-beneficios)
    - [Administración y empleados](#administración-y-empleados)
  - [7. Criterios adoptados](#7-criterios-adoptados)

---

## 1. Qué es CineApp

Una web para que el público de un cine vea la cartelera y saque sus entradas sin pasar por la boletería, y para que el cine administre su programación desde el mismo lugar.

El cliente elige película, función y butacas, suma productos del candy bar, paga (pago simulado) y recibe una entrada con código QR. Puede hacerlo con una cuenta o como invitado. Con cuenta suma puntos en cada compra, tiene un cupón de bienvenida, ve su crédito y puede cancelar una compra hasta 2 horas antes de la función: el total vuelve como crédito para la próxima compra.

El administrador carga películas, arma las funciones (el sistema elige la sala), crea salas y administra los productos del candy bar.

## 2. Roles

| Rol                | Quién es                  | Qué puede hacer                                                                                        |
| ------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------ |
| Visitante          | Entra sin identificarse   | Ver la cartelera, los próximos estrenos y el detalle de las películas                                  |
| Invitado           | Eligió comprar sin cuenta | Todo lo anterior, más elegir butacas y pagar                                                           |
| Cliente registrado | Se registró con sus datos | Todo lo anterior, más perfil, cupón de bienvenida, puntos, crédito, historial, reseñas y cancelaciones |
| Administrador      | Personal del cine         | Películas, funciones, salas y candy bar                                                                |

El rol `empleado` existe en el modelo de datos, pero todavía no tiene pantallas propias.

## 3. Pantallas

| Pantalla                 | Qué ofrece                                                                                                                                | Quién entra             |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Cartelera (`/peliculas`) | Las 3 películas más vendidas arriba, grilla con buscador y filtro por género, "Próximamente" y modal para elegir fecha, formato y horario | Todos                   |
| Detalle de película      | Sinopsis, duración, clasificación, puntaje promedio, reseñas y horarios                                                                   | Todos                   |
| Resumen de la función    | Datos de la película, sala, formato, idioma y precio antes de elegir butacas                                                              | Todos                   |
| Butacas                  | Mapa de la sala en tiempo real, pestaña de candy bar y total                                                                              | Invitados y registrados |
| Pago                     | Resumen con descuentos y confirmación del pago simulado                                                                                   | Invitados y registrados |
| Confirmación             | Código QR de la compra                                                                                                                    | Quien acaba de comprar  |
| Acceso, login y registro | Elegir entre ingresar, crear cuenta o seguir como invitado                                                                                | Sin cuenta registrada   |
| Mi perfil                | Datos, puntos, crédito, cupón e historial de compras con opción de cancelar                                                               | Registrados             |
| Administración           | Salas (con vista del mapa), funciones (con ocupación), películas y candy bar                                                              | Administradores         |

## 4. Flujo de compra

1. El cliente elige una función desde la cartelera o el detalle de la película y ve su resumen.
2. Para seguir tiene que tener sesión: si no la tiene, la pantalla de acceso le ofrece ingresar, registrarse o continuar como invitado.
3. Elige hasta 8 butacas en el mapa. Las ocupadas se actualizan en tiempo real. Si la película tiene restricción de edad y el comprador es menor, no puede continuar (el invitado declara su fecha de nacimiento).
4. Si quiere, suma productos del candy bar.
5. En el pago ve el detalle con los descuentos que le corresponden, el crédito aplicado y el total. Confirma y el pago se simula.
6. Recibe el código QR. Si tiene cuenta, suma 1 punto por cada peso pagado.

Hasta 2 horas antes de la función, el cliente registrado puede cancelar desde su perfil: las butacas quedan libres y el total vuelve como crédito.

## 5. Reglas de negocio

- Entre dos funciones de la misma sala tienen que pasar al menos 30 minutos. La sala la asigna el sistema.
- Una butaca no se puede vender dos veces para la misma función.
- Las películas son ATP, +13 o +18. Quien no tiene la edad no puede comprar, y la entrada aclara que debe ir un adulto.
- Cupón de bienvenida: 20% en la primera compra del usuario registrado.
- Descuento para mayores de 50 años: 10%. Los dos descuentos se aplican uno después del otro.
- Las butacas VIP tienen un precio propio (el de la función o, si no lo define, el de la entrada por 1,5).
- Una función puede tener precio de preventa hasta su fecha de fin.
- 1 punto por cada peso pagado, solo para usuarios registrados.
- El crédito se usa automáticamente al comprar, hasta cubrir el total.
- Se puede cancelar hasta 2 horas antes de la función. No se devuelve dinero: el total vuelve como crédito.
- Una película con fecha de estreno futura aparece en "Próximamente".
- Las pantallas de administración solo se abren con rol de administrador.

## 6. Requerimientos

Referencias: `[x]` implementado · `[ ]` pendiente.

### Consigna

- [x] Documento que resume los requerimientos (este archivo)
- [x] Aplicación con los temas vistos en clase
- [x] Aplicación desplegada con URL funcional (<https://tp1cine.vercel.app>)
- [x] Código en GitHub
- [x] README con arquitectura y decisiones técnicas ([TECNICO.md](TECNICO.md))
- [x] Integración con Supabase y PWA

### Cartelera, películas y reseñas

- [x] Películas con duración, imagen, nombre y sinopsis
- [x] Elegir qué películas aparecen en la cartelera
- [x] Las 3 más vendidas arriba
- [x] Buscador y filtro por género (cada película puede tener varios géneros)
- [x] Reseñas con estrellas y comentario, visibles antes de comprar, con puntaje promedio
- [x] Restricción de edad (ATP, +13, +18) con bloqueo a menores y aviso de adulto acompañante
- [x] "Próximamente" con las películas de estreno futuro
- [ ] Alerta de aviso cuando se abre la venta
- [ ] "Mis películas": historial visual de lo que vio el usuario

### Salas y funciones

- [x] Alta de salas y vista de su mapa de butacas
- [ ] Baja o desactivación de salas
- [x] Sala con 3 bloques de 4, 20 y 4 butacas
- [x] Butacas accesibles (2, 10 y 2) y VIP, resaltadas en el mapa
- [x] Funciones con horario, formato (2D, 3D, 4D, 5D) e idioma
- [x] Alta y baja de funciones
- [ ] Edición de funciones
- [x] Asignación automática de sala y 30 minutos entre funciones
- [ ] Programar la misma película en varios días de una sola vez
- [x] Butacas en tiempo real
- [x] Preventa con precio especial y fecha de fin (configurada en cada función)

### Compra, usuarios y beneficios

- [x] Registro con mail, nombre, apellido, fecha de nacimiento, tipo de sangre, color de ojos y días de vacaciones
- [x] Compra sin registrarse (invitado)
- [x] Cupón de 20% en la primera compra
- [x] Descuento para mayores de 50 años
- [ ] Porcentajes y edad de los descuentos configurables desde el admin (hoy son constantes)
- [x] Productos del candy bar con categorías, comprados junto con la entrada
- [x] 1 punto por peso gastado, visible en el perfil
- [ ] Canje de puntos por entradas o productos y su historial
- [ ] Combos configurables
- [x] Cancelación hasta 2 horas antes con devolución como crédito
- [x] Crédito visible en el perfil y usable al comprar
- [x] Precio más alto para butacas VIP
- [ ] Entrada en PDF (hoy se muestra el código QR en pantalla)

### Administración y empleados

- [x] Administrador de salas, funciones, películas y candy bar
- [ ] Usuarios empleados que escanean el QR (cine y candy bar), con ingreso manual y código de un solo uso
- [ ] Reporte de facturación por día, con exportación a PDF y Excel
- [ ] Gráficos de películas más vistas y producto más vendido
- [ ] Registro de actividad (quién creó una función, cambió un precio o validó un QR)

## 7. Criterios adoptados

| Tema                        | Criterio                                                                                                             |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Compra sin cuenta           | Se usa un acceso anónimo de Supabase. La compra queda sin usuario asociado y no suma puntos ni descuentos de cuenta. |
| Filtro con varios géneros   | Se muestran las películas que tienen al menos uno de los géneros elegidos.                                           |
| Las 3 más vendidas          | Se ordenan por ventas históricas, entre las películas que ya se estrenaron.                                          |
| Butacas por compra          | Máximo 8. Hasta 20 unidades de cada producto del candy bar.                                                          |
| Precio de la entrada        | Se define en cada función.                                                                                           |
| Descuento para mayores      | Se aplica desde los 50 años cumplidos.                                                                               |
| Pago                        | Simulado.                                                                                                            |
| Cancelar una compra         | Solo usuarios registrados, porque el crédito se acredita a una cuenta.                                               |
| Edad en compras sin cuenta  | Se pide la fecha de nacimiento solo si la película tiene restricción.                                                |
| Pantallas de administración | Sin sesión llevan al ingreso de administrador; con otra cuenta vuelven a la cartelera.                               |
