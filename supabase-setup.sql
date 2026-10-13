-- ROGER COSTTA — ESQUEMA DE REFERÊNCIA PARA BANCO NOVO
-- ATENÇÃO: você já executou um SQL anteriormente. NÃO rode este arquivo por cima do banco atual sem comparar as colunas.
-- Ajuste nomes/colunas para o esquema que já existe antes de aplicar.
create extension if not exists pgcrypto;

create table if not exists public.barbers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  username text unique,
  specialty text,
  photo text,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null default 0 check(price >= 0),
  duration_minutes integer not null default 30 check(duration_minutes > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.barber_working_hours (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  weekday smallint not null check(weekday between 0 and 6), -- 0 domingo
  start_time time not null,
  end_time time not null,
  break_start time,
  break_end time,
  active boolean not null default true,
  check(end_time > start_time),
  unique(barber_id, weekday)
);

create table if not exists public.barber_days_off (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  day_off date not null,
  note text,
  unique(barber_id, day_off)
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  client_phone text not null,
  barber_id uuid not null references public.barbers(id),
  service_id uuid not null references public.services(id),
  appointment_date date not null,
  appointment_time time not null,
  status text not null default 'confirmed' check(status in ('pending','confirmed','completed','cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists appointments_barber_date_idx on public.appointments(barber_id, appointment_date, appointment_time);
create index if not exists appointments_phone_idx on public.appointments(client_phone);

-- A função create_public_booking usa lock transacional por barbeiro/data e valida sobreposição
-- considerando a duração de cada serviço antes de gravar a reserva.

create or replace function public.rc_is_admin()
returns boolean language sql stable security definer set search_path=public,auth as $$
  select coalesce((auth.jwt()->'app_metadata'->>'role')='admin', false);
$$;

alter table public.barbers enable row level security;
alter table public.services enable row level security;
alter table public.barber_working_hours enable row level security;
alter table public.barber_days_off enable row level security;
alter table public.appointments enable row level security;

-- Catálogo público: clientes não veem informações privadas, somente os barbeiros/serviços ativos.
drop policy if exists "public can view active barbers" on public.barbers;
create policy "public can view active barbers" on public.barbers for select to anon, authenticated using (active = true or auth.uid() = auth_user_id or public.rc_is_admin());
drop policy if exists "admins manage barbers" on public.barbers;
create policy "admins manage barbers" on public.barbers for all to authenticated using (public.rc_is_admin()) with check (public.rc_is_admin());

drop policy if exists "public can view active services" on public.services;
create policy "public can view active services" on public.services for select to anon, authenticated using (active = true or public.rc_is_admin());
drop policy if exists "admins manage services" on public.services;
create policy "admins manage services" on public.services for all to authenticated using (public.rc_is_admin()) with check (public.rc_is_admin());

drop policy if exists "public can view working hours" on public.barber_working_hours;
create policy "public can view working hours" on public.barber_working_hours for select to anon, authenticated using (active = true or public.rc_is_admin());
drop policy if exists "admins manage working hours" on public.barber_working_hours;
create policy "admins manage working hours" on public.barber_working_hours for all to authenticated using (public.rc_is_admin()) with check (public.rc_is_admin());

drop policy if exists "public can view days off" on public.barber_days_off;
create policy "public can view days off" on public.barber_days_off for select to anon, authenticated using (true);
drop policy if exists "admins manage days off" on public.barber_days_off;
create policy "admins manage days off" on public.barber_days_off for all to authenticated using (public.rc_is_admin()) with check (public.rc_is_admin());

drop policy if exists "barbers view own appointments" on public.appointments;
create policy "barbers view own appointments" on public.appointments for select to authenticated using (public.rc_is_admin() or barber_id in (select id from public.barbers where auth_user_id=auth.uid()));
drop policy if exists "barbers update own appointments" on public.appointments;
create policy "barbers update own appointments" on public.appointments for update to authenticated using (public.rc_is_admin() or barber_id in (select id from public.barbers where auth_user_id=auth.uid())) with check (public.rc_is_admin() or barber_id in (select id from public.barbers where auth_user_id=auth.uid()));
drop policy if exists "admins manage all appointments" on public.appointments;
create policy "admins manage all appointments" on public.appointments for all to authenticated using (public.rc_is_admin()) with check (public.rc_is_admin());
-- Nenhuma política de INSERT público direto: reservas entram pela RPC validada.

create or replace function public.get_available_slots(p_barber_id uuid, p_date date, p_service_id uuid)
returns table(time text)
language plpgsql security definer set search_path=public,auth as $$
declare v_start time; v_end time; v_break_start time; v_break_end time; v_duration integer; v_weekday integer; v_time time; v_end_time time;
begin
  if p_date < current_date then return; end if;
  select duration_minutes into v_duration from public.services where id=p_service_id and active=true;
  if v_duration is null then return; end if;
  v_weekday := extract(dow from p_date)::integer;
  if exists(select 1 from public.barber_days_off where barber_id=p_barber_id and day_off=p_date) then return; end if;
  select start_time,end_time,break_start,break_end into v_start,v_end,v_break_start,v_break_end
    from public.barber_working_hours where barber_id=p_barber_id and weekday=v_weekday and active=true;
  if v_start is null then return; end if;
  v_time := v_start;
  while v_time + make_interval(mins=>v_duration) <= v_end loop
    v_end_time := v_time + make_interval(mins=>v_duration);
    if (v_break_start is null or v_break_end is null or not (v_time < v_break_end and v_end_time > v_break_start))
       and (p_date > current_date or v_time > localtime)
       and not exists (
         select 1 from public.appointments a join public.services s on s.id=a.service_id
         where a.barber_id=p_barber_id and a.appointment_date=p_date and a.status <> 'cancelled'
           and v_time < a.appointment_time + make_interval(mins=>s.duration_minutes)
           and v_end_time > a.appointment_time
       ) then
      return query select to_char(v_time,'HH24:MI');
    end if;
    v_time := v_time + interval '30 minutes';
  end loop;
end $$;

create or replace function public.create_public_booking(p_client_name text,p_client_phone text,p_service_id uuid,p_barber_id uuid,p_date date,p_time time)
returns uuid language plpgsql security definer set search_path=public,auth as $$
declare v_duration integer; v_start time; v_end time; v_break_start time; v_break_end time; v_id uuid; v_weekday integer;
begin
  if length(trim(coalesce(p_client_name,''))) < 3 or length(regexp_replace(coalesce(p_client_phone,''),'\D','','g')) < 10 then raise exception 'Dados do cliente inválidos'; end if;
  if p_date < current_date then raise exception 'Data inválida'; end if;
  perform pg_advisory_xact_lock(hashtext(p_barber_id::text),hashtext(p_date::text));
  select duration_minutes into v_duration from public.services where id=p_service_id and active=true;
  if v_duration is null then raise exception 'Serviço indisponível'; end if;
  if not exists(select 1 from public.barbers where id=p_barber_id and active=true) then raise exception 'Barbeiro indisponível'; end if;
  v_weekday := extract(dow from p_date)::integer;
  if exists(select 1 from public.barber_days_off where barber_id=p_barber_id and day_off=p_date) then raise exception 'Barbeiro de folga'; end if;
  select start_time,end_time,break_start,break_end into v_start,v_end,v_break_start,v_break_end from public.barber_working_hours where barber_id=p_barber_id and weekday=v_weekday and active=true;
  if v_start is null or p_time < v_start or p_time + make_interval(mins=>v_duration) > v_end then raise exception 'Horário fora do expediente'; end if;
  if p_date=current_date and p_time <= localtime then raise exception 'Horário já passou'; end if;
  if v_break_start is not null and v_break_end is not null and p_time < v_break_end and p_time + make_interval(mins=>v_duration) > v_break_start then raise exception 'Horário de intervalo'; end if;
  if exists(select 1 from public.appointments a join public.services s on s.id=a.service_id where a.barber_id=p_barber_id and a.appointment_date=p_date and a.status <> 'cancelled' and p_time < a.appointment_time + make_interval(mins=>s.duration_minutes) and p_time + make_interval(mins=>v_duration) > a.appointment_time) then raise exception 'SLOT_TAKEN: horário já reservado'; end if;
  insert into public.appointments(client_name,client_phone,barber_id,service_id,appointment_date,appointment_time,status) values(trim(p_client_name),trim(p_client_phone),p_barber_id,p_service_id,p_date,p_time,'confirmed') returning id into v_id;
  return v_id;
end $$;
revoke all on function public.create_public_booking(text,text,uuid,uuid,date,time) from public;
grant execute on function public.create_public_booking(text,text,uuid,uuid,date,time) to anon,authenticated;
revoke all on function public.get_available_slots(uuid,date,uuid) from public;
grant execute on function public.get_available_slots(uuid,date,uuid) to anon,authenticated;

-- Cadastre horários individuais em barber_working_hours e dias de folga em barber_days_off.
-- Crie o usuário no Supabase Auth e associe auth.users.id à coluna barbers.auth_user_id.
-- Para o proprietário, defina app_metadata.role = 'admin' no servidor/console confiável, nunca pelo frontend.
