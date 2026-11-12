---
name: Carrossel AutoClinic
description: Editor e galeria de carrossel para Instagram, sobre shadcn/ui e tokens HSL
colors:
  background: "hsl(0 0% 100%)"
  foreground: "hsl(222.2 84% 4.9%)"
  card: "hsl(0 0% 100%)"
  primary: "hsl(222.2 47.4% 11.2%)"
  primary-foreground: "hsl(210 40% 98%)"
  secondary: "hsl(210 40% 96.1%)"
  muted: "hsl(210 40% 96.1%)"
  muted-foreground: "hsl(215.4 16.3% 46.9%)"
  accent: "hsl(210 40% 96.1%)"
  destructive: "hsl(0 84.2% 60.2%)"
  border: "hsl(214.3 31.8% 91.4%)"
  input: "hsl(214.3 31.8% 91.4%)"
  ring: "hsl(222.2 84% 4.9%)"
  canvas-sugestoes: "hsl(210 40% 96.1%)"
typography:
  display:
    fontFamily: "DM Serif Display, Georgia, serif"
    fontSize: "2rem"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "0em"
  body:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0em"
  meta:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
    fontFeature: "tabular-nums"
rounded:
  base: "0.5rem"
  lg: "0.5rem"
  md: "calc(0.5rem - 2px)"
  sm: "calc(0.5rem - 4px)"
  panel: "0.75rem"
spacing:
  row: "0.5rem"
  group: "1rem"
  section: "1.5rem"
  page: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "0 1rem"
    height: "2.5rem"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0 1rem"
    height: "2.5rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0 1rem"
    height: "2.5rem"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "0 1rem"
    height: "2.5rem"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0 0.75rem"
    height: "2.5rem"
  card-projeto:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.panel}"
    padding: "1rem"
---

# Design System: Carrossel AutoClinic

## Overview

**Creative North Star: "A prancheta de produção"**

O sistema é o shadcn/ui padrão em modo claro: superfície branca, borda de 1 px em
cinza-azulado, um único preenchimento escuro (`primary`, quase-preto azulado) para a ação
de cada tela, e nenhum acento cromático. A densidade é baixa na galeria e na fila, e
média no editor, onde três colunas disputam a mesma dobra.

A personalidade não vem de cor nem de forma: vem de **texto operacional em português**
("Salvo na conta, não no navegador", "Nada publica sozinho", "Não tem como desfazer") e
de um canvas onde o conteúdo do usuário — não a interface — é o que importa. É um sistema
de ferramenta, não de marca.

A exceção assumida: o editor ainda carrega o chrome do projeto open-source de origem
(`Carousel Generator`, `File`, `Brand`, `Theme`, `Fonts`, `Numbers`, `My Carousel File`) e
uma serifa de display (`DM Serif Display`) que só existe dentro dos slides e no título do
painel de configurações. Essa convivência é a maior dívida visual do produto.

**Key Characteristics:**
- Superfície branca, borda hairline, sombra quase inexistente (`shadow-sm` no card).
- Um preenchimento escuro por tela como ação primária; nenhum acento saturado.
- Raio único de 8 px (`--radius: 0.5rem`), com `lg`/`md`/`sm` derivados por subtração.
- DM Sans para a interface, DM Serif Display para display, e mais oito famílias
  disponíveis para o slide (Montserrat, PT Serif, Roboto, Roboto Condensed, Inter, Syne,
  Archivo Black, Ultra).
- Números em `tabular-nums` onde há versão e contagem.

## Colors

Paleta acromática com um azul-quase-preto como cor de ação. Não existe cor de marca.

### Primary
- **Tinta de ação** (`hsl(222.2 47.4% 11.2%)`): preenchimento de botão primário, chip de
  filtro ativo, wordmark. É a única cor de peso na tela.

### Neutral
- **Papel** (`hsl(0 0% 100%)`): fundo de página, cards, popovers.
- **Papel frio** (`hsl(210 40% 96.1%)`): `secondary`/`muted`/`accent` — o mesmo valor nos
  três papéis; fundo do canvas do editor, hover de botão ghost, fundo de chip inativo.
- **Cinza de apoio** (`hsl(215.4 16.3% 46.9%)`): texto secundário, metadados, placeholder.
  É o token com o pior contraste do sistema (ver Do's and Don'ts).
