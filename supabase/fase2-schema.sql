-- ============================================================
--  ADVISOR OS — Fase 2: dados normalizados + segurança por linha
--  Seguro rodar: cria tabelas NOVAS. Não altera a tabela
--  `workspace` da Fase 1 (o app continua funcionando durante a
--  construção; o "cutover" acontece só quando estiver testado).
-- ============================================================

-- ---------- Perfis: liga cada login a um papel ----------
create table if not exists public.profiles (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  role      text not null default 'mentee' check (role in ('advisor','team','mentee')),
  mentee_id text,                 -- preenchido quando role = 'mentee'
  created_at timestamptz not null default now()
);

-- ---------- Dados compartilhados (equipe + playbooks) ----------
create table if not exists public.shared (
  id         text primary key default 'global',
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- Um registro por mentorado ----------
-- data = { mentee, sales, campaigns, goals, checkins, redemptions, deals }
create table if not exists public.mentees (
  id            text primary key,
  owner_user_id uuid references auth.users(id) on delete set null,  -- login do mentorado (se houver)
  data          jsonb not null default '{}'::jsonb,
  updated_at    timestamptz not null default now()
);

create index if not exists mentees_owner_idx on public.mentees(owner_user_id);

-- ---------- Helper: o usuário atual é advisor/equipe? ----------
-- security definer evita recursão de RLS ao consultar profiles.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role in ('advisor','team')
  );
$$;

-- ---------- Habilita RLS ----------
alter table public.profiles enable row level security;
alter table public.shared   enable row level security;
alter table public.mentees  enable row level security;

-- ---------- Políticas: profiles ----------
drop policy if exists "profiles_self_read"  on public.profiles;
drop policy if exists "profiles_staff_write" on public.profiles;
create policy "profiles_self_read"  on public.profiles
  for select using (user_id = auth.uid() or public.is_staff());
create policy "profiles_staff_write" on public.profiles
  for all using (public.is_staff()) with check (public.is_staff());

-- ---------- Políticas: shared (todos logados leem; só staff escreve) ----------
drop policy if exists "shared_read"       on public.shared;
drop policy if exists "shared_staff_write" on public.shared;
create policy "shared_read"       on public.shared
  for select to authenticated using (true);
create policy "shared_staff_write" on public.shared
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ---------- Políticas: mentees ----------
-- staff: tudo. mentorado: só a própria linha (por owner_user_id).
drop policy if exists "mentees_staff_all"  on public.mentees;
drop policy if exists "mentees_own_read"   on public.mentees;
drop policy if exists "mentees_own_update" on public.mentees;
create policy "mentees_staff_all"  on public.mentees
  for all using (public.is_staff()) with check (public.is_staff());
create policy "mentees_own_read"   on public.mentees
  for select using (owner_user_id = auth.uid());
create policy "mentees_own_update" on public.mentees
  for update using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

-- ============================================================
--  Depois de rodar: defina você (advisor) como staff.
--  Troque o e-mail pelo seu login criado em Authentication → Users.
-- ============================================================
-- insert into public.profiles (user_id, role)
-- select id, 'advisor' from auth.users where email = 'SEU-EMAIL-AQUI'
-- on conflict (user_id) do update set role = 'advisor';
