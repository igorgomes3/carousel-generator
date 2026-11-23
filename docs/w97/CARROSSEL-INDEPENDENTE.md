# Carrossel independente — Supabase dedicado + login obrigatório (W97)

Decisão do Igor em **23/11/2026**: o carrossel deixa de depender do AutoClinic e passa a
ter o seu próprio Supabase; **geração de texto e de imagem exige login**, porque cada
geração custa dinheiro e anônimo não paga.

## 1. Projeto Supabase

| item | valor |
|---|---|
| ref | `sjlcyghpogetolzuoziy` |
| nome | `carrossel-ia` |
| org | `ipbeghigrkwmxsvczalb` — Thor Visualiza.ai |
| plano da org | **free** |
| região | `us-east-1` |
| status no dia da criação | `ACTIVE_HEALTHY` |
| credenciais | `/root/.ctxswap/contexts/carrossel/creds.json` (modo 600) |

Chaves guardadas: `CARROSSEL_SUPABASE_URL`, `CARROSSEL_SUPABASE_ANON_KEY`,
`CARROSSEL_SUPABASE_SERVICE_ROLE_KEY`, `CARROSSEL_DB_PASSWORD`,
`SUPABASE_ACCESS_TOKEN_QUIZ` (management), e a conta de QA
(`CARROSSEL_QA_EMAIL` / `CARROSSEL_QA_PASSWORD` / `CARROSSEL_QA_USER_ID`). Nenhuma delas é
impressa em log, relatório ou chat — o `service_role` só existe no servidor.

**A org tinha 1 projeto, `nvmsfkpirobmupadgfcq`, INACTIVE (pausado, us-west-2).** O projeto
antigo não foi tocado.

### Risco do plano free (importa)

- A org free aceita **2 projetos ativos**; chegamos a 2. Um terceiro exige pausar/apagar
  um dos dois.
- Projeto free **pausa por inatividade** (~7 dias sem atividade). **Se pausar, o GoTrue
  pausa junto — e o login do carrossel para.** Este é o risco real: não é o banco que
  dói, é a porta de entrada.
- Free também não tem backup automático gerenciado nem SLA.

Mitigação (uma das duas, escolher):

1. **Ping periódico** — mantém o projeto acordado e detecta a pausa antes do usuário:

   ```cron
   # a cada 6h; inofensivo (health do GoTrue + 1 linha do PostgREST)
   0 */6 * * * curl -s -o /dev/null -w "%{http_code} %{time_total}\n" \
     https://sjlcyghpogetolzuoziy.supabase.co/auth/v1/health >> /var/log/carrossel-ping.log 2>&1
   ```

   Se responder algo diferente de `200`, é hora de acordar o projeto no dashboard
   (restore é manual no plano free).
2. **Upgrade para Pro** (US$ 25/mês na org): projeto não pausa, entra backup diário de 7
   dias. É o caminho quando o carrossel passar a ter usuário pagante.

## 2. Schema (`supabase/migrations/20261123120000_projetos_carrossel.sql`)

| tabela | colunas |
|---|---|
| `projetos` | `id uuid pk`, `auth_user_id uuid → auth.users on delete cascade`, `nome text`, `documento jsonb`, `token_publico uuid unique default gen_random_uuid()`, `criado_em`, `atualizado_em` |
| `perfis` | `auth_user_id uuid pk`, `marca_nome`, `marca_handle`, `marca_avatar_url`, `criado_em`, `atualizado_em` |

- **RLS ligada e forçada** nas duas: `select/insert/update/delete` com
  `auth.uid() = auth_user_id` (INSERT também com `with check`, senão daria para gravar
  linha em nome de outro).
- `anon` sem privilégio nenhum; `authenticated` com CRUD em `projetos` e leitura/escrita
  em `perfis`.
- `atualizado_em` é trigger, não campo do cliente.
- `documento` guarda o `ProjetoSalvo` do estúdio (cards, tema, template, estilo, @).
  **Os bytes das imagens ficam em disco** (`data/estudio/projetos/<id>/arquivos/`), como
  antes: 1–2 MB de base64 por capa em `jsonb` é lixo que toda consulta carrega. Consequência
  assumida: documento é durável e por usuário; imagem depende do host. Mover os bytes para
  o Storage do mesmo projeto é o passo seguinte.
