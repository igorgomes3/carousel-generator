# Fixtures não vão para produção — e a limpeza que fechou isso

Decisão do Hermes em 23/11/2026, depois de medir o projeto definitivo: as linhas
que eu tinha migrado eram **todas fixture**, e fixture não vira dado de produção
nem amarrada ao usuário de QA. Este documento registra a classificação, a limpeza
e o que o código passou a fazer para não repetir.

## Estado final do `carroseia-prod` (medido por SQL)

```
select (select count(*) from auth.users) as usuarios,
       (select count(*) from public.projetos) as projetos;
→ [{"usuarios":1,"projetos":0}]
```

- `auth.users` = **1** (`qa.owner@autoclinic.com.br`, id `2688bfd8-…`).
- `public.projetos` = **0**, `public.perfis` = **0**.
- `auth.identities` = 1 · `auth.sessions` = 10, todas do QA (nenhuma órfã de
  usuário apagado — a remoção passou pelo Admin API, que cascateia).
- 7 políticas intactas: `projetos` (select/insert/update/delete) e `perfis`
  (select/insert/update), RLS ligada e forçada nas duas tabelas.

## Usuários apagados (15, não 7)

O Hermes viu 7; **havia 16** no total quando medi (1 QA + 15 de teste). As provas
de tela/cadastro dos últimos minutos criaram os 8 restantes. Apagados pelo
`DELETE /auth/v1/admin/users/{id}` → **HTTP 200 em todos**:

```
rt7d2a0c7fc1@teste.carroseia.com      carrossel16136d64b7@euploading.com
rt5788611601@teste.carroseia.com      carrossela25fb0a786@euploading.com
rt744473e66d@teste.carroseia.com      limite6984@euploading.com
rt2732b2cc7e@teste.carroseia.com      ui3d8c103f@euploading.com
rt644ed2a2@euploading.com             uic469c77c@euploading.com
rtb18d1208@euploading.com             uic0c6eabe@euploading.com
rt2f8ff36c@euploading.com             uid4101ed5@euploading.com
rt306b2f96@euploading.com
```

**Armadilha confirmada:** o Admin API do GoTrue **ignora** a chave nova
`sb_secret_…` — responde `200` com lista vazia, sem erro. Só a **legacy
`service_role` (JWT)**, lida em `GET /v1/projects/<ref>/api-keys?reveal=true`,
funciona em `/auth/v1/admin/users`. Apagar por SQL direto em `auth.users` deixaria
lixo em `auth.identities`/`auth.sessions`.

## Por que os 6 projetos do `carrossel-ia` são fixture

| id | nome | tema | veredito |
|---|---|---|---|
| `329491ff…` | Dia 1º, agenda vazia | "Como fidelizar seus clientes da sua clínica de estética" | **fixture** — veio do store de teste em disco (`data/estudio/projetos/`), dono era um UUID de cookie de navegador de teste; é o exemplo ruim que o Igor citou |
| `91210bef…` | Suas próximas 20 clientes | "Como consigo novas clientes para minha cliente de estética todos os dias" | **fixture** — mesmo store de teste (issue #13), com imagem de placeholder |
| `fed90de0…` | 5 erros que fazem a cliente abrir e não salvar | "…Prova W97 2026-11-23 19:30" | **fixture** — board gerado pelo meu e2e (o tema carrega o carimbo) |
| `e6e08126…` | 5 erros que fazem a cliente não salvar seu carrossel | "…Prova W97 2026-11-23 19:35" | **fixture** — idem |
| `ad958274…` | 5 erros que fazem a cliente ver e não salvar | "…Prova W97 2026-11-23 19:36" | **fixture** — idem |
| `cf7e760b…` | 5 erros que fazem ninguém salvar seu carrossel | "…Prova W97 2026-11-23 19:55" | **fixture** — idem |

Nenhum projeto real: os 6 pertencem ao QA (`3393683c-…`), que é o único usuário
não-teste do projeto antigo, e **zero clientes** existem em qualquer um dos dois
projetos. **Nada foi migrado** — o destino fica em 0.

## O código agora impede a repetição

`scripts/migrar-projetos-supabase.mjs`:

- **padrão = não escreve** (precisa `--aplicar`); antes o padrão era escrever e eu
  migrei fixture para produção duas vezes;
- **classifica cada linha** e pula fixture mesmo com `--aplicar` (só passa com
  `--incluir-fixtures`, para quem souber o que está fazendo);
- assinaturas reconhecidas: carimbo `Prova W97`/`teste` no tema, e os dois nomes
  do store de teste do issue #13.

Saída atual (nenhum real):

```
pulando 329491ff… — fixture (store de teste do issue #13) · Dia 1º, agenda vazia
pulando 91210bef… — fixture (store de teste do issue #13) · Suas próximas 20 clientes
pulando fed90de0… — fixture (carimbo de prova no tema) · 5 erros que fazem a cliente abrir e não salvar
pulando e6e08126… — fixture (carimbo de prova no tema) · …
pulando ad958274… — fixture (carimbo de prova no tema) · …
pulando cf7e760b… — fixture (carimbo de prova no tema) · …
destino: 0 projeto(s)
```

## RLS provada no projeto DEFINITIVO (8/8), sem deixar lixo

`CARROSSEL_CREDS=<creds do prod> node scripts/prova-rls.mjs` — a prova agora cria
a própria linha e apaga no fim, porque a base de produção está (corretamente)
vazia:

```
PASS  dono grava um projeto no próprio nome — HTTP 201
PASS  dono lê os próprios projetos — 1 linha(s)
PASS  toda linha lida é do dono
PASS  intruso autenticado lê ZERO linha alheia — 0 linha(s)
PASS  intruso NÃO grava linha em nome do dono — HTTP 403
PASS  chave anon sem usuário não lê projetos — HTTP 401
PASS  limpeza: a linha temporária foi apagada — 0 linha(s) no fim
PASS  limpeza: usuário intruso removido — HTTP 200
8/8 provas passaram
```

Depois da prova: `usuarios: 1`, `projetos: 0` — como deve ser.
