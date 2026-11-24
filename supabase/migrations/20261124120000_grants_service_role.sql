-- Permissões do `service_role` no schema do carrossel.
--
-- O bug que este arquivo corrige: a migration anterior
-- (`20261123120000_projetos_carrossel.sql`) concedeu privilégio só a
-- `authenticated`. O `service_role` ficou com o que o Supabase dá por padrão em
-- tabela nova — REFERENCES, TRIGGER, TRUNCATE — e **nenhum SELECT, INSERT,
-- UPDATE ou DELETE**.
--
-- Consequência medida em 24/11/2026 no projeto `wtncitzuebccdgekxxso`:
-- o PostgREST respondia `42501 permission denied for table projetos` para a
-- chave de serviço. Como `projetoPorToken()` (`src/lib/estudio/armazenamento.ts`)
-- é o único caminho do link público e ele fala com `service_role`, todo
-- `/p/<token>` caía em `notFound()` — link compartilhado sempre 404, sem erro
-- visível para ninguém.
--
-- Depois do grant, a prova em produção: INSERT pela chave de serviço devolveu
-- 201, `GET /p/<token>` devolveu 200 com o conteúdo do projeto, e a linha de
-- prova foi apagada em seguida.
--
-- Por que conceder escrita, e não só leitura: a docstring de
-- `supabase-servidor.ts` reserva o `service_role` para "o que é público por
-- desenho e para a migração". Migração de dado antigo precisa escrever.
-- `anon` continua sem nada — a superfície pública é o servidor resolvendo o
-- token, nunca o navegador falando com o banco.

grant select, insert, update, delete on public.projetos to service_role;
grant select, insert, update, delete on public.perfis to service_role;
