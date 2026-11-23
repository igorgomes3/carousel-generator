# Desacoplar o carrossel do AutoClinic

Estado medido em **23/11/2026**, na `main` (commit `b0540c0`), com o serviço de produção
`carousel-generator.service` (porta 8099, domínio `https://carrossel.149-56-214-54.sslip.io`).

Este documento é a **especificação de referência** do desacoplamento: inventário do que existe
hoje, o que quebra se o AutoClinic desaparecer, a decisão de autenticação e o plano em ordem de
execução com prova por passo. Nada aqui foi implementado por este documento — a execução corre
em workstream própria.

## 0. Resumo executivo

| Pergunta | Resposta |
|---|---|
| O carrossel depende do AutoClinic hoje? | Sim, em 4 pontos de código e 1 de infraestrutura. |
| O que quebra se o AutoClinic cair hoje? | **Login e renovação de sessão** (o produto inteiro). Depois: Configurações (marca), identidade no menu, link público e o domínio público (edge). |
| O estúdio em si quebra? | **Não.** Criar, gerar, salvar, baixar e "Meus projetos" usam store local em `data/estudio` e não tocam o AutoClinic. |
| Tem dado para migrar? | Não. As tabelas de carrossel do banco do AutoClinic estão zeradas desde 22/11; o único dado vivo são **2 projetos** em JSON no disco desta VPS. |
| Autenticação: contas locais ou manter GoTrue? | **Contas locais em Supabase dedicado.** Custo total estimado 12–20 h; manter o GoTrue custa 0 h hoje e cobra o preço em uptime alheio. |
| Esforço total do desacoplamento | **12–20 h** de engenharia, em 10 passos, cada um deployável sozinho. |

## 1. Inventário de dependências (o que o código realmente chama)

| # | Ponto | Onde | Para onde vai | Direção | Se o AutoClinic sumir hoje | Natureza |
|---|---|---|---|---|---|---|
| 1 | Login (senha) | `src/app/api/auth/login/route.ts:15` | `AUTOCLINIC_AUTH_URL` → `/auth/v1/token?grant_type=password` | saída | **Ninguém entra.** `/` redireciona para `/login`, e o login não autentica. | **Real, crítica** |
| 2 | Renovação de sessão | `src/app/api/auth/refresh/route.ts:20` | mesmo GoTrue, `grant_type=refresh_token` | saída | Sessão de 1 h morre e não renova; pessoa é deslogada no meio do trabalho. | **Real, crítica** |
| 3 | Proxy da API | `src/app/api/ac/[...caminho]/route.ts:14` | `AUTOCLINIC_API_URL` = `http://100.87.192.48:8097` | saída | Todo `/api/ac/*` responde 502 "API do AutoClinic indisponível." | **Real** |
| 4 | Identidade (`/me`) | `src/lib/auth/sessao.ts:138` (via `/api/ac/me`, refs em `:160`, `:164`, `:209`, `:212`) | API do AutoClinic | saída | Menu da conta fica sem e-mail/nome/papel; "Sair" continua funcionando. Configurações não abre. | **Real, degrada** |
| 5 | Marca da organização | `src/app/configuracoes/page.tsx:23,70,99` e `src/lib/providers/document-provider.tsx:44,101` — `?org=autoclinic` | `/carrossel/marca` na API do AutoClinic | saída | Configurações mostra erro ao carregar; editor novo abre com assinatura vazia (falha silenciosa, por desenho). | **Real, não crítica** |
| 6 | Link público | `src/app/p/[token]/page.tsx:12,17` | `/api/publico/carrossel/<token>` na API do AutoClinic, server-side | saída | `/p/<token>` responde 404. Hoje isso não serve nada vivo (tabelas zeradas), mas é a rota que prometemos a quem recebe a peça. | **Real (funcionalmente dormente)** |
| 7 | Editor antigo + autosave AC | `src/lib/providers/document-provider.tsx:135`, `src/lib/hooks/use-autosave-projeto.ts:43` — `/carrossel/carrosseis/<id>?org=autoclinic` | API do AutoClinic | saída | Nada. As rotas `/carrossel/:id` e `/carrossel/:id/editar` respondem **307 para `/?aviso=antigo`** (`next.config.js:29-37`). | **Resíduo** (código vivo, rota desligada) |
| 8 | Geração por fila de conteúdo | `src/app/api/conteudo/gerar/route.ts:43` (`CONTEUDO_INTERNO_TOKEN`, header `x-interno-token`) | — | **entrada** (o AutoClinic chama a gente) | Nada nosso quebra — quem chama é o AutoClinic. Vira rota órfã. | **Acoplamento invertido, resíduo** |
| 9 | Nomes `ac_*` | cookie `ac_sessao` (`src/middleware.ts:48`, `sessao.ts:13`), `ac_refresh` (`sessao.ts:12`), eventos `ac:sessao-expirada` / `ac:auth-indisponivel` | — | — | Nada. É nomenclatura herdada, não dependência. | **Resíduo de nome** |
| 10 | Edge público | Traefik (stack `traefik`) → serviço **`ac_edge_carrossel`** (socat `TCP:8092` → `100.87.192.48:8099`) | entrada do domínio | infra | **O domínio público morre mesmo com o nosso serviço de pé.** O roteamento do `carrossel.…sslip.io` vive no namespace `ac_edge`. | **Real (infra), invisível no código** |
| 11 | Banco do AutoClinic | `carrossel_projetos`, `carrossel_versoes` (Postgres do AutoClinic) | — | — | Nada: o código atual não lê nem escreve essas tabelas. Zeradas desde 22/11. | **Resíduo histórico** |
| 12 | Monitor de 4 h | externo, sem dono identificado | `GET /api/ac/me` no nosso domínio | entrada | O check falha (401/502) — e ele já depende do AutoClinic estar de pé. | **A investigar** |

