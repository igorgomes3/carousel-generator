# Projeto definitivo do carrossel: `carroseia-prod`

O Igor criou o projeto definitivo e a infraestrutura dele já veio pronta (schema,
políticas, usuário de QA). Este documento registra o que foi **medido**, o que foi
**feito** e o que falta — sem estimativa.

## O projeto

| item | valor |
|---|---|
| nome | `carroseia-prod` |
| ref | `wtncitzuebccdgekxxso` |
| org | `nwbjzenxwvyrtbruoyxe` — **CarroseIA** |
| região | `sa-east-1` (São Paulo) |
| status | `ACTIVE_HEALTHY` |
| plano | free (risco de pausa aceito pelo Igor) |
| credenciais | `/root/.ctxswap/contexts/carrossel/creds.json`, campos `CARROSSEL_PROD_*` |

Verificado por API, não por suposição:

```
GET /v1/projects        → wtncitzuebccdgekxxso | carroseia-prod | nwbjzenxwvyrtbruoyxe | sa-east-1 | ACTIVE_HEALTHY
GET /v1/organizations   → nwbjzenxwvyrtbruoyxe | CarroseIA
pg_policies             → 7 políticas (projetos: select/insert/update/delete; perfis: select/insert/update)
pg_class                → projetos e perfis com relrowsecurity=true e relforcerowsecurity=true
auth.users              → 1 usuário: qa.owner@autoclinic.com.br, confirmado, id 2688bfd8-8507-4785-94c0-95e3136ea46e
public.projetos         → 0 linhas (antes da migração)
```

Projeto anterior (`carrossel-ia`, `sjlcyghpogetolzuoziy`) **intacto** — é o rollback.

## Migração dos projetos

`node scripts/migrar-projetos-supabase.mjs` — origem `carrossel-ia`, destino
`carroseia-prod`, dono `2688bfd8-…` (QA do projeto novo).

**6 projetos migrados, não 2.** O pedido dizia 2 (os originais), mas a origem tinha 6:
os 4 extras são fixtures criados pelas minhas próprias provas de ponta a ponta (contam com
"5 erros que fazem…"). Migrei todos — perder trabalho não é opção — e eles podem ser
apagados em "Meus projetos" quando o Igor quiser.

Preservados: `id`, `nome`, `documento` (cards, tema, template, estilo, @), `criado_em`,
`atualizado_em` e `token_publico` (links `/p/<token>` já enviados continuam válidos).

Idempotência provada: **duas rodadas → 6 linhas nas duas** (`on_conflict=id` +
`resolution=merge-duplicates`). Depois de cada rodada o script reabre os 6 pelo id com o
token do dono: **HTTP 200 em todos**.

### Por que a migração roda como `authenticated` e não como `service_role`

O `service_role` do projeto novo **não tem GRANT** nas tabelas criadas por SQL via
Management API — o primeiro run falhou com:

```
HTTP 403 {"code":"42501","message":"permission denied for table projetos",
          "hint":"Grant the required privileges to the current role with: GRANT ... TO service_role;"}
```

Quem tem GRANT é `authenticated`, com RLS ligada. Então a cópia autentica como o dono de QA
dos dois projetos (mesma conta e senha nos dois) e grava com o token dele. **Não mexi em
GRANT nem em RLS**: além de proibido, o caminho do usuário é o mesmo que o app usa em
produção — se funciona na migração, funciona na tela.

## Env do serviço (o que muda no cutover)

`carousel-generator.service` lê `.env.local` no `WorkingDirectory`
(`/root/projects/carousel-generator-eval`). Os valores finais:

| variável | origem do valor |
|---|---|
| `CARROSSEL_SUPABASE_URL` | `https://wtncitzuebccdgekxxso.supabase.co` |
| `CARROSSEL_SUPABASE_ANON_KEY` | cofre → `CARROSSEL_PROD_ANON_KEY` |
| `CARROSSEL_SUPABASE_SERVICE_ROLE_KEY` | cofre → `CARROSSEL_PROD_SERVICE_ROLE_KEY` |
| `NEXT_PUBLIC_SUPABASE_URL` | igual à URL acima |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `_PUBLISHABLE_KEY` | cofre → `CARROSSEL_PROD_ANON_KEY` / `_PUBLISHABLE_KEY` |

O app **não** usa SDK no navegador hoje (auth é BFF: `/api/auth/*`), então os
`NEXT_PUBLIC_*` estão ali para qualquer cliente browser-side futuro — não têm efeito no
comportamento atual. `AUTOCLINIC_*` continua fora do arquivo.

**O env definitivo fica em `/root/.ctxswap/contexts/carrossel/env.prod.local` (600)** e o
cutover é um `cp` + `systemctl restart` (deploy é do Hermes, não meu):

```bash
install -m 600 /root/.ctxswap/contexts/carrossel/env.prod.local \
  /root/projects/carousel-generator-eval/.env.local
systemctl restart carousel-generator && systemctl is-active carousel-generator
```

## Config de auth do projeto novo (aplicada)

Estava com `site_url = http://localhost:3000` e `uri_allow_list` vazio — o link de
recuperação cairia em localhost. Aplicado via `PATCH /v1/projects/…/config/auth`:

- `site_url` = `https://carrossel.149-56-214-54.sslip.io`
- `uri_allow_list` = `/redefinir-senha`, `/cadastro`, `/login` (URLs exatas) + `/**` + localhost:8129
- `mailer_autoconfirm` já era `true` → "Criar conta" entra direto, e a UI **não** promete confirmação por e-mail
- `smtp_host = null` → envio pelo remetente padrão do Supabase; `rate_limit_email_sent = 2`

**Não toquei em `mailer_autoconfirm`, GRANT nem RLS.**
