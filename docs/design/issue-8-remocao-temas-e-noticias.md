# Issue #8 — remover temas e Google News sem quebrar carrosséis salvos

Issue: https://github.com/igorgomes3/carousel-generator/issues/8
Base: `feat/clone-carrosseia` (issue #10 / PR #10), que já entregou o estúdio do
CarrosseIA e removeu a tela `/sinais`.
Branch deste trabalho: `hermes-subagent/subagent-work-default-w83-61f377`.

## 1. O que já estava feito quando esta branch começou

| item | estado na base | evidência |
|---|---|---|
| tela `/sinais` (fila por notícia) | removida | `docs/rea/NOSSO-CODIGO.md` linha 47; `git log --stat` mostra os 759 linhas apagadas |
| seletor de tema no inspetor do editor | removido | `src/components/settings-panel.tsx` — comentário no lugar da seção |
| paleta por tema na geração | mantido como dado | `src/lib/themes.ts` + `src/lib/pallettes.tsx` ainda no repo, sem uso na UI |
| painel de pauta por notícia no editor | **vivo** | `src/components/sugestoes-panel.tsx` renderizado por `src/components/slides-editor.tsx` |

Ou seja: a issue ainda tinha dois buracos reais — código morto de tema (com o risco de
voltar pela porta dos fundos) e o **último caminho de notícia para dentro do produto**,
que era o painel “Sugestões para aprovar” lendo `/conteudo/fila` da API do AutoClinic.

## 2. Mapa: onde o tema aparecia

### Modelo de dados (documento do carrossel, `jsonb` no banco da API)

| campo | tipo | papel |
|---|---|---|
| `config.theme.pallette` | text | **nome da paleta daisyUI** (`black`, `aqua`, `olivia`…). Era só rótulo: a cor nunca foi resolvida pelo nome. |
| `config.theme.primary/secondary/background` | text `#RRGGBB` | as cores de verdade, gravadas em cada documento |
| `config.theme.isCustom` | bool | marca se a paleta foi escolhida à mão |
| `config.theme.backgroundStyle` | text | slug do fundo (`solido`, `papel`, `grade`…) |
| `config.fonts.font1/font2/elementFonts` | text | id de fonte do `fontsMap` (`DM_Sans`, `DM_Serif_Display`, `GeistSans`, `ArchivoBlack`) |
| (elemento) `color`, `fontFamily`, `fontWeight` | text | estilo por elemento |

Não há tabela de temas no banco. **Tema nunca foi entidade de banco** — é campo do
documento, e é por isso que "remover temas" não pede migração (ver §5).

### Código

| arquivo | o que era |
|---|---|
| `src/lib/themes.ts` | catálogo de 25+ paletas daisyUI (411 linhas) |
| `src/lib/pallettes.tsx` | paleta → `{primary, secondary, background}` |
| `src/lib/theme-utils.ts` | `generateForegroundColorFrom` via `culori` |
| `src/components/forms/theme-form.tsx` | o seletor de paleta (radio group) |
| `src/components/color-theme-display.tsx` | amostra de cor do seletor |
| `src/lib/design-automatico.ts` | escolhia paleta por tom — agora escolhe cor por tom |
| `src/lib/validation/theme-schema.tsx` | schema do `config.theme` |

### Onde o Google News entrava

| onde | como |
|---|---|
| `src/app/sinais/page.tsx` | tela da fila de pautas por notícia — **já removida na base** |
| `src/components/sugestoes-panel.tsx` | painel no editor: lia `GET /conteudo/fila` (pauta com `sinal_titulo`/`sinal_url`), pedia briefing e gerava |
| `src/app/api/conteudo/gerar/route.ts` | rota interna (`x-interno-token`) que a fila do AutoClinic chama para gerar o documento |
| `docs/design/PLANO-UI-CARROSSEL.md` §fontes | plano de coleta: Google News RSS + Google Trends BR, 08:00, `conteudo_fontes.origem = google_news` |
| `PRODUCT.md` | descrevia a pauta como "notícia ou tendência do setor" |

O coletor em si (job que lê `news.google.com/rss`) **não está neste repositório**: vive
na API do AutoClinic (`AUTOCLINIC_API_URL`, default `http://100.87.192.48:8097`). Este
repo só consumia o resultado.

## 3. O que mudou

### 3.1 Removido (UI e código morto)

- `src/components/sugestoes-panel.tsx` — apagado; saiu do `slides-editor.tsx`. Era o
  último caminho de notícia para dentro da tela.
- `src/components/forms/theme-form.tsx`, `src/components/color-theme-display.tsx`,
  `src/lib/pallettes.tsx`, `src/lib/themes.ts`, `src/lib/theme-utils.ts` — apagados. Nada
  importava nenhum deles fora do próprio grupo.
- `src/lib/design-automatico.ts` — deixou de referenciar nome de paleta; as cores eram
  literais desde sempre, o nome era rótulo. `motivo` agora diz "paleta preto" em vez de
  "paleta black".

`src/app/api/conteudo/gerar/route.ts` **ficou**: é contrato com a API do AutoClinic
(segredo `x-interno-token`), não é caminho de usuário. Removê-la quebraria o backend antes
de o backend ser mudado — e isso é uma decisão do dono da API, não deste PR.

### 3.2 Fonte de pauta nova: tema livre + "Minhas pautas"

`src/lib/estudio/pautas-salvas.ts` (novo): lê, adiciona e remove pautas salvas pelo
próprio usuário, no `localStorage` (`carrossel:pautas-do-usuario`, máx. 8, dedupe sem
caixa, teto de 400 caracteres por pauta).

`src/components/estudio/estudio.tsx`: a seção "Minhas pautas" ficou dentro do card do
passo 1 — chips que preenchem o campo de tema, botão "+ Guardar esta ideia" e "×" por
chip. O texto do passo 2 parou de prometer leitura de link de matéria (o `/api/gerar`
nunca leu link) e passou a pedir gancho.

Por que `localStorage` e não tabela: o requisito é "a opção mais simples para leigo". Sem
conta nova, sem endpoint novo, sem migração, funciona offline, e não há nada para o
backend quebrar. O custo é conhecido e está escrito no arquivo: pauta salva em um
navegador não aparece em outro. Quando isso incomodar, o próximo passo é
`POST /conteudo/pautas` na API — e aí sim há migração.

### 3.3 Compatibilidade: carrossel salvo abre sempre

Três defeitos reais de "abrir peça salva", todos corrigidos:

1. **Documento descartado por um campo.** `document-provider.tsx` fazia
   `DocumentSchema.safeParse(documento)` e, ao falhar, caía no documento **padrão** — o
   carrossel do usuário abria em branco. Agora todo documento salvo passa por
   `normalizarDocumento()` (`src/lib/compat/documento-salvo.ts`), que preenche campo por
   campo: cor não-hex (`oklch()`, `rgba()`) → cor padrão; fonte que não existe neste
   build → fonte padrão; `config` ausente → padrão; elemento com estilo inválido → perde
   o estilo e **mantém o texto**.
2. **Crash por fonte desconhecida.** `fontIdToClassName(fontId)` fazia
   `fontsMap[fontId].className` direto. Documento salvo com fonte aposentada derrubava o
   editor inteiro com `Cannot read properties of undefined`. Agora há `fonteConhecida()` e
   a função devolve classe vazia em vez de estourar.
3. **Rascunho local apagado.** `use-persist-form.tsx` chamava `localStorage.clear()` quando
   o rascunho não batia com o schema — apagando junto o token de refresh e qualquer outra
   chave do produto. Agora o rascunho é normalizado, não apagado.

`config.theme.pallette` continua no schema (`z.string().default("black")`), documentado
como **legado**. Quem tem `pallette: "aqua"` num carrossel salvo vê a peça igual: a cor
sempre veio de `primary/secondary/background`, nunca do nome.

Testes: `npx tsx src/lib/compat/documento-salvo.test.ts` (27 asserções, 27 verdes) e
`npx tsx src/lib/estudio/pautas-salvas.test.ts` (20 asserções, 20 verdes).

### 3.4 Migração de banco

**Nenhuma migração é necessária, e nada foi apagado.**

- `config.theme.pallette` é campo de `jsonb`, opcional na prática, sem constraint, sem
  índice e sem leitor no código. Documento antigo continua válido; documento novo nasce
  com `pallette: "black"` (default do schema) e ninguém lê.
- Não existe tabela de temas para apagar.
- `conteudo_fila` / `conteudo_fontes` (as tabelas da pauta por notícia) são da API do
  AutoClinic e não são tocadas por este PR.

**Rollback** = `git revert` do commit desta branch. Não há DDL, não há dado reescrito,
não há coluna nova: reverter devolve o painel de sugestões e os arquivos de tema, e
documentos gerados neste meio-tempo continuam abrindo (o campo `pallette` nunca saiu do
schema).

Se algum dia for preciso limpar o rótulo morto dos documentos, o script — **idempotente,
não destrutivo, rodando no repo da API** — é este, e ele copia antes de mexer:

```sql
-- 1) fotografia do que existe hoje (não altera nada)
select count(*) filter (where documento->'config'->'theme' ? 'pallette') as com_pallette,
       count(*) as total
  from carrossel_projetos;

-- 2) backup da coluna que vai ser tocada
create table if not exists carrossel_documento_backup_20261121 as
select id, documento from carrossel_projetos
 where documento->'config'->'theme' ? 'pallette';

-- 3) normaliza o rótulo legado (idempotente: rodar de novo não muda nada)
update carrossel_projetos
   set documento = jsonb_set(documento, '{config,theme,pallette}', '"black"'::jsonb)
 where documento->'config'->'theme'->>'pallette' is distinct from 'black'
   and documento->'config'->'theme' ? 'pallette';

-- rollback de 3 (só enquanto o backup existir)
-- update carrossel_projetos c
--    set documento = b.documento
--   from carrossel_documento_backup_20261121 b
--  where c.id = b.id;
```

Não rodei esse script: o banco da API não é deste repositório e eu não tenho credencial
de escrita nele. Ele está aqui como plano, não como fato consumado.

## 4. O que ficou de fora (e por quê)

| item | motivo |
|---|---|
| desligar o coletor de Google News/Trends no backend | vive no repositório da API do AutoClinic; precisa de PR lá e de acesso ao banco |
| apagar `conteudo_fila` / `conteudo_sinais` | idem, e é destrutivo: exige aviso e decisão do dono |
| `/api/conteudo/gerar` | contrato com a fila do backend; só sai quando a fila sair |
| "Minhas pautas" compartilhadas entre dispositivos | exige tabela + endpoint; hoje é `localStorage` |
| `.env` de deploy | nenhuma variável nova foi introduzida |
| deploy | fora de escopo por instrução (sem deploy nesta entrega) |

## 5. Arquivos

```
apagados
  src/components/forms/theme-form.tsx
  src/components/color-theme-display.tsx
  src/components/sugestoes-panel.tsx
  src/lib/themes.ts
  src/lib/pallettes.tsx
  src/lib/theme-utils.ts

novos
  src/lib/compat/documento-salvo.ts          normalizador de documento salvo
  src/lib/compat/documento-salvo.test.ts     27 asserções
  src/lib/estudio/pautas-salvas.ts           "Minhas pautas" em localStorage
  src/lib/estudio/pautas-salvas.test.ts      20 asserções
  docs/design/issue-8-remocao-temas-e-noticias.md

alterados
  src/components/estudio/estudio.tsx         seção "Minhas pautas" + copy do passo 2
  src/components/slides-editor.tsx           sem SugestoesPanel
  src/components/settings-panel.tsx          (na base) seção Tema já não existia
  src/lib/design-automatico.ts               paleta por cor, não por nome
  src/lib/fonts-map.tsx                      fonteConhecida() + fallback
  src/lib/hooks/use-persist-form.tsx         normaliza rascunho em vez de apagar
  src/lib/providers/document-provider.tsx    documento salvo via normalizador
  src/lib/validation/theme-schema.tsx        pallette/isCustom como legado com default
  PRODUCT.md                                 usuário, propósito, posicionamento, princípio 5
  docs/rea/NOSSO-CODIGO.md                   registro do que saiu nesta issue
  docs/design/PLANO-UI-CARROSSEL.md          nota de documento superado
```
