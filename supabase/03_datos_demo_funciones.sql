-- ============================================================================
-- SOLO PARA PROBAR. Crea funciones de ejemplo para las 3 primeras películas activas,
-- en la primera sala, durante los próximos 3 días (una película por franja de 4 horas,
-- así no se pisan). Se BORRA cuando el panel de admin permita crear funciones:
--     delete from public.funciones;
-- Requiere haber creado al menos una sala (panel admin) y tener películas cargadas.
-- ============================================================================
insert into public.funciones
  (pelicula_id, sala_id, fecha_hora_inicio, fecha_hora_fin, formato, idioma, precio_base, precio_vip)
select
  p.id,
  s.id,
  inicio.ts,
  inicio.ts + make_interval(mins => p.duracion_minutos + 30),
  (array['2D','3D','2D'])[d],
  (array['castellano','castellano','subtitulada'])[d],
  8000,
  12000
from (
  select id, duracion_minutos, row_number() over (order by creado_en) as n
  from public.peliculas where activa order by creado_en limit 3
) p
cross join (select id from public.salas order by nombre limit 1) s
cross join generate_series(1, 3) as d
cross join lateral (
  select (((current_date + d) + make_time(12 + 4 * (p.n::int - 1), 0, 0))
          at time zone 'America/Argentina/Buenos_Aires') as ts
) inicio;

-- Para ver el tiempo real: con la pantalla de butacas abierta, ejecutá esto y mirá el mapa.
-- (ocupa 5 butacas de la primera función; usa el id que quieras)
--
-- insert into public.butacas_ocupadas (funcion_id, butaca_id)
-- select f.id, b.id from public.funciones f
-- join public.butacas b on b.sala_id = f.sala_id
-- where f.id = 'ID-DE-LA-FUNCION' and b.fila = 'F' and b.columna between 10 and 14;
--
-- Para liberarlas:  delete from public.butacas_ocupadas where funcion_id = 'ID-DE-LA-FUNCION';
