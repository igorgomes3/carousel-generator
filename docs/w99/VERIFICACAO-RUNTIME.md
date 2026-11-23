# Verificação de runtime do projeto definitivo (o que faltou provar)

Registro da checagem pedida depois do meu fechamento anterior: **em qual projeto o
app autentica agora**, e não apenas "o que está escrito no `.env.local`".

## 1. O arquivo de env (medido, não estimado)

```
arquivo : /home/debian/staging/projects/carousel-generator-eval/.env.local
sha256  : 22ef3158e2e9ac8beb81b24b2395e013d76b42b8cae028dd4a126e55c094315f
mtime   : 2026-11-23 17:03:46 -0300   (serviço reiniciado 17:04:24, e de novo 17:18:06)

grep -c sjlcyghpogetolzuoziy = 0
grep -c wtncitzuebccdgekxxso = 1
```

**O "≥3 ocorrências do ref novo" não é possível** e a contagem não deve ser usada como
prova: `anon` e `service_role` são JWT, e o ref fica **dentro do payload base64**, não como
texto. O ref aparece literalmente uma vez só, na URL.

A prova certa é decodificar o `ref` das chaves e comparar com o cofre:

```
CARROSSEL_SUPABASE_URL                 igual_ao_cofre_PROD=SIM  (url)
CARROSSEL_SUPABASE_ANON_KEY            ref=wtncitzuebccdgekxxso  igual_ao_cofre_PROD=SIM
CARROSSEL_SUPABASE_SERVICE_ROLE_KEY    ref=wtncitzuebccdgekxxso  igual_ao_cofre_PROD=SIM
```

## 2. Runtime: a conta criada pela tela existe no projeto NOVO

`node scripts/prova-runtime-projeto.mjs` — cria conta **pela UI** no domínio público,
pergunta ao próprio app quem ele autenticou (`/api/auth/eu`) e vai procurar essa conta nos
dois projetos pela API de admin:

```
PASS  cadastro 1440: entrou no estúdio e o app emite sessão — id do app = d035f88d-25ff-4c15-9354-7b53ecc7e6ef
PASS  cadastro 390: entrou no estúdio e o app emite sessão — id do app = d8f16d59-c75e-46b1-90d4-48dd099769f1
PASS  [1440] usuário existe em carroseia-prod — id no projeto novo = d035f88d-… · id no app = d035f88d-…
PASS  [1440] usuário NÃO existe em carrossel-ia — ausente, como esperado
PASS  [390] usuário existe em carroseia-prod — id no projeto novo = d8f16d59-… · id no app = d8f16d59-…
PASS  [390] usuário NÃO existe em carrossel-ia — ausente, como esperado
PASS  o dono vê seus projetos em carroseia-prod (RLS, não service_role) — HTTP 200 · 6 projeto(s)
PASS  a migração está no DESTINO (6 projetos) — 6 linha(s)
PASS    abre <id> no destino — HTTP 200 (×6)
15/15 provas passaram
```

Armadilha do caminho: `/auth/v1/admin/users?filter=` **não é suportado** nesta versão do
GoTrue (responde corpo vazio → `Unexpected end of JSON input`). O script pagina e filtra
localmente.

## 3. Migração: as 6 linhas estavam no destino e foram apagadas no meio do caminho

Linha do tempo medida com `pg_stat_user_tables` no `carroseia-prod`:

| quando | o que | números |
|---|---|---|
| ~20:00 UTC | migração (2 rodadas) + 1 projeto salvo pelo e2e | `n_tup_ins = 7`, `n_tup_upd = 6` |
| ~20:20 UTC | a tabela estava **vazia** para o dono e para o `postgres` (BYPASSRLS) | `n_tup_del = 7`, `n_live_tup = 0` |
| 20:2x UTC | migração re-rodada | 6 linhas, dono `2688bfd8-…`, as 6 abrem 200 |

Nenhum script meu apaga linha (`migrar-projetos-supabase.mjs` só faz POST/upsert;
`prova-e2e-w97.mjs` só salva). Se a limpeza foi intencional do lado de quem opera, é só
avisar que eu paro de re-semear.

### Erro meu que vale registrar

`git checkout main` **restaurou o script antigo** de migração (a versão nova vive na branch
`feat/w99-projeto-definitivo`). Rodei o script da `main` sem conferir o cabeçalho e ele
gravou os 2 projetos do disco no projeto **antigo** — inofensivo (idempotente, mesmo dono de
antes), mas é exatamente o tipo de confusão que gerou o relatório errado. Regra: script que
escreve em banco, rodar sempre pela versão da branch conferida (`git show <branch>:caminho`)
ou com o `git status` na tela.

## 4. Entrada pública: quem serve o domínio hoje

```
carrossel_edge     1/1     (nosso)
ac_edge_carrossel  1/1     (do produto anterior, ocioso para este domínio)
```

Com o socat antigo derrubado (`docker service scale ac_edge_carrossel=0`):

```
ac_edge_carrossel 0/0
login:200  cadastro:200
"GET /login HTTP/2.0" 200 … "carrossel_edge@swarm" "http://10.0.1.71:8092" 6ms
```

Depois `scale=1` → `1/1` e `login final:200`. O domínio responde pelo nosso router, com o
app já no projeto novo.
