# Fase 1 — gates e o que falta

Registro da rodada de 12/11/2026. A seção "(a) a (c)" é o retrato **antes** das
correções (commits `4c8cba6`, `481d35c`, `ef7d491`). A seção final, **"Depois das
correções"**, traz os cinco consertos com a prova de cada um e o estado atual.

Estado atual: **os 45 testes do Playwright passam**, e os dez critérios da §8.1
passam — exceto a metade de servidor do item 8, que agora também está resolvida
em outro repositório (`autoclinic-comercial`, branch `feat/carrossel-gerar-teto`,
commit `d4a512b`), sem deploy.

## Gates

| Gate | Resultado |
|---|---|
| `next build` | passa |
| `next lint` | passa — 0 avisos |
| `tsc --noEmit` | 4 erros, **todos** em `src/lib/conteudo.test.ts` (pré-existentes) |
| Unit `src/lib/carrosseis/lista.test.ts` | 44 asserções, todas verdes |
| Playwright (45 testes) | 36 passam, 9 falham — 2,7 min |

## (a) Os 9 testes que falharam

Mensagens de asserção como o Playwright devolveu, não interpretação.
"Falha também na main?" medido rodando os três arquivos que já existiam na `main`
(`estilo-granular`, `marca`, `responsivo`) contra o build da `main` em `8099`:
**23 passed (41,0s)** — nenhum estava quebrado antes.

| # | Teste | Mensagem de asserção | Falha também na main? |
|---|---|---|---|
| 1 | `estilo-granular.spec.ts › regressão visual: estado inicial do editor` (l.158) | `Error: 8004 pixels diferentes (5.04%)` | não |
| 2 | `inicio.spec.ts › §8.1 › 6. a miniatura pinta a cor do slide 1` (l.180) | `miniatura × slide r (miniatura {"r":247,"g":245,"b":242} slide {"r":255,"g":255,"b":255})` — `expect(received).toBeLessThanOrEqual(expected)`: recebeu 8, esperava ≤ 2 | não (teste novo, não existia na main) |
| 3 | `inicio.spec.ts › §8.1 › 9. os quatro estados` (l.267) | `TimeoutError: page.waitForSelector: Timeout 60000ms exceeded` — `waiting for locator("[data-lista], [data-estado='vazio']…")` | não (teste novo) |
| 4 | `inicio.spec.ts › §8.1 › 10. axe … a 390px` (l.299) | `Alvos abaixo de 44px: [{a:Carrossel,h:22,w:22},{button:Sair,h:44,w:41},{button:Selecionar…,h:16,w:16} ×3]` | não (teste novo) |
| 5 | `marca.spec.ts › slide novo nasce com o nome e o @ da organização` (l.23) | `expect(locator).toBeVisible() failed` … `element(s) not found` em `slide.getByText(MARCA_MOCK.nome)` | não |
| 6 | `responsivo.spec.ts › tela inicial sem estouro horizontal em 360px` (l.46) | `expect(await estouroHorizontal(page)).toBe(0)` — recebeu 603 | não |
| 7 | `responsivo.spec.ts › … em 390px` (l.46) | idem — recebeu 603 | não |
| 8 | `responsivo.spec.ts › … em 768px` (l.46) | idem — recebeu 603 | não |
| 9 | `responsivo.spec.ts › tela inicial em 390px: todo controle do chrome tem 44×44` (l.89) | `Alvos abaixo de 44px: [{button:Sair,h:44,w:41},{button:Selecionar…,h:16,w:16} ×3]` | não |

**Todos os 9 são meus.** Nenhum é pré-existente.

- #1 e #5 quebraram porque `abrirEditorLimpo` mudou de `/` para
  `/carrossel/<id>/editar` e passou a carregar o documento real em vez do
  documento padrão.
- #6, #7, #8 e #9 são da tela nova: os testes antigos mediam a galeria
  `/projetos`, que deixou de existir.
- #2, #3 e #4 são testes novos desta fase.

## (b) Os 10 critérios da §8.1

