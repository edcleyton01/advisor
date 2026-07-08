-- ============================================================
--  Habilita Realtime nas tabelas da Fase 2.
--  A RLS continua valendo: cada usuário só recebe eventos das
--  linhas que pode ver (mentorado = a própria; staff = todas).
--  Se disser "already member of publication", pode ignorar.
-- ============================================================
alter publication supabase_realtime add table public.mentees;
alter publication supabase_realtime add table public.shared;
