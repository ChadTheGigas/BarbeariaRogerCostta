-- BARBEARIA ROGER COSTTA — SUPABASE
-- Execute este script no SQL Editor do Supabase.
-- Depois crie UMA conta de autenticação (email + senha) manualmente.
-- Não coloque a service_role key no frontend.

create extension if not exists pgcrypto;

create table if not exists public.barbers (
  id text primary key,
  name text not null,
  photo_url text,
  active boolean not null default true
);

create table if not exists public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role = 'admin'),
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_name text not null check (char_length(client_name) between 2 and 100),
  phone text not null check (char_length(phone) between 10 and 30),
  barber_id text not null references public.barbers(id),
  date date not null,
  time time not null,
  service text not null,
  status text not null default 'confirmed' check (status in ('confirmed','cancelled')),
  created_at timestamptz not null default now()
);

-- O conflito é protegido no banco, não no JavaScript.
create unique index if not exists appointments_active_slot_unique
on public.appointments(barber_id, date, time)
where status = 'confirmed';

insert into public.barbers(id,name,active) values
('roger','Roger',true),
('vitinho','Vitinho',true),
('caio','Caio',true)
on conflict (id) do update set name=excluded.name, active=excluded.active;

alter table public.barbers enable row level security;
alter table public.admin_roles enable row level security;
alter table public.appointments enable row level security;

-- Função segura para verificar papel administrativo.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(
    select 1 from public.admin_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Barbeiros são dados públicos mínimos usados no agendamento.
drop policy if exists "public can view active barbers" on public.barbers;
create policy "public can view active barbers"
on public.barbers for select
to anon, authenticated
using (active = true);

-- Somente admins podem ler/alterar agendamentos diretamente.
drop policy if exists "admins can read appointments" on public.appointments;
create policy "admins can read appointments"
on public.appointments for select
to authenticated
using (public.is_admin());

drop policy if exists "admins can update appointments" on public.appointments;
create policy "admins can update appointments"
on public.appointments for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- RPC pública para horários. Ela retorna somente horários livres,
-- sem expor nome/telefone de clientes.
create or replace function public.get_available_slots(p_barber_id text, p_date date)
returns table(slot text)
language plpgsql
security definer
set search_path = public
as $$
declare
  t time;
begin
  if p_date < current_date then return; end if;
  if extract(dow from p_date) = 0 then return; end if;

  for t in
    select x::time from unnest(array[
      '09:00','09:45','10:30','11:15',
      '13:00','13:45','14:30','15:15',
      '16:00','16:45','17:30','18:15','19:00'
    ]) x
  loop
    if not exists(
      select 1 from public.appointments a
      where a.barber_id=p_barber_id and a.date=p_date
        and a.time=t and a.status='confirmed'
    ) then
      slot := to_char(t,'HH24:MI'); return next;
    end if;
  end loop;
end;
$$;

revoke all on function public.get_available_slots(text,date) from public;
grant execute on function public.get_available_slots(text,date) to anon, authenticated;

-- Criação atômica do agendamento. O índice único continua sendo a
-- última barreira contra duas reservas simultâneas.
create or replace function public.create_appointment(
  p_client_name text,
  p_phone text,
  p_barber_id text,
  p_date date,
  p_time text,
  p_service text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare new_id uuid;
begin
  if char_length(trim(p_client_name)) < 2 then
    raise exception 'Nome inválido';
  end if;
  if length(regexp_replace(p_phone,'\D','','g')) < 10 then
    raise exception 'Telefone inválido';
  end if;
  if p_date < current_date then
    raise exception 'Data inválida';
  end if;
  if not exists(select 1 from public.barbers where id=p_barber_id and active=true) then
    raise exception 'Barbeiro indisponível';
  end if;

  insert into public.appointments(client_name,phone,barber_id,date,time,service)
  values(trim(p_client_name),trim(p_phone),p_barber_id,p_date,p_time::time,trim(p_service))
  returning id into new_id;

  return new_id;

exception
  when unique_violation then
    raise exception 'Horário já reservado';
end;
$$;

revoke all on function public.create_appointment(text,text,text,date,text,text) from public;
grant execute on function public.create_appointment(text,text,text,date,text,text) to anon, authenticated;

-- IMPORTANTE:
-- Depois de criar a conta no Authentication > Users, pegue o UUID dela e rode:
-- insert into public.admin_roles(user_id, role) values ('UUID-DA-CONTA','admin');
