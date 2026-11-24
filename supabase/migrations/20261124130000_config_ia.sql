-- Configuração de IA do produto, definida pelo administrador.
--
-- Por que existe: até aqui as chaves viviam em `OPENAI_API_KEY` no `.env`, o que
-- só quem tem shell pode trocar. O dono do produto precisa trocar provedor e
-- chave pela interface, e a escolha vale para TODOS os usuários — o carrossel é
-- SaaS, não ferramenta que cada cliente configura.
--
-- Consequência de desenho: não existe mais campo de chave na conta do usuário.
-- Quem gasta é o servidor, com a chave do dono; por isso o portão de login
-- continua obrigatório.
--
-- Segurança: a tabela guarda segredo em texto. RLS ligada e **nenhuma policy**:
-- nem `anon` nem `authenticated` leem ou escrevem. Só o `service_role` (o
-- servidor) toca, e a leitura devolvida à tela é mascarada.

create table if not exists public.config_ia (
  -- Linha única: `id` fixo em true, e o check garante que ninguém insira uma
  -- segunda. Configuração espalhada em várias linhas vira "qual vale?".
  id            boolean primary key default true,
  llm_base_url  text,
  llm_model     text,
  llm_api_key   text,
  imagem_base_url text,
  imagem_model  text,
  imagem_api_key text,
  atualizado_por text,
  atualizado_em timestamptz not null default now(),
  constraint config_ia_linha_unica check (id)
);

alter table public.config_ia enable row level security;

revoke all on public.config_ia from anon;
revoke all on public.config_ia from authenticated;
grant select, insert, update, delete on public.config_ia to service_role;
