-- ============================================================================
-- CineApp · Migración 01: registro (trigger de perfiles), roles/admin, políticas RLS
-- y creación de salas con sus butacas.
--
-- Se apoya en el schema del TP (tablas perfiles, salas, butacas ya creadas).
-- No crea tablas. Pegar completo en Supabase > SQL Editor > Run. Es re-ejecutable.
-- ============================================================================

-- ---------- 1. Perfil automático al registrarse -----------------------------
-- El frontend manda los datos en signUp(options.data); este trigger los copia a "perfiles".
-- Los invitados (anónimos) no tienen perfil: sus compras guardan usuario_id = null.
-- Ojo: perfiles exige nombre, apellido y fecha_nacimiento, así que los usuarios
-- deben crearse desde el formulario de registro (no desde el panel de Supabase).
create or replace function public.crear_perfil_al_registrarse()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.is_anonymous, false) then
    return new;
  end if;

  insert into public.perfiles (id, nombre, apellido, fecha_nacimiento, tipo_sangre, color_ojos, dias_vacaciones)
  values (
    new.id,
    new.raw_user_meta_data ->> 'nombre',
    new.raw_user_meta_data ->> 'apellido',
    (new.raw_user_meta_data ->> 'fecha_nacimiento')::date,
    nullif(new.raw_user_meta_data ->> 'tipo_sangre', ''),
    nullif(new.raw_user_meta_data ->> 'color_ojos', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'dias_vacaciones', '')::integer, 0)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.crear_perfil_al_registrarse();

-- ---------- 2. ¿Es admin? ----------------------------------------------------
-- security definer: se puede usar dentro de políticas RLS sin recursión.
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and rol = 'admin');
$$;

-- ---------- 3. Políticas de perfiles -----------------------------------------
drop policy if exists "perfiles_select_propio_o_admin" on public.perfiles;
create policy "perfiles_select_propio_o_admin" on public.perfiles
  for select using (id = auth.uid() or public.es_admin());

drop policy if exists "perfiles_update_propio" on public.perfiles;
create policy "perfiles_update_propio" on public.perfiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- IMPORTANTE: la política de arriba deja editar la fila propia, así que se limitan las COLUMNAS.
-- Un cliente nunca puede tocar rol, puntos_fidelidad, credito_disponible ni cupon_bienvenida_usado
-- (eso lo van a modificar funciones de la base al comprar/canjear).
revoke update on public.perfiles from anon, authenticated;
grant update (nombre, apellido, fecha_nacimiento, tipo_sangre, color_ojos, dias_vacaciones)
  on public.perfiles to authenticated;

-- ---------- 4. Salas y butacas: solo el admin escribe -------------------------
-- (la lectura pública ya la dan las políticas "Lectura pública" del schema)
drop policy if exists "salas_admin_escribe" on public.salas;
create policy "salas_admin_escribe" on public.salas
  for all using (public.es_admin()) with check (public.es_admin());

drop policy if exists "butacas_admin_escribe" on public.butacas;
create policy "butacas_admin_escribe" on public.butacas
  for all using (public.es_admin()) with check (public.es_admin());

-- ---------- 5. Crear sala + generar butacas ----------------------------------
-- Filas A..T (20). "columna" es el número de butaca dentro de la fila.
--   Normales y VIP: 28 por fila (bloques 4 / 20 / 4).   J y K = accesibles: 14 por fila (2 / 10 / 2).
--   R, S y T = VIP.   Total: 15*28 + 3*28 + 2*14 = 532 butacas.
create or replace function public.crear_sala(p_nombre text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.es_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  insert into public.salas (nombre) values (trim(p_nombre)) returning id into v_id;

  insert into public.butacas (sala_id, fila, columna, tipo)
  select v_id, f.fila, s.n, f.tipo
  from (
    select chr(64 + i) as fila,
           case when chr(64 + i) in ('J', 'K')      then 'accesible'
                when chr(64 + i) in ('R', 'S', 'T') then 'vip'
                else 'normal' end as tipo
    from generate_series(1, 20) as i
  ) f
  cross join lateral generate_series(1, case when f.tipo = 'accesible' then 14 else 28 end) as s(n);

  return v_id;
end;
$$;

revoke all on function public.crear_sala(text) from public, anon;
grant execute on function public.crear_sala(text) to authenticated;

-- ---------- 6. Convertirte en admin (ejecutar a mano, con TU email) -----------
-- Primero registrate desde la app y después:
--
-- update public.perfiles set rol = 'admin'
-- where id = (select id from auth.users where email = 'tu-email@ejemplo.com');