- **Régua** (`hsl(214.3 31.8% 91.4%)`): toda borda e todo contorno de input.
- **Sangue** (`hsl(0 84.2% 60.2%)`): `destructive` — excluir de vez, revogar link,
  descartar pauta. Usado em botão preenchido e em texto vermelho.

### Named Rules
**A Regra do Papel.** Nenhuma cor saturada decora. A única cor com peso é a tinta de ação,
e ela aparece no máximo uma vez por região da tela. Cor de status (âmbar, esmeralda, azul)
existe apenas em etiqueta de estado — `link ativo`, `rascunho`, `aprovado`, `publicado`.

## Typography

**Display Font:** DM Serif Display (com Georgia, serif)
**Body Font:** DM Sans (com system-ui, sans-serif)
**Label/Mono Font:** não há; números usam DM Sans com `tabular-nums`

**Character:** DM Sans é neutra e limpa, boa em 12–14 px. A serifa aparece só no título do
painel de configurações e dentro do slide, onde ela é escolha do usuário — não é voz da
interface.

### Hierarchy
- **Display** (400, 2rem, 1.1): título do painel de configurações (`Brand`, `Theme`).
- **Headline** (600, 1.5rem, 1.2): `Meus carrosséis`, `Fila de conteúdo`.
- **Title** (600, 1rem, 1.3): título do card de projeto e título da pauta.
- **Body** (400, 0.875rem, 1.5): texto corrente e descrições de tela.
- **Label** (500, 0.75rem, 1.4): metadados, contadores, rótulos de campo. Nunca em caixa
  alta além de etiqueta de estado (`text-[10px] uppercase tracking-wide`).

### Named Rules
**A Regra do Número Alinhado.** Versão, contagem de slides e nota de pauta saem em
`tabular-nums`; número que dança entre linhas parece defeito.

## Layout

- Galeria e fila: coluna centrada `max-w-5xl` (64 rem), padding lateral de 1 rem, 2 rem de
  respiro no topo. Cards em `grid sm:grid-cols-2` com 0,75 rem de gap.
- Editor: barra superior de 3,5 rem (`h-14`), e abaixo uma grade de duas colunas —
  rail de configurações de 20 rem (`320px`) + canvas elástico (`md:grid-cols-[320px_minmax(0,1fr)]`).
  No mobile a grade colapsa para uma coluna e o painel vira drawer.
- Escala do slide: `scale = min(1, larguraDaJanela / 2.5 / 400)` acima de 770 px de janela,
  e `/ 1.2` abaixo disso (`src/components/slides-editor.tsx:56-58`). O slide é sempre
  400×500 em CSS e sai a 1080×1350 no PNG.
- Ritmo vertical: 0,5 rem dentro de grupo, 1 rem entre grupos, 1,5–2 rem entre seções.

## Elevation & Depth

Plano por padrão. Profundidade vem de borda de 1 px e de diferença de fundo (branco sobre
`muted`), não de sombra. A única sombra do sistema é `shadow-sm` no card e no formulário de
login; os painéis flutuantes do editor (Sugestões, Plano) trazem sombra própria, maior que
a do resto — é aí que a profundidade deixa de ser sistema e vira exceção.