### Evidência de uso real (access log do Traefik, 16→23/11)

| Rota | Chamadas | Última vez | Leitura |
|---|---|---|---|
| `GET /api/projetos*` | 21+ | 23/11 | Store local: é o fluxo vivo. |
| `GET /api/ac/me` | 6 | 23/11 | Identidade, ainda em uso. Três delas em intervalo exato de 4 h (22/11 16:05, 20:05, 23/11 00:05) — cara de monitor com dono não identificado. |
| `GET /api/ac/carrossel/marca` | 2 | 21/11 | Configurações, uso raro. |
| `GET/PATCH /api/ac/carrossel/carrosseis/<id>` | 3+3 | **21/11 17:03** | Editor antigo. Zero depois do desligamento em 22/11. |
| `GET /api/ac/conteudo/*` (fila, sinais, métricas, calendário, config) | ~22 | **21/11 17:00** | Telas antigas de conteúdo; nenhuma referência no código atual. |
| `GET /api/conteudo/gerar` | **0** | — | Nenhuma chamada em 7 dias. |
| `GET /api/.env`, `/api/v3/.env`, `/api/zzcanary-*.env` | 4 | 23/11 | Varredura de terceiros; todas 404 — nada exposto, vale registrar. |

## 2. O que quebra se o AutoClinic desaparecer hoje (por ordem de dor)

1. **Login e refresh** — 100% do produto. Sem entrar, o estúdio é inalcançável pelo middleware.
2. **Domínio público** — se o edge `ac_edge_carrossel` sair junto, o endereço para de responder
   antes mesmo do código.
3. **Configurações (marca)** — a tela abre em erro; o editor perde o pré-preenchimento de nome e `@`.
4. **Menu da conta** — sem identidade; continua renderizando e o "Sair" funciona.
5. **Link público `/p/<token>`** — 404. Sem impacto prático hoje (nada vivo), com impacto no dia
   em que um carrossel for compartilhado.
6. **Nada do núcleo**: criar, gerar, editar, salvar, listar, renomear, apagar, baixar PNG/ZIP
   continuam funcionando — `data/estudio` é disco local e a identidade do dono é cookie próprio
   (`estudio_dono`, `src/lib/estudio/dono.ts`).

## 3. Dependência real × resíduo

| Item | Real? | Ação |
|---|---|---|
| Login/refresh no GoTrue | Sim | Trocar por auth próprio (passo 4). |
| `/api/ac/*` (proxy) | Sim | Remover junto com auth próprio (passo 6). |
| Marca (`/carrossel/marca`) | Sim | Trazer para o banco novo (passo 7). |
| `/p/<token>` | Sim, dormente | Ler do banco novo (passo 6). |
| Editor antigo + autosave AC | **Não** | Apagar a árvore morta (passo 6). |
| `/api/conteudo/gerar` | **Não** (mas é contrato de entrada) | Decidir: apagar ou documentar como API externa (passo 10). |
| `ac_*` (cookie, chave, eventos) | **Não** | Renomear (passo 9). |
| Tabelas no Postgres do AutoClinic | **Não** | Não tocar. Não é nosso. |
| Edge `ac_edge_carrossel` | **Sim, infra** | Entrada própria (passo 8). |

