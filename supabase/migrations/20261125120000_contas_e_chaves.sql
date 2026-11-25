-- Contas e chaves: o que o admin controla e o que o usuário pode custear.
--
-- Três decisões, todas pedidas em 25/11/2026:
--
-- 1. `config_produto` — interruptor de cadastro público e exigência de convite.
--    Linha única, RLS sem policy, só service_role (mesmo padrão de `config_ia`).
-- 2. `convites` — código de uso único, com expiração, criado pelo admin. Serve
--    para abrir uma exceção no cadastro fechado sem soltar a porta para bots.
-- 3. `chaves_usuario` — chave de LLM/imagem do próprio usuário, que SOBREPÕE a
--    global do painel. Existe para quem prefere pagar o próprio consumo; vazia,
--    cai na global.

create table if not exists public.config_produto (
  id                boolean primary key default true,
  -- Cadastro público aberto? Fechado = /cadastro recusa e a tela explica.
  cadastro_aberto   boolean not null default true,
  -- Exige código de convite mesmo com cadastro aberto.
  exigir_convite    boolean not null default false,
  atualizado_por    text,
  atualizado_em     timestamptz not null default now(),
  constraint config_produto_linha_unica check (id)
);

alter table public.config_produto enable row level security;
revoke all on public.config_produto from anon;
revoke all on public.config_produto from authenticated;
grant select, insert, update, delete on public.config_produto to service_role;

create table if not exists public.convites (
  codigo        text primary key,
  criado_por    text,
  criado_em     timestamptz not null default now(),
  expira_em     timestamptz not null,
  usado_por     uuid references auth.users (id) on delete set null,
  usado_em      timestamptz,
  -- Rótulo livre para o admin lembrar para quem gerou.
  nota          text
);

alter table public.convites enable row level security;
revoke all on public.convites from anon;
revoke all on public.convites from authenticated;
grant select, insert, update, delete on public.convites to service_role;

create index if not exists convites_expira_idx on public.convites (expira_em);

/**
 * `chaves_usuario`: o usuário lê/escreve a própria linha; o servidor lê para
 * resolver a chave na hora de gerar. A chave fica em texto porque precisa ser
 * usada — o que protege é o RLS e o fato de a UI só devolver máscara.
 */
create table if not exists public.chaves_usuario (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  llm_base_url     text,
  llm_model        text,
  llm_api_key      text,
  imagem_base_url  text,
  imagem_model     text,
  imagem_api_key   text,
  atualizado_em    timestamptz not null default now()
);

alter table public.chaves_usuario enable row level security;

drop policy if exists chaves_usuario_leitura_dono on public.chaves_usuario;
create policy chaves_usuario_leitura_dono on public.chaves_usuario
  for select using (auth.uid() = user_id);

drop policy if exists chaves_usuario_insercao_dono on public.chaves_usuario;
create policy chaves_usuario_insercao_dono on public.chaves_usuario
  for insert with check (auth.uid() = user_id);

drop policy if exists chaves_usuario_alteracao_dono on public.chaves_usuario;
create policy chaves_usuario_alteracao_dono on public.chaves_usuario
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists chaves_usuario_remocao_dono on public.chaves_usuario;
create policy chaves_usuario_remocao_dono on public.chaves_usuario
  for delete using (auth.uid() = user_id);

revoke all on public.chaves_usuario from anon;
grant select, insert, update, delete on public.chaves_usuario to authenticated;
grant select, insert, update, delete on public.chaves_usuario to service_role;
