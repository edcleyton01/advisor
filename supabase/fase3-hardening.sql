-- ============================================================
--  ADVISOR OS — Fase 3: hardening de segurança
--  Rode no SQL Editor do Supabase (uma vez, inteiro).
--  Seguro re-rodar: tudo é idempotente.
--
--  1) Tranca a tabela `workspace` (Fase 1) — dados preservados
--     como backup, mas nenhum usuário do app lê ou escreve.
--  2) Notas privadas do advisor saem do payload do mentorado
--     (nova tabela mentees_private, visível só para staff).
--  3) Limites server-side no bucket de evidências.
--  4) Trigger: mentorado não consegue alterar o próprio
--     accessUntil (tempo de acesso ao programa).
-- ============================================================

-- ---------- 1) workspace: RLS ligada + zero políticas = ninguém acessa ----------
-- (service_role ignora RLS, então o dado segue recuperável por você)
alter table if exists public.workspace enable row level security;
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'workspace' loop
    execute format('drop policy %I on public.workspace', p.policyname);
  end loop;
end $$;

-- ---------- 2) Notas privadas: tabela só-staff ----------
-- sem FK para mentees: a gravação do app escreve esta tabela primeiro
-- (mentorado novo ainda não tem linha em mentees nesse momento)
create table if not exists public.mentees_private (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.mentees_private enable row level security;

drop policy if exists "mentees_private_staff_all" on public.mentees_private;
create policy "mentees_private_staff_all" on public.mentees_private
  for all using (public.is_staff()) with check (public.is_staff());

-- migra as notas existentes do blob para a tabela privada…
insert into public.mentees_private (id, data)
select id, jsonb_build_object('privateNotes', data->'mentee'->>'privateNotes')
from public.mentees
where coalesce(data->'mentee'->>'privateNotes', '') <> ''
on conflict (id) do update set data = excluded.data;

-- …e remove do blob que o mentorado consegue ler
update public.mentees
set data = jsonb_set(data, '{mentee}', (data->'mentee') - 'privateNotes')
where data->'mentee' ? 'privateNotes';

-- ---------- 3) Bucket de evidências: limites no servidor ----------
update storage.buckets
set file_size_limit = 8388608,                     -- 8 MB (igual ao client)
    allowed_mime_types = array['image/*', 'application/pdf']
where id = 'evidences';

-- ---------- 4) Mentorado não estende o próprio acesso ----------
create or replace function public.guard_mentee_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    if (new.data->'mentee'->>'accessUntil') is distinct from (old.data->'mentee'->>'accessUntil') then
      raise exception 'Campo protegido: accessUntil só pode ser alterado pela equipe.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_mentee_update on public.mentees;
create trigger guard_mentee_update
  before update on public.mentees
  for each row execute function public.guard_mentee_update();
