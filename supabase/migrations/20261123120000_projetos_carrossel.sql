-- Projeto Supabase dedicado do carrossel (org Thor Visualiza.ai, ref sjlcyghpogetolzuoziy).
--
-- Por que este schema existe: até aqui o estúdio dependia do Postgres/GoTrue do
-- AutoClinic (`/api/ac/*` + `AUTOCLINIC_AUTH_URL`). A decisão do Igor em
-- 23/11/2026 foi carrossel 100% independente, com login OBRIGATÓRIO antes de
-- qualquer geração (texto e imagem), para não gastar LLM com anônimo.
--
-- Regra de ouro: a autorização é do banco, não do código. Toda tabela tem RLS
-- forçado e política por `auth.uid()`. As rotas do Next usam o token do usuário
-- no PostgREST, então uma rota nova que esqueça o filtro ainda não vaza dado.

-- `projetos`: o projeto salvo do estúdio (cards + imagens + template).
-- `documento` guarda o contrato do estúdio (`ProjetoSalvo`) como jsonb: os bytes
-- das imagens NÃO entram aqui (1–2 MB por capa em jsonb é lixo que todo mundo
-- consulta); eles continuam em arquivo e o jsonb guarda o caminho.
create table if not exists public.projetos (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid not null references auth.users (id) on delete cascade,
  nome          text not null,
  documento     jsonb not null,
  -- Link público read-only (`/p/<token>`). Opaco e não sequencial de propósito.
  token_publico uuid not null unique default gen_random_uuid(),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists projetos_dono_atualizado_idx
  on public.projetos (auth_user_id, atualizado_em desc);

create index if not exists projetos_token_publico_idx
  on public.projetos (token_publico);

-- `perfis`: a marca que sai assinada no slide (nome/@/avatar). Era dado da
-- organização no AutoClinic; virou dado do usuário porque não há mais
-- organização no caminho do carrossel.
create table if not exists public.perfis (
  auth_user_id     uuid primary key references auth.users (id) on delete cascade,
  marca_nome       text,
  marca_handle     text,
  marca_avatar_url text,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);

-- `atualizado_em` não é digitado por quem chama: uma data vinda do cliente
-- (ou esquecida) faria a lista ordenar errado.
create or replace function public.tocar_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists projetos_tocar_atualizado_em on public.projetos;
create trigger projetos_tocar_atualizado_em
  before update on public.projetos
  for each row execute function public.tocar_atualizado_em();

drop trigger if exists perfis_tocar_atualizado_em on public.perfis;
create trigger perfis_tocar_atualizado_em
  before update on public.perfis
  for each row execute function public.tocar_atualizado_em();

-- RLS forçado: vale até para o dono da tabela. `service_role` tem BYPASSRLS e
-- continua podendo ler tudo — é o que a migração e o link público usam.
alter table public.projetos enable row level security;
alter table public.projetos force row level security;
alter table public.perfis enable row level security;
alter table public.perfis force row level security;

drop policy if exists projetos_leitura_dono on public.projetos;
create policy projetos_leitura_dono on public.projetos
  for select using (auth.uid() = auth_user_id);

drop policy if exists projetos_insercao_dono on public.projetos;
create policy projetos_insercao_dono on public.projetos
  for insert with check (auth.uid() = auth_user_id);

drop policy if exists projetos_alteracao_dono on public.projetos;
create policy projetos_alteracao_dono on public.projetos
  for update using (auth.uid() = auth_user_id) with check (auth.uid() = auth_user_id);

drop policy if exists projetos_exclusao_dono on public.projetos;
create policy projetos_exclusao_dono on public.projetos
  for delete using (auth.uid() = auth_user_id);

drop policy if exists perfis_leitura_dono on public.perfis;
create policy perfis_leitura_dono on public.perfis
  for select using (auth.uid() = auth_user_id);

drop policy if exists perfis_insercao_dono on public.perfis;
create policy perfis_insercao_dono on public.perfis
  for insert with check (auth.uid() = auth_user_id);

drop policy if exists perfis_alteracao_dono on public.perfis;
create policy perfis_alteracao_dono on public.perfis
  for update using (auth.uid() = auth_user_id) with check (auth.uid() = auth_user_id);

-- `anon` não escreve nada e não lê nada: a única superfície pública é
-- `/p/<token>`, que o servidor resolve com service_role.
revoke all on public.projetos from anon;
revoke all on public.perfis from anon;
grant select, insert, update, delete on public.projetos to authenticated;
grant select, insert, update on public.perfis to authenticated;