## 4. Decisão de autenticação

### Opção A — contas locais em Supabase dedicado (projeto `carrossel-ia`)

| | |
|---|---|
| **Custo** | 6–10 h: projeto + auth (1–2 h), schema `projetos` + RLS por `auth.uid()` (2–3 h), religar `sessao.ts` + `/api/auth/*` (2–3 h), migrar 2 projetos (1 h), gate de login (1 h). |
| **Risco** | Médio. Janela de corte do login; configurar SMTP para recuperação de senha; contas novas para quem hoje entra com a conta do painel. |
| **Ganho** | Independência total. Recuperação de senha por e-mail de verdade, cadastro self-serve e "Continuar com Google" passam a ser configuração — é exatamente o gap 2 e 8 do comparativo com o CarrosseIA. |
| **Custo recorrente** | Plano free do Supabase basta para este volume; e-mail transacional precisa de SMTP (Resend/SES). |

### Opção B — manter o GoTrue do AutoClinic

| | |
|---|---|
| **Custo** | 0 h agora. |
| **Risco** | Alto e permanente: uptime do produto amarrado a outro produto; contas do carrossel são contas do painel do Clécio (o público do carrossel é leigo, não é operador do painel); recuperação de senha depende de um administrador emitir senha temporária; qualquer mudança no GoTrue quebra o login sem aviso. |
| **Ganho** | Zero trabalho e uma única senha para quem já usa o painel — que é o único usuário que existe hoje. |

### Opção C — híbrido (login local + ponte opcional de conta AutoClinic)

| | |
|---|---|
| **Custo** | 8–12 h e **dois** caminhos de sessão para testar para sempre. |
| **Risco** | Alto de dívida: dois provedores, dois formatos de token, dois jeitos de errar. |
| **Quando faria sentido** | Se o carrossel fosse módulo do painel do AutoClinic. Não é: é produto separado, com público separado. |

### Recomendação: **Opção A**, com uma ressalva de sequência

Contas locais em Supabase dedicado. Motivos, em ordem de peso:

1. **É a única opção que fecha a dependência.** B preserva o problema que este documento existe
   para resolver; C troca um acoplamento por dois.
2. **O custo de migração é praticamente zero** — 2 projetos em JSON no disco, tabelas do
   AutoClinic já zeradas. Fazer isso agora custa 1 h; fazer depois de 200 projetos custa dias.
3. **Resolve de graça dois gaps do comparativo** (recuperação de senha e cadastro self-serve),
   que hoje são "peça a quem administra".
4. **Separa públicos.** Quem cria carrossel não é operador de painel; amarrar os dois é o que
   produziu o pior defeito de UX da fase atual ("entre com a mesma conta do painel do AutoClinic").

Ressalva: **o corte do login é a única etapa com janela de indisponibilidade.** Fazer com a
Opção A já provada em paralelo (login e refresh novos funcionando contra o Supabase antes de
remover o caminho antigo), e não como troca de fio no escuro.

## 5. Plano de execução

Ordem pensada para **cada passo ser deployável sozinho** e para o produto nunca ficar sem login.
Esforço: baixo ≤ 1 h · médio 1–4 h · alto > 4 h.