| # | Critério | Estado |
|---|---|---|
| 1 | `/` responde 200 com sessão; sem sessão vai para `/login?de=/` | passa |
| 2 | `/projetos` responde 301 para `/` | passa |
| 3 | `/?projeto=<id>` responde 301 para `/carrossel/<id>` | passa |
| 4 | Nenhum "projeto" visível em `/`, `/carrossel/<id>`, `/sinais`, `/configuracoes` | passa (varredura de DOM) |
| 5 | 3 `aguardando_aprovacao` + 2 `aprovada` → aba "Para aprovar" mostra 3 e só eles | passa na tela (fixture 3+2). SQL real da produção: `pronta=1`, nenhum outro estado |
| 6 | Miniatura = cor do slide 1 do documento (pixel, tolerância 2/255) | não passa — 8/255 de diferença: o editor renderiza branco, a miniatura pinta `#f7f5f2` |
| 7 | Busca por palavra que só existe na legenda devolve o carrossel | passa |
| 8 | 4ª geração no dia com `max_por_dia=3` responde 409 e a tela mostra a mensagem | não passa — a tela mostra a mensagem (teste com 409 mockado), mas a API não tem a rota nem o teto como 409 |
| 9 | Os quatro estados via `?estado=vazio\|carregando\|erro` | não passa — teste vermelho por timeout de hidratação; os estados são alcançáveis à mão (screenshot) |
| 10 | axe sem violação `critical`/`serious` em `/` a 390 e 1280 | não passa — 1280 verde; 390 com alvo de toque < 44 px |

## (c) O que falta de código

**Abas** — prontas (quatro abas sobre os seis estados, contagem por aba,
`aria-pressed`). Nenhum item pendente.

**Busca** — pronta (título, legenda e hashtags; debounce de 300 ms; `?q=` na
URL). Falta: rodar no servidor — a API em `cf717c1` não aceita `?q=`, então o
filtro acontece no cliente sobre o teto de 200 linhas da própria API.

**Filtros** — abas e chips de estado exato prontos. Faltam os controles de
`?fonte=` e de `?de=`/`?ate=`: o parser e o filtro existem, mas a tela não
mostra o controle porque nenhum carrossel traz `fonte` nem `publicada_em` hoje.

**Ações em lote** — seleção, barra de seleção, `Excluir N` (dois passos com o
texto do cartão) funcionam. `Aprovar N` e `Marcar publicado` chamam a rota
prevista e, recebendo 404, mostram a faixa com o motivo — falta a rota na API
(`POST /carrosseis/aprovar` e a transição de `publicada_em`). `Baixar N (ZIP)`
está desabilitado com o motivo no `title`: depende do render de cada slide no
servidor (fase 5).

**Quatro estados** — os quatro existem e renderizam (vazio, carregando, erro,
lista), com o portão `ESTADOS_DEV`. Falta estabilizar o primeiro render de
`/?estado=carregando`, que estoura o `waitForSelector` do teste.

**Bugs de tela a corrigir**

1. Overflow horizontal medido em 603 px em 360/390/768: os dois grupos de chips
   recortam (`clientWidth 360`, `scrollWidth 998/502`), mas o
   `documentElement.scrollWidth` soma o conteúdo rolável deles.
2. Alvo de toque abaixo de 44 px em 390: o `Checkbox` do Radix é o próprio botão
   de 16 px (o `<label>` de 44 px não é o alvo medido), a marca é 22×22 e `Sair`
   tem 41 px de largura.
3. Critério 6: o fixture `tests/visual/fixtures/documento-real.json` não passa
   no `DocumentSchema`, o editor cai no `defaultValues` (branco, 5 slides) e a
   comparação de pixel não tem o que medir.
4. `abrirEditorLimpo` precisa de uma opção "sem documento" para `estilo-granular`
   e `marca` voltarem a medir o documento padrão.

---

# Depois das correções

Rodada de correção dos cinco problemas apontados. Nada de deploy.

## Gates (depois)

| Gate | Antes | Depois |
|---|---|---|
| `next build` | passa | passa |
| `next lint` | 0 avisos | 0 avisos |
| `tsc --noEmit` | 4 erros em `conteudo.test.ts` | **os mesmos 4**, nenhum novo |
| Unit `lista.test.ts` | 44/44 | 44/44 |
| Playwright (45) | 36 passam / 9 falham (2,7 min) | **45 passam / 0 falham (1,7 min)** |
| `apps/api` (outro repo) | 2 suítes | + `geracao.test.ts`, 30 asserções, `tsc` limpo |

