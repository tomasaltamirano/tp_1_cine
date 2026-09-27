-- ============================================================================
-- CineApp · Migración 02: butacas ocupadas en tiempo real + precio VIP
-- Requiere haber corrido la 01. Es re-ejecutable. Pegar completo en el SQL Editor.
-- ============================================================================

-- ---------- 1. Precio VIP configurable por función ----------------------------
-- Si queda en null, el frontend usa precio_base x 1.5.
alter table public.funciones add column if not exists precio_vip numeric(10,2);

-- ---------- 2. Tabla butacas_ocupadas ------------------------------------------
-- Es la "fuente de verdad" de qué butacas de cada función están vendidas.
--  * Es pública para lectura: el cliente necesita ver las ocupadas, pero NO quién las compró
--    (compras y compra_butacas siguen privadas).
--  * La clave primaria (funcion_id, butaca_id) hace IMPOSIBLE vender dos veces la misma butaca.
--  * Nadie escribe acá desde el cliente: la llenan los triggers de abajo.
create table if not exists public.butacas_ocupadas (
  funcion_id uuid not null references public.funciones (id) on delete cascade,
  butaca_id  uuid not null references public.butacas (id) on delete cascade,
  primary key (funcion_id, butaca_id)
);

alter table public.butacas_ocupadas enable row level security;
drop policy if exists "Lectura pública" on public.butacas_ocupadas;
create policy "Lectura pública" on public.butacas_ocupadas for select using (true);

-- ---------- 3. Triggers que la mantienen sincronizada con las compras ---------
-- Al guardar una butaca en una compra -> se marca ocupada en esa función.
-- Si otra persona ya la había comprado, la PK falla y toda la compra se revierte.
create or replace function public.ocupar_butaca_de_compra()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.butacas_ocupadas (funcion_id, butaca_id)
  select c.funcion_id, new.butaca_id from public.compras c where c.id = new.compra_id;
  return new;
end;
$$;

drop trigger if exists trg_ocupar_butaca on public.compra_butacas;
create trigger trg_ocupar_butaca
  after insert on public.compra_butacas
  for each row execute function public.ocupar_butaca_de_compra();

-- Al cancelar una compra -> sus butacas se liberan.
create or replace function public.liberar_butacas_de_compra()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = 'cancelada' and old.estado is distinct from 'cancelada' then
    delete from public.butacas_ocupadas bo
    using public.compra_butacas cb
    where cb.compra_id = new.id
      and bo.funcion_id = new.funcion_id
      and bo.butaca_id = cb.butaca_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_liberar_butacas on public.compras;
create trigger trg_liberar_butacas
  after update of estado on public.compras
  for each row execute function public.liberar_butacas_de_compra();

-- ---------- 4. Activar Realtime para la tabla -----------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'butacas_ocupadas'
     ) then
    alter publication supabase_realtime add table public.butacas_ocupadas;
  end if;
end $$;