### Shadow Vocabulary
- **Card em repouso** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`): card de projeto,
  formulário de login.
- **Painel flutuante** (`shadow-lg` do Tailwind, herdado): painel de sugestões e de plano,
  sobre o canvas. Fora do vocabulário do resto.

### Named Rules
**A Regra da Borda Antes da Sombra.** Precisa separar dois planos? Borda de 1 px e fundo
diferente. Sombra só responde a estado (hover, painel flutuante).

## Shapes

Raio único de 8 px (`--radius: 0.5rem`) aplicado como `rounded-md` em botão, input e
etiqueta; `rounded-lg` em card do shadcn; `rounded-xl` (12 px) em card de projeto, faixa de
aviso e diálogo; e pílula (`rounded-full`) só em chip de filtro da fila. A mistura de 8 px
e 12 px não é decidida por nenhuma regra escrita — é herança.

Sem clipping, sem ângulo, sem ornamento. Ícones são `lucide-react` em traço 2.

## Components

### Buttons
- **Shape:** `rounded-md` (6 px efetivos), altura 2,5 rem (`h-10`), `text-sm` peso 500.
- **Primary:** `bg-primary` (tinta) com `text-primary-foreground`, `px-4`.
- **Hover / Focus:** `hover:bg-primary/90`; foco é `ring-2 ring-ring ring-offset-2`.
- **Secondary / Ghost / Outline:** `secondary` é o cinza frio; `outline` é borda + fundo
  branco; `ghost` só aparece no hover. `link` é texto sublinhado no hover.
- **Destructive:** `bg-destructive` com texto quase-branco. Também usado como texto
  vermelho em `ghost` (revogar link, descartar).

### Chips
- **Style:** pílula com borda; ativo é `bg-primary text-primary-foreground`, inativo é
  `border-border text-muted-foreground`.
- **Estado:** filtro de estado na fila (`Todos (6)`, `Ideia (6)`…), com contagem no rótulo.

### Cards / Containers
- **Corner Style:** `rounded-xl` (12 px) na galeria e na fila; `rounded-lg` no shadcn.
- **Background:** `bg-card` (branco) sobre `bg-background` (branco) — a separação é a borda.
- **Shadow Strategy:** `shadow-sm` no card genérico; card de projeto é plano com borda.
- **Border:** `border` = `hsl(214.3 31.8% 91.4%)`.
- **Internal Padding:** 1 rem (`p-4`) na galeria, 1,25 rem na fila.

### Inputs / Fields
- **Style:** altura 2,5 rem, `rounded-md`, borda `input`, fundo branco, `text-sm`.
- **Focus:** `ring-2 ring-ring ring-offset-2` — anel escuro, sem mudança de borda.
- **Error / Disabled:** erro não é estado do input; é uma faixa `bg-destructive/10` acima
  do formulário. Desabilitado é `opacity-50` + `pointer-events-none`.

### Navigation
- **Galeria/fila:** barra branca `h-14` com borda inferior, wordmark à esquerda, nome do
  usuário e `Sair` como botão ghost à direita. Sem ícone, sem avatar, sem menu.
- **Editor:** barra `h-14` com wordmark + `File` + pager central (`Slide 1 / 5` entre dois
  pares de setas) + nome do arquivo + botão `PNGs`. Abaixo, rail vertical de 4 itens
  (Brand, Theme, Fonts, Numbers) com ícone acima do rótulo.
- **Mobile:** rail vira dois FABs (`+` para configurações, pincel para estilo do elemento)
  que abrem drawers de 60% e 40% da altura.

### Etiquetas de estado
`span` com `rounded-md`, borda e fundo tintado por estado: `link ativo` em esmeralda,
`IDEIA` em cinza, `RASCUNHO` em âmbar, `APROVADO` em esmeralda, `PUBLICADO` em azul. Não
existe componente `badge` no repositório — é `span` estilizado em cada tela.

## Do's and Don'ts

### Do:
- **Do** usar a tinta de ação uma vez por região: um botão primário por tela.
- **Do** separar planos com borda de 1 px (`hsl(214.3 31.8% 91.4%)`) antes de cogitar sombra.
- **Do** manter 8 px de raio como base; 12 px só em card de conteúdo e diálogo.
- **Do** escrever em pt-BR, voz operacional: o texto diz o que acontece e o que não tem volta.
- **Do** marcar número com `tabular-nums`.
- **Do** dar `aria-label` a todo controle só de ícone (o editor hoje não dá em vários).

### Don't:
- **Don't** introduzir cor de marca saturada sem decisão explícita: o sistema é acromático
  e a única cor com peso é a tinta.
- **Don't** usar `text-muted-foreground` (4,6:1 no melhor caso) para texto de 10 px — o
  detector mede 3,7:1 no painel de sugestões e 3,8:1 no vermelho de `Descartar`.
- **Don't** misturar chrome em inglês com produto em português: `File`, `Brand`, `Numbers`,
  `YOUR TITLE` são dívida herdada, não padrão.
- **Don't** usar serifa de display na interface: DM Serif Display pertence ao slide.
- **Don't** empilhar `bg-muted/20` com `bg-primary/10` no canvas (produz um lilás sujo sem
  intenção) — `src/components/slides-editor.tsx:70`.
- **Don't** criar um segundo vocabulário de sombra: os painéis flutuantes usam `shadow-lg`
  e o resto usa `shadow-sm`; escolha um.
