# Login e persistência do carrossel (Fase 5)

## Decisão de autenticação: reusar o GoTrue do AutoClinic

O carrossel não tem login próprio. Ele usa a mesma conta do painel: GoTrue
self-hosted, JWT HS256 com o mesmo segredo que a API do AutoClinic valida, e o
papel vem de `app_usuarios` por organização.

Alternativa descartada: criar um projeto Supabase hospedado só para o carrossel.
Motivo: duas contas, dois cadastros e dois jeitos de redefinir senha para a mesma
pessoa. Um cliente que esquece a senha ligaria para o Clécio perguntando se perdeu
o acesso ao painel ou ao carrossel, e ninguém saberia responder. Reusar agora;
hospedar quando houver cliente pagando, quando a separação valer a conta.

## Como o navegador conversa com o auth

O carrossel **não** chama o GoTrue direto. O Next tem três route handlers:

- `POST /api/auth/login` → repassa para `/auth/v1/token?grant_type=password`;
- `POST /api/auth/refresh` → repassa para `grant_type=refresh_token`;
- `/api/ac/<caminho>` → repassa para a API do AutoClinic com o token do cliente.

Por que BFF em vez de proxy direto do `/auth/v1`:

1. nenhuma superfície pública nova: o GoTrue continua exposto só no domínio do
   painel, com o seu próprio TLS e seus próprios limites;
2. sem depender de configuração de CORS do GoTrue para o domínio do carrossel;
3. a URL do auth não entra no bundle do navegador.

Custo assumido: o servidor do carrossel faz um hop a mais. Vale, porque o volume é
por pessoa, não por usuário simultâneo em massa.

## Onde a sessão vive

- **access token**: só em memória. Não vai para `localStorage` (XSS lê
  `localStorage`).
- **refresh token**: `localStorage`.
- **cookie `ac_sessao=1`**: marcador de "tem sessão", usado pelo `middleware.ts`.
  Forjar o cookie não abre nada: cada chamada à API responde 401 sem token válido
  e a tela cai no login. O middleware serve para não renderizar editor vazio, não
  para autorizar.

Renovação: em 401 a camada `apiFetch` tenta renovar uma vez e repete a chamada.
Sem isso a sessão de 1 hora cairia no meio de um carrossel e a pessoa perderia o
que estava montando.

## Persistência

Antes: `documentFormKey` no `localStorage`, uma única cópia por navegador. Fechar
a aba, limpar cache ou trocar de máquina apagava o carrossel, e ninguém via o
carrossel de outra pessoa.

Agora: `carrossel_projetos` no Postgres do AutoClinic (migration 010/011), com:

- `documento` JSONB livre, porque o editor evolui mais rápido que um schema;
- versão a cada mudança **real** de conteúdo (o servidor compara em `jsonb`, então
  reordenar chaves não gera versão falsa);
- versão 1 gravada na criação, para existir um "começo" restaurável;
- restaurar cria versão nova e nunca reescreve o histórico;
- autosave com debounce de 1,2s, sem dois PATCH em voo, com flush quando a aba
  fica oculta.

Papéis: `owner` e `admin` veem a organização inteira; `operador` vê só os próprios
projetos. Projeto de outro autor responde **404**, não 403, para não confirmar que
o id existe.

## Link público

`publico_token` opaco (base64url de 16 bytes), revogável por `publico_ativo`.
Republicar reaproveita o mesmo token, porque trocar o token significa mandar uma
URL nova para o cliente a cada ciclo. A rota pública devolve só título e
documento: sem autor, sem organização, sem id interno.

## Migração do localStorage

A galeria detecta rascunho antigo e oferece importar uma vez. O item só é apagado
do navegador **depois** de o servidor confirmar a criação. Perder o rascunho por
falha de rede seria o pior desfecho possível de uma migração.

## Plano B: trocar para Supabase hospedado

Se em algum momento fizer sentido sair do self-hosted:

1. criar o projeto no Supabase e copiar `Project URL`, `anon key` e o JWT secret;
2. no carrossel, trocar `AUTOCLINIC_AUTH_URL` para a URL do projeto (o BFF não
   muda, porque ele já fala HTTP com o auth);
3. importar `auth.users` e `app_usuarios` mantendo o mesmo `sub` (senão todo
   vínculo de autor em `carrossel_projetos.autor_id` quebra);
4. apontar `AUTOCLINIC_API_URL` do painel para a nova base e reaplicar as
   migrations 001 a 011;
5. reemitir senhas uma vez, porque hash de senha não é exportável.

Enquanto o número de contas for de duas ou três, o passo 3 é o único que exige
cuidado. Com centenas, migrar identidade passa a ser projeto, não tarefa.

## Verificação

- `node scripts/qa-carrossel-api.mjs` (no repositório do AutoClinic): 22 casos,
  incluindo link revogado, projeto de outro autor e documento igual sem versão.
- Visual: login, galeria, abertura de projeto com autosave, histórico com
  restaurar, link público abrindo sem sessão e recusando depois de revogado.

## Diferença em relação ao combinado na tarefa K5.11

A tarefa previa publicar o carrossel atrás do domínio com `/auth/v1` proxyado. O
que foi feito é um proxy **no servidor do Next**, não um caminho público novo. O
critério de aceite (login funciona em produção, sem CORS) é atendido; a diferença
é de superfície exposta, e ela é menor assim.