- `token_publico` é o link `/p/<token>`: UUID opaco, porque o token **é** a credencial de
  quem não tem conta.

### Prova da RLS (`node scripts/prova-rls.mjs`)

```
PASS  dono lê os próprios projetos — 2 linha(s)
PASS  toda linha lida é do dono
PASS  intruso autenticado lê ZERO linha alheia — 0 linha(s)
PASS  intruso NÃO grava linha em nome do dono — HTTP 403
PASS  chave anon sem usuário não lê projetos — HTTP 401
5/5 provas passaram
```

## 3. Migração dos projetos do disco

`node scripts/migrar-projetos-supabase.mjs` → **2 projetos** migrados, id `329491ff…` e
`91210bef…`, amarrados à conta `qa.owner@autoclinic.com.br`
(`3393683c-86ed-4014-9534-86b631fa4cc3`), criada **no projeto novo** para isso.

Idempotente por `id` com `Prefer: resolution=merge-duplicates`. Duas rodadas seguidas → 2
linhas nas duas vezes (nunca 4). O `dono` antigo (UUID de cookie `estudio_dono`) é
descartado na migração: aquele dono não existe mais.

Esses dois projetos foram gerados em navegadores anônimos de teste, não por cliente
pagante — por isso a conta de QA é o dono deles.

## 4. O que saiu do caminho do AutoClinic

| antes | agora |
|---|---|
| `AUTOCLINIC_AUTH_URL` (login/refresh no GoTrue do AutoClinic) | `CARROSSEL_SUPABASE_URL` (GoTrue do projeto novo) |
| `/api/ac/*` → `:8097` (`/me`, `/carrossel/marca`, `/carrossel/carrosseis/<id>`) | removido; `/api/auth/eu`, `/api/marca`, `/api/projetos/*` |
| `/p/<token>` → API do AutoClinic | tabela `projetos` do projeto novo, por `token_publico` |
| dono = cookie `estudio_dono` | dono = `auth.uid()` |
| `useAutosaveProjeto` (autosave no AutoClinic) | removido (o editor antigo está desligado desde 22/11) |
| `/api/conteudo/gerar` autenticado por `x-interno-token` (chamado pela API do AutoClinic) | exige sessão de usuário — **a fila de conteúdo do AutoClinic não consegue mais gerar aqui**, por desenho |

`AUTOCLINIC_API_URL` e `AUTOCLINIC_AUTH_URL` saíram do `.env.local` e do `.env.example`.

## 5. Portão de login

- **Middleware**: navegação sem sessão → **307** para `/login?de=<caminho>`; qualquer
  `/api/*` (exceto `/api/auth/*` e `/api/proxy`) → **401 JSON**
  `{erro, codigo:"sem_sessao"}`. Um `fetch` que recebe página HTML vira
  `Unexpected token '<'` na tela; o JSON diz o que fazer.
- **Rotas que gastam dinheiro** (`/api/gerar`, `/api/imagem`, `/api/conteudo/gerar`) e as
  de projeto validam o token no GoTrue (`exigirSessao`) — não confiam no cookie marcador.
  Forjar `ac_sessao=1` abre a tela, **não** gera nada (provado no E2E).
- **Interface**: botões de gerar ficam desabilitados sem sessão, com uma frase e link para
  entrar ("Geração de texto e imagem é paga por uso, então só funciona com uma conta").
- O access token vai num cookie `httpOnly` `cr_sessao` — é o que autentica `<img>` dos
  cards e o download de PNG, que não mandam header. `/api/auth/sair` expira esse cookie
  (antes, sair deixava o token valendo por até 1h).

## 6. Prova ponta a ponta

`node scripts/prova-e2e-w97.mjs` (15 checagens + screenshots em `screenshots/w97/`):
deslogado → redirect com `?de=`; APIs de geração em 401 JSON; login; geração real de texto
(template sem capa por IA, para não gastar imagem); projeto salvo; **outro navegador** vê o
projeto; e log de rede sem nenhuma requisição para `:8097`, `/api/ac/`, host do auth do
AutoClinic ou o projeto Supabase antigo.
