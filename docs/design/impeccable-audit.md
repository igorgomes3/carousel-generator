# Impeccable audit — Carrossel AutoClinic

> **Como esta rodada rodou.** Motor `impeccable 4.8.2` (binário do launcher em
> `/root/.hermes/skills/impeccable/scripts/impeccable`). `impeccable context` não existe
> nesta versão do binário (`detect`, `ignores`, `install`, `link`, `update`, `check`,
> `telemetry`, `login`, `logout`, `whoami`, `health`, `help`), então o carregamento de
> contexto não rodou: `PRODUCT.md` e `DESIGN.md` foram escritos à mão pelos playbooks e o
> resto do contexto veio da leitura direta do repositório.
>
> **Todos os números abaixo são desta rodada.** Nada foi copiado de documento anterior.
>
> Servidor medido: build de produção (`pnpm build` → `pnpm start -- --port 4331`), porque a
> varredura de URL contra `next dev` (porta 4330) devolve **zero achados em qualquer
> página** — inclusive numa página de teste com gradiente roxo, glow e texto cinza em fundo
> colorido. É falha de varredura, não limpeza: o `networkidle` nunca fecha no dev por causa
> do websocket de HMR. Registro isso porque "0 achados" no dev é falso negativo silencioso.
>
> Rotas e viewports medidos: `/` (editor) 1280×800 e 390×844 · `/fila` 1280×800 ·
> `/projetos` 1280×800 e 390×844 · `/login` **falhou** (ver abaixo).
>
> A varredura de arquivos (`impeccable detect src`) devolve `[]` — e isso **não** quer dizer
> limpo: o app estiliza com classes Tailwind, e o motor de arquivo não lê utilitário
> Tailwind. A varredura que vale aqui é a de URL, feita com um perfil de navegador
> semeado com sessão real (o middleware do app manda para `/login` sem o cookie).

## Audit Health Score

| # | Dimensão | Nota | Achado principal |
|---|----------|------|------------------|
| 1 | Accessibility | 2 | 26 trechos de texto funcional em 10 px e contraste 3,7:1 / 3,8:1 medidos no editor e na fila |
| 2 | Performance | 3 | Export renderiza slides em paralelo e evita download em série; custo real é o bundle do editor (9 famílias de fonte declaradas) |
| 3 | Theming | 2 | Tokens gerados a partir de `design-tokens.json` e usados de verdade, mas o tema escuro existe em `tokens.css:32` e **nenhum** componente usa `dark:` |
| 4 | Responsive Design | 2 | A galeria rola para o lado em 390 px (card 129 px além da borda direita, medido) |
| 5 | Implementation Integrity | 2 | Dois vocabulários (chrome em inglês + produto em pt-BR), card dentro de card, três padrões de estado ativo |
| **Total** | | **11/20** | **Acceptable (10–13) — trabalho significativo necessário** |

## Implementation Integrity Verdict

**Reprovado como sistema de produto.** A implementação é coerente como *shadcn/ui padrão* e
incoerente como *produto AutoClinic*: o chrome do editor veio do projeto open-source de
origem e nunca foi traduzido nem rebrandeado, a marca que o operador publica nasce como
`My name` / `@name`, e os painéis novos (Sugestões, Plano) foram colados com raio, sombra e
tipografia próprios.

Evidência determinística desta rodada (motor 4.8.2):

| Rota | Viewport | Achados | Composição |
|---|---|---|---|
| `/` editor | 1280×800 | **32** | 30 warning, 2 advisory — `undersized-ui-text` 26, `low-contrast` 3, `nested-cards` 1, `straggler` 2 |
| `/` editor | 390×844 | **30** | 30 warning — `undersized-ui-text` 26, `low-contrast` 3, `nested-cards` 1 |
| `/fila` | 1280×800 | **16** | 10 warning, 6 advisory — `undersized-ui-text` 6, `unbalanced-heading` 4, `line-length` 2, `straggler` 2, `low-contrast` 1, `flat-type-hierarchy` 1 |
| `/projetos` | 1280×800 | **0** | — |
| `/projetos` | 390×844 | **1** | `body-text-viewport-edge` (rolagem lateral) |
| `/login` | 1280 e 390 | **não medido** | `Navigation timeout of 30000 ms exceeded`, duas tentativas em cada viewport |