| # | Passo | Esforço | Risco | Como provar |
|---|---|---|---|---|
| 1 | **Criar projeto Supabase dedicado** (`carrossel-ia`, região `sa-east-1`), credenciais fora do repo (`600`), `.env.local` atualizado. | baixo | baixo | `/auth/v1/health` → 200 no projeto novo; `git grep` sem chave; `stat` do arquivo de creds em `600`. |
| 2 | **Schema `projetos` + RLS por `auth.uid()`** (id, dono, nome, documento jsonb, imagens em Storage). | médio | médio | Teste negativo: com o JWT de outra conta, `select` devolve 0 linhas e `insert` falha com `42501`; teste positivo com a conta dona. |
| 3 | **Migrar os 2 projetos locais** (`data/estudio/projetos/*`) para o schema novo, com script idempotente e `sha256` do JSON antes/depois. | baixo | baixo | Contagem 2/2; rodar o script duas vezes e a segunda não escrever nada; `sha256` do documento igual ao original. |
| 4 | **Religar `src/lib/auth/sessao.ts` + `/api/auth/login` + `/api/auth/refresh`** no Supabase novo; remover `AUTOCLINIC_AUTH_URL` do fluxo. | médio | **alto** (janela de login) | Login real com conta nova; cookie e `/me` respondendo; `grep -r AUTOCLINIC_AUTH_URL src` → vazio; sessão sobrevive a 1 h e renova (refresh real às 61 min). |
| 5 | **Gate de login obrigatório**: middleware + `401` JSON nas rotas de geração (`/api/gerar`, `/api/imagem`, `/api/projetos` POST) + botão "Criar com IA" desabilitado sem sessão. | baixo | médio | `curl` sem sessão nas 3 rotas → `401` com corpo JSON (não redirect HTML); screenshots 390/1440 do botão desabilitado e do estado logado. |
| 6 | **Remover `/api/ac/*` e os leitores da API do AutoClinic**; `/p/<token>` passa a ler o banco novo e o editor antigo (`DocumentProvider` + `use-autosave-projeto`) sai da árvore. | médio | médio | `/api/ac/me` → 404; `grep -r "100.87.192.48\|/api/ac" src` → vazio; `curl` num `/p/<token>` real devolve o carrossel; access log do Traefik sem requisições a `8097` partindo do carrossel. |
| 7 | **Marca (nome, `@`, avatar) no banco novo**, por conta; `configuracoes` deixa de usar `?org=autoclinic`. | baixo | baixo | Salvar nas Configurações, recarregar, valor persistido; `grep -r "org=autoclinic" src` → vazio. |
| 8 | **Entrada pública independente do edge do AutoClinic**: Traefik próprio (ou nginx) com o domínio e certificado, apontando para `8099`. | médio | médio | `curl -I https://<domínio>` 200 com o serviço `ac_edge_carrossel` **parado**; `openssl s_client` mostrando o certificado do novo proxy. |
| 9 | **Limpeza de nomes**: `ac_sessao`/`ac_refresh`/`ac:*` → nomes do produto, com migração de cookie (quem já está logado não deve cair no login). | baixo | baixo | `grep -r "ac_sessao\|ac_refresh" src` → vazio; sessão aberta antes do deploy continua válida depois. |
| 10 | **Decidir `/api/conteudo/gerar`**: apagar (0 chamadas em 7 dias) ou documentar como contrato externo com dono e rate-limit. | baixo | baixo | Se apagar: rota 404 e nenhum chamador quebrado em 7 dias de log. Se manter: doc do contrato com exemplo de `curl`. |

**Total:** 12–20 h, em 2–3 dias de trabalho com deploy por passo.

**Ordem de sacrifício se o tempo apertar:** 1→4 (auth) e 8 (entrada) fecham 90 % da dependência
real. 5, 6, 7, 9 são limpeza e podem ir depois — com o detalhe de que 6 é o que apaga a superfície
de ataque (`/api/ac/*` é um proxy aberto autenticado por token do chamador).

## 6. Riscos e o que não fazer

| Risco | Mitigação |
|---|---|
| Janela sem login no corte (passo 4) | Subir o auth novo em paralelo, provar login+refresh, e só então remover o caminho antigo. Deploy fora de horário de uso. |
| Perder os 2 projetos locais | `cp -a data/estudio` antes de qualquer script; `sha256` na prova; migração idempotente. |
| Edge do AutoClinic cair durante a transição (passo 8) | É o único item de infraestrutura: fazer antes de tirar qualquer outra coisa do ar, e manter o socat como rollback por 7 dias. |
| Monitor de 4 h batendo em `/api/ac/me` (item 12) | Identificar o dono **antes** do passo 6 e apontar para `/api/health` próprio. |
| Alguém "limpar" as tabelas do AutoClinic | Fora de escopo e fora do nosso banco. Não tocar. |
| Orçamento/campanha e painel da AutoClinic | Não mexer. Este plano só olha para o repo do carrossel e para o entrypoint dele. |

## 7. Critério de pronto (como saber que desacoplou)

1. `grep -rE "AUTOCLINIC|100\.87\.192\.48|/api/ac|org=autoclinic" src` → **zero** ocorrências.
2. `curl -I https://<domínio>` responde **200** com o serviço `ac_edge_carrossel` parado.
3. Login, refresh (após 1 h), `/me`, Configurações, geração, salvar, listar, baixar ZIP e
   `/p/<token>` funcionando **com `AUTOCLINIC_*` removidas do ambiente**.
4. Access log do Traefik: **nenhuma** requisição do carrossel para `10.0.1.14:8092`/`8097` em 24 h.
5. `systemctl stop autoclinic-api` por 5 min → o carrossel continua inteiro (prova final, em
   janela combinada, com o painel do Clécio fora do ar de propósito).