## Os cinco consertos, com a prova

### 1. Overflow horizontal — 603 px em 360/390/768 → 0

Causa medida: os grupos de chips são faixas roláveis (`clientWidth 316`,
`scrollWidth 954`) e o Chromium soma o conteúdo delas ao `scrollWidth` do
documento **mesmo com `overflow: hidden`** no grupo (`comHidden` continuava 963).
`overflow-x: clip` no `html`/`body` também não muda a medição — ele impede a
rolagem, não o cálculo.

Conserto: `contain: paint` nas duas faixas (`controles.tsx`), que tira a caixa da
conta de overflow do documento, mais `min-w-0`/`overflow-x-clip` no `main` e na
raiz da tela. Prova:

```
overflow 360: doc=0 body=0
overflow 390: doc=0 body=0
overflow 768: doc=0 body=0
```

E no teste que já existia: `responsivo › tela inicial sem estouro horizontal em
360px` · `390px` · `768px` — **3 passed**. (Antes: 603/573/195.)

### 2. Alvos de toque < 44 px a 390 → todos ≥ 44

Três culpados, três consertos sem engordar o desenho:

| Alvo | Antes | Depois |
|---|---|---|
| Checkbox do cartão | `button` de 16×16 (o Radix é o próprio alvo; o `<label>` de 44 px não conta) | `button role="checkbox"` de **44×44** com a caixinha de 16 px dentro, `aria-hidden` |
| Marca na nav | 22×22 | `size-11` (44×44) no mobile, `md:size-auto` |
| `Sair` | 44×41 | `min-w-11` (44×44) |

Prova: `alvo de toque no mobile › tela inicial em 390px: todo controle do chrome
tem 44×44` — **passed**; e `§8.1 › 10. axe` a 390 px — **passed**.

### 3. Miniatura ≠ cor do slide 1 → comparação dentro de 2/255

Duas causas, não uma:

1. `tests/visual/fixtures/documento-real.json` não validava: `config.brand.avatar`
   vinha sem `source.type` (o schema exige `URL|UPLOAD|GENERATED`). O fixture foi
   regravado com o avatar **igual a `DEFAULT_IMAGE_INPUT`**, copiado do código, e
   agora `DocumentSchema.parse` devolve `slides: 3`, `fundo: #f7f5f2`.
2. A miniatura não era 4:5: com `align-items: stretch` do flex, ela esticava até
   a altura da coluna de texto (78 × **107**, razão 0,729 em vez de 0,8). Com
   `self-start` ela volta a 78 × 97,5.

Prova: `§8.1 › 6. a miniatura pinta a cor do slide 1` — **passed**: miniatura
`{247,245,242}` × slide do editor `{247,245,242}`, diferença 0 por canal, e
proporção 4:5 dentro de 0,02.

### 4. `max_por_dia` sem 409 → rota com teto (outro repositório)

Repositório `/home/debian/staging/repos/autoclinic-comercial`, worktree
`/root/wt-api-fase1`, branch `feat/carrossel-gerar-teto` a partir de `cf717c1`,
commit `d4a512b`. Sem deploy.

- `POST /api/carrossel/carrosseis/<id>/gerar`: o teto é checado **antes** de
  chamar o gerador — teto que barra depois de gastar token não protege nada;
- 409 com `{ erro: "Limite diário atingido: 3 gerações por dia (max_por_dia = 3). Já foram usadas 3 hoje.", limite, usadas, restantes: 0 }`;
- a contagem do dia sai de `carrossel_versoes` com `motivo = 'geracao'`, na
  janela de `America/Sao_Paulo`; a geração bem-sucedida grava essa versão;
- `max_por_dia` torto (`0`, negativo, `NaN`) sobe para 1 em vez de virar passe
  livre; falha do gerador é **502**, não 409 (o teto não foi atingido);
- `apps/api/src/geracao.test.ts`: 30 asserções — quarta geração **409** com o
  motivo, e geração dentro do teto **200** (`estado: pronta`, `usado 2 de 3`,
  versão gravada). `npx tsx apps/api/src/geracao.test.ts` → `tudo certo`.

Pendência honesta: a rota está provada por teste, **não** por requisição real —
a API em produção roda `cf717c1` e só recebe esta rota quando o deploy for feito.