`/login` é a única rota que falhou de forma reprodutível: o detector carrega a página, a
navegação não fecha em 30 s e ele devolve vazio. Não trato como limpo. A tela foi avaliada
visualmente (`docs/design/atual/login-*` não existe; a captura está em
`docs/design/atual/galeria-vazia-*` e no fluxo de logout) e por código
(`src/app/login/page.tsx`).

## Achados detalhados

### P0 / P1

**[P1] Um 401 em qualquer chamada encerra a sessão e joga a tela em `/login`**
- **Local:** `src/lib/auth/sessao.ts:133-136` — depois de uma tentativa de renovação,
  `if (res.status === 401) { sair(); ... }`. Quem redireciona: `src/app/projetos/page.tsx:84-86`
  e `src/app/fila/page.tsx:159-161` (`garantirSessao()` falso → `router.replace("/login?de=…")`).
- **Reproduzido nesta rodada:** com um refresh token já rotacionado por outra sessão da
  mesma família (o GoTrue do AutoClinic rotaciona a cada uso), um F5 em `/projetos` cai em
  `http://localhost:4330/login?de=/projetos` — captura em `docs/design/atual/bug-401-f5.png`.
- **Impacto:** o operador perde a navegação e a explicação. Pior: `sair()` **apaga o refresh
  token** antes de saber se a sessão morreu de verdade — um 401 de permissão numa rota
  isolada derruba o login inteiro.
- **Categoria:** Implementation Integrity / Error Recovery.
- **Recomendação (uma linha):** encerrar a sessão só quando o refresh for recusado pelo
  GoTrue (400/401 no `/api/auth/refresh`) e devolver o 401 de rota comum como erro da tela,
  mantendo o token — exatamente a regra que o painel do AutoClinic já aplica em
  `apps/painel/src/lib/sessao.ts`.
- **Comando sugerido:** `/impeccable harden`.

**[P1] Texto funcional em 10 px e contraste abaixo de AA**
- **Local:** `src/app/projetos/page.tsx` (etiqueta `link ativo`: `text-[10px] uppercase
  tracking-wide`), `src/components/sugestoes-panel.tsx` (nota e metadados), `src/app/fila/page.tsx`
  (chips e `Descartar` em vermelho).
- **Medido:** 26 nós com texto de 10 px abaixo do piso de 11 px no editor (1280 e 390), 6 na
  fila; contraste 3,7:1 (`#81848b` sobre `#ffffff`) no painel de sugestões e 3,8:1
  (`#ef4444` sobre `#ffffff`) em `Descartar`.
- **WCAG:** 1.4.3 (AA, 4.5:1) e 1.4.4 (redimensionamento de texto).
- **Recomendação:** piso de 11 px para texto funcional e trocar `text-muted-foreground` por
  `foreground/70` onde o fundo é branco; vermelho de `Descartar` sobe para `#b91c1c`.
- **Comando sugerido:** `/impeccable typeset` + `/impeccable colorize`.

**[P1] A galeria rola para o lado em 390 px**
- **Local:** `src/app/projetos/page.tsx` — a linha de ação `<div className="flex gap-2">` com
  `<Input className="w-56">` + botão não quebra (`flex-wrap` ausente), e o card herda a
  largura inflada.
- **Medido:** `body-text-viewport-edge` — `div.rounded-xl.border.bg-card.p-4` alcança 129 px
  além da borda direita em 390 px. Confirmado na captura `docs/design/atual/galeria-390.png`
  (borda direita do card não aparece).
- **Recomendação:** `flex-wrap` na linha de ação, `w-full sm:w-56` no input, `min-w-0` no card.
- **Comando sugerido:** `/impeccable adapt`.

### P2

**[P2] Card dentro de card** — `nested-cards`, 1 ocorrência no editor (1280 e 390): o card
de pauta do painel de sugestões traz outro contêiner com borda dentro. `src/components/sugestoes-panel.tsx`.

