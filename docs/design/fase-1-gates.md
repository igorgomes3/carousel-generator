# Fase 1 — gates e o que falta

Registro da rodada de 12/11/2026. Conteúdo copiado do relatório entregue ao CEO,
sem reescrita da análise. Commits desta rodada: `4c8cba6` (código + docs),
`481d35c` (screenshots), este arquivo no commit seguinte.

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
