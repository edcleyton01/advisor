# ADVISOR OS

Sistema de acompanhamento de mentorados do **Programa ADVISOR** — documenta, traça e alinha o plano de ação de cada cliente, acompanha a execução e gamifica o processo com recompensas por bloco de ações concluídas.

Construído sobre os **5 pilares** da metodologia: Branding & Posicionamento · Marketing · Vendas · Produtos · Inteligência Artificial.

## Visão geral

O sistema tem dois modos de acesso (alternáveis na barra lateral):

- **Advisor** — painel de gestão: visão geral, lista e detalhe dos mentorados, comercial, campanhas, playbooks e equipe.
- **Mentorado** — jornada gamificada: "Minha semana", plano de ação, check-in semanal, resultados comerciais, conquistas e evolução por pilar.

### Principais funcionalidades

- **Editor completo** — CRUD de mentorados, blocos de ação, ações, sessões de mentoria e equipe (com pilares de foco e mentorados atribuídos).
- **Diagnóstico por pilar** — radar de maturidade 0–10 (linha de base × atual).
- **Gamificação** — XP, níveis (Iniciante → Referência), conquistas automáticas, streak semanal e loja de recompensas resgatável com XP.
- **Ciclos** — encerramento de ciclo com re-diagnóstico (o radar atual vira a nova base) e histórico de ciclos.
- **Ritmo de execução** — check-in semanal (avanços/bloqueios/foco) que alimenta o streak automaticamente, e pauta de call gerada automaticamente a partir do plano.
- **Aprovação de entregas** — o mentorado envia a ação para revisão; o mentor/guardião aprova (o XP entra na aprovação). Comentários por ação.
- **Registro de calls** — cada mentoria registra quem conduziu (mentor ou guardião/monitor).
- **Comercial** — vendas mensais por período com destaque para produtos *high ticket*, metas mensais (previsto × realizado) e pipeline *high ticket* (kanban).
- **Campanhas** — calendário mensal por funil (webinar, social selling, lives, quiz, sessão de diagnóstico, conteúdo orgânico, VSL, evento presencial) com métricas: produto, ticket, CPL, CPA, leads, conversão % — e cálculo automático de investimento, receita e ROAS. Comparativo de funis entre meses.
- **Playbooks** — a metodologia em templates reaproveitáveis; aplicar um playbook cria um bloco de ações com prazos e XP calculados.
- **Copiloto** — insights automáticos a partir dos dados (CPA fora da curva, funil campeão, meta atrás do ritmo, atrasos).
- **Relatório mensal** — versão imprimível/PDF por mentorado.

## Stack

- **React 18 + TypeScript + Vite**
- CSS escrito à mão (tema escuro, estilo *keynote* minimalista)
- **Supabase** (Postgres + Auth) para persistência em nuvem — opcional
- Deploy na **Vercel**

## Rodando localmente

```bash
npm install
npm run dev      # http://localhost:5199
npm run build    # build de produção
```

Sem variáveis de ambiente, o app roda em **modo local** (dados no `localStorage` do navegador, com dados de demonstração). É o modo ideal para explorar o sistema.

## Modo nuvem (Supabase)

Com as credenciais do Supabase presentes, o app passa a exigir **login** e guarda os dados num **workspace compartilhado** pela equipe.

### 1. Variáveis de ambiente

Copie `.env.example` para `.env.local` (e configure as mesmas na Vercel, ambiente Production):

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...          # a chave "anon public"
```

> A `anon key` é segura para o cliente — o RLS (abaixo) protege os dados.
> A URL é a **Project URL** (Settings → API), sem `/rest/v1/` e sem barra no final.

### 2. Tabela e políticas de acesso

No SQL Editor do Supabase:

```sql
create table if not exists public.workspace (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.workspace enable row level security;
create policy "team_read"   on public.workspace for select to authenticated using (true);
create policy "team_insert" on public.workspace for insert to authenticated with check (true);
create policy "team_update" on public.workspace for update to authenticated using (true) with check (true);
```

### 3. Acesso da equipe (login por senha)

Cadastro aberto **desligado** (Authentication → Providers → Email). Cada membro é criado manualmente em **Authentication → Users → Add user** com e-mail + senha e a opção **Auto Confirm User** marcada.

## Deploy (Vercel)

```bash
npx vercel --prod
```

As variáveis `VITE_*` são embutidas no build — configure-as na Vercel **antes** de publicar.

---

> Uso interno do Programa ADVISOR.
