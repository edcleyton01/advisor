-- ============================================================
--  Storage: bucket privado de evidências + RLS
--  Mentorado acessa só a própria pasta ({mentee_id}/...);
--  advisor/equipe acessam tudo. (is_staff() vem do fase2-schema.sql)
-- ============================================================

-- 1) bucket privado
insert into storage.buckets (id, name, public)
values ('evidences', 'evidences', false)
on conflict (id) do nothing;

-- 2) políticas de acesso aos arquivos
drop policy if exists "evidence_read"   on storage.objects;
drop policy if exists "evidence_insert" on storage.objects;
drop policy if exists "evidence_delete" on storage.objects;

create policy "evidence_read" on storage.objects for select to authenticated using (
  bucket_id = 'evidences' and (
    public.is_staff()
    or (storage.foldername(name))[1] = (select mentee_id from public.profiles where user_id = auth.uid())
  )
);

create policy "evidence_insert" on storage.objects for insert to authenticated with check (
  bucket_id = 'evidences' and (
    public.is_staff()
    or (storage.foldername(name))[1] = (select mentee_id from public.profiles where user_id = auth.uid())
  )
);

create policy "evidence_delete" on storage.objects for delete to authenticated using (
  bucket_id = 'evidences' and (
    public.is_staff()
    or (storage.foldername(name))[1] = (select mentee_id from public.profiles where user_id = auth.uid())
  )
);