**[P2] Hierarquia tipográfica achatada na fila** — `flat-type-hierarchy`: corpo 14 px,
h2 14 px, h3 16 px, h1 18 px; maior degrau adjacente 1,14:1 (alvo 1,25:1). O título da
página, o título da pauta e o corpo têm quase o mesmo tamanho.

**[P2] Linha longa demais na fila** — `line-length`: ~130 caracteres em 2 de 3 linhas no
texto de ajuda do filtro (`src/app/fila/page.tsx`), acima do alvo de 80.

**[P2] Títulos desbalanceados** — `unbalanced-heading`: última linha com 18% da largura da
anterior em 4 títulos de pauta. Falta `text-wrap: balance`.

**[P2] Tema escuro morto** — `src/app/tokens.css:32` define `.dark` com 19 variáveis e
`tailwind.config.js` declara `darkMode: ["class"]`, mas `grep -rn "dark:" src` devolve **0**.
Ou o tema é suportado de verdade, ou as variáveis saem do arquivo gerado.

### P3

**[P3] Dois fundos empilhados no canvas** — `src/components/slides-editor.tsx:70` aplica
`bg-primary/10` sobre `bg-muted/20` no contêiner do canvas, produzindo um lilás sujo que não
está em nenhum token.

**[P3] `straggler`** — 2 ocorrências no editor e 2 na fila: palavra órfã na última linha de
um parágrafo. `text-wrap: pretty` no corpo resolve.

## Padrões e problemas sistêmicos

1. **Vocabulário duplo.** Inglês no chrome do editor (`File`, `Brand`, `Theme`, `Fonts`,
   `Numbers`, `My Carousel File`, `YOUR TITLE`, `Your awesome subtitle`, `My name`, `@name`),
   português no produto (galeria, fila, sugestões, plano). Não é detalhe de tradução: é a
   diferença entre "ferramenta que alguém montou" e "produto que o Clécio vende".
2. **Estado ativo com três gramáticas.** Rail do editor = card elevado; segmento URL/Upload =
   tint; chip da fila = pílula escura. Nenhuma regra escrita escolhe uma.
3. **Painéis flutuantes fora do sistema.** Sugestões e Plano usam `shadow-lg`, raio 12 px e
   tipografia própria sobre o canvas — e no mobile o FAB `+` sobrepõe o cabeçalho do painel.
4. **Nada mostra a peça.** A galeria é só texto: para saber o que é o carrossel é preciso
   abrir. Um gerador de imagem sem miniatura é um gerador que o operador não confia.

## Achados positivos

- **Autosave + versões + restaurar** é o que separa este produto de um editor de brinquedo.
  O comentário em `src/lib/hooks/use-autosave-projeto.ts` mostra que a decisão foi tomada com
  a dor na mão (debounce, um PATCH por vez, flush na aba oculta).
- **Acessibilidade acima da média para um fork:** `tests/visual/acessibilidade.spec.ts` roda
  axe com portão em `critical`/`serious`, e os controles só de ícone do editor **têm**
  `aria-label` (`src/components/pager.tsx:28-56`, `src/components/element-menubar-wrapper.tsx:57-109`).
- **Tokens gerados, não copiados:** `design-tokens.json` → `scripts/build-tokens.mjs` →
  `src/app/tokens.css`, com comentário proibindo `:root` duplicado em `globals.css`.
- **`/projetos` em 1280 é limpo no detector** (0 achados) — a tela mais bem resolvida do app.

## Ações recomendadas

1. **[P1] `/impeccable harden`** — sessão: só encerrar quando o refresh é recusado; 401 de
   rota comum vira erro local.
2. **[P1] `/impeccable adapt`** — galeria em 390 px: quebrar a linha de ação, matar a
   rolagem lateral.
3. **[P1] `/impeccable typeset`** — piso de 11 px e contraste AA no texto funcional.
4. **[P2] `/impeccable layout`** — hierarquia da fila (1,14:1 → ≥1,25:1) e medida de linha.
5. **[P2] `/impeccable clarify`** — chrome do editor em pt-BR e marca vinda da organização.
6. **[P3] `/impeccable polish`** — fechar o que sobrar.

Você pode pedir para rodar uma de cada vez, todas de uma vez, ou na ordem que preferir.
Rodar `/impeccable audit` de novo depois dos consertos mostra a nota subir.
