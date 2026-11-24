-- Autopilot: um post por dia, por perfil, sem o usuário operar nada.
--
-- Desenho decidido com o critic em 24/11/2026:
--   * a identidade do perfil vem de uma ENTREVISTA de 4 perguntas (scraping de
--     Instagram em IP de datacenter é 429 na hora; Chromium nesta VPS estoura RAM);
--   * o job diário gera SÓ TEXTO (slides + legenda + hashtags). A capa é gerada
--     on-demand quando a pessoa abre o post — capa em background para perfil que
--     ninguém abriu queima a cota do provedor de imagem;
--   * a execução é serial (concorrência 1) por timer do sistema.
--
-- Idempotência: um post automático por (usuário, dia) garantido por índice
-- único parcial. Rodar o tick duas vezes não gera dois posts.
--
-- Segurança: RLS por `auth.uid()` — o usuário vê e edita só o próprio perfil. O
-- cron fala por `service_role`.

create table if not exists public.perfis_automacao (
  user_id              uuid primary key references auth.users (id) on delete cascade,
  ativo                boolean not null default false,
  -- Liberação pelo administrador: signup é aberto e autoconfirm, então autopilot
  -- ligado por padrão viraria torneira de custo aberta para qualquer bot.
  liberado             boolean not null default false,
  ig_handle            text,
  -- Respostas da entrevista: nicho, público, oferta, tom, pilares.
  briefing             jsonb not null default '{}'::jsonb,
  -- Últimos temas usados, para o prompt proibir repetição (cap 20).
  historico_temas      jsonb not null default '[]'::jsonb,
  -- Contador de posts automáticos que a pessoa não abriu/baixou.
  posts_sem_abrir      integer not null default 0,
  ultima_execucao_em   timestamptz,
  ultimo_status        text,
  ultimo_erro          text,
  criado_em            timestamptz not null default now(),
  atualizado_em        timestamptz not null default now()
);

alter table public.perfis_automacao enable row level security;

drop policy if exists perfis_automacao_leitura_dono on public.perfis_automacao;
create policy perfis_automacao_leitura_dono on public.perfis_automacao
  for select using (auth.uid() = user_id);

drop policy if exists perfis_automacao_insercao_dono on public.perfis_automacao;
create policy perfis_automacao_insercao_dono on public.perfis_automacao
  for insert with check (auth.uid() = user_id);

drop policy if exists perfis_automacao_alteracao_dono on public.perfis_automacao;
create policy perfis_automacao_alteracao_dono on public.perfis_automacao
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

revoke all on public.perfis_automacao from anon;
-- `liberado` NÃO pode ser ligado pelo próprio usuário: o update acima deixaria.
-- Por isso o grant de UPDATE exclui a coluna e o service_role (cron/painel) é o
-- único que libera.
grant select, insert on public.perfis_automacao to authenticated;
grant update (ativo, ig_handle, briefing, historico_temas, posts_sem_abrir, atualizado_em)
  on public.perfis_automacao to authenticated;
grant select, insert, update, delete on public.perfis_automacao to service_role;

-- Origem do projeto: manual (estúdio) ou autopilot (job diário).
alter table public.projetos
  add column if not exists origem text not null default 'manual';
alter table public.projetos
  add column if not exists data_referencia date;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'projetos_origem_check'
  ) then
    alter table public.projetos
      add constraint projetos_origem_check check (origem in ('manual', 'autopilot'));
  end if;
end $$;

-- Um post automático por dia por usuário. Índice parcial: manual não entra.
create unique index if not exists projetos_autopilot_dia_uidx
  on public.projetos (auth_user_id, data_referencia)
  where origem = 'autopilot';