### 5. Estado de carregamento instável → primeiro render determinístico

Causa real: não era hidratação. O helper `abrirLista` esperava por
`[data-lista], [data-estado='vazio'|'vazio-aba'|'vazio-busca'|'erro']` — **sem**
`[data-estado='carregando']`. Em `/?estado=carregando` o esqueleto era o único
estado na tela, então a espera nunca satisfazia e o teste estourava em 30/60 s.

Prova de que o esqueleto já sai no HTML do servidor (nada depende de efeito):

```
curl -H "Cookie: ac_sessao=1" "http://127.0.0.1:8100/?estado=carregando" | grep -o 'data-estado="carregando"'
→ data-estado="carregando"
```

Conserto: o seletor do helper passou a incluir o estado de carregamento; e o
`?estado=` é lido em `runtime` (`force-dynamic` + `ESTADOS_DEV`), não no build.
Prova: `§8.1 › 9. os quatro estados: vazio, carregando, erro e lista` — **passed**
(seis esqueletos, faixa de erro com `Tentar de novo`, vazio de organização e
vazio de aba).

## Os 9 testes, um por um

| # | Teste | Antes | Depois |
|---|---|---|---|
| 1 | `estilo-granular › regressão visual: estado inicial do editor` | 8004 px diferentes (5,04%) | **passed** (baseline volta ao documento padrão, com marca) |
| 2 | `inicio › 6. a miniatura pinta a cor do slide 1` | miniatura 247,245,242 × slide 255,255,255 | **passed** (0 por canal, 4:5) |
| 3 | `inicio › 9. os quatro estados` | Timeout 60000 ms no `waitForSelector` | **passed** |
| 4 | `inicio › 10. axe a 390px` | alvos de 16 px (checkbox) e 22 px (marca) | **passed** |
| 5 | `marca › slide novo nasce com o nome e o @ da organização` | `element(s) not found` | **passed** (2 testes do arquivo) |
| 6 | `responsivo › estouro horizontal em 360px` | recebeu 603 | **passed** |
| 7 | `responsivo › estouro horizontal em 390px` | recebeu 603 | **passed** |
| 8 | `responsivo › estouro horizontal em 768px` | recebeu 603 | **passed** |
| 9 | `responsivo › alvo de toque em 390px` | 3 alvos de 16 px e `Sair` 41 px | **passed** |

Suíte cheia depois: **45 passed (1,7m)**.

## Os 10 critérios da §8.1 (depois)

| # | Critério | Antes | Depois |
|---|---|---|---|
| 1 | `/` 200 com sessão; `/login?de=/` sem | passa | **passa** |
| 2 | `/projetos` 301 → `/` | passa | **passa** |
| 3 | `/?projeto=<id>` 301 → `/carrossel/<id>` | passa | **passa** |
| 4 | Nenhum "projeto" visível nas 4 rotas | passa | **passa** |
| 5 | Aba "Para aprovar" conta 3 e só eles | passa (tela, fixture) | **passa** |
| 6 | Miniatura = cor do slide 1 (2/255) | não passa | **passa** |
| 7 | Busca por palavra só na legenda | passa | **passa** |
| 8 | 4ª geração responde 409 e a tela mostra | não passa | **passa na tela** (mock 409) e **passa no servidor** (rota + teste na API, sem deploy) |
| 9 | Quatro estados via `?estado=` | não passa | **passa** |
| 10 | axe sem `critical`/`serious` em 390 e 1280 | não passa (390) | **passa nos dois** |

## O que segue pendente (não é regressão, é fase)

- `Aprovar N` e `Marcar publicado` em lote: a API ainda não tem
  `POST /carrosseis/aprovar` nem a transição de `publicada_em`.
- `Baixar N (ZIP)`: depende do render no servidor (fase 5). Botão desabilitado
  com o motivo no `title`.
- Busca, ordenação, filtros e paginação rodam no cliente sobre a resposta única
  da API (teto de 200 linhas dela): a API não aceita `?q=`/`?estado=`/`?ordenar=`.
- Controles de `?fonte=` e `?de=/&ate=` existem no parser e no filtro, mas a tela
  não mostra o controle porque nenhum carrossel traz `fonte` nem `publicada_em`.
