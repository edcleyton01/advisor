-- ============================================================
--  Bucket de materiais complementares (PDF/RAR/ZIP)
--  Rode no SQL Editor do Supabase. Idempotente.
--  Leitura: qualquer usuário logado (mentorados baixam).
--  Escrita/exclusão: só staff (is_staff() vem do fase2-schema.sql).
--  Obs.: sem restrição de MIME porque navegadores enviam .rar com
--  tipos variados (às vezes octet-stream) — a extensão é validada
--  no app; o limite de 50 MB vale no servidor.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('materials', 'materials', false, 52428800)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists "materials_read"   on storage.objects;
drop policy if exists "materials_insert" on storage.objects;
drop policy if exists "materials_delete" on storage.objects;

create policy "materials_read" on storage.objects for select to authenticated
  using (bucket_id = 'materials');

create policy "materials_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'materials' and public.is_staff());

create policy "materials_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'materials' and public.is_staff());
