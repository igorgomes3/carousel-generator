# Issue #12 — 3:4 de arte, janela 4:5, @ do perfil e curadoria de estilo

Registro das decisões do último ticket do mapa (#12). O que ficou no código, por
que cada número é o que é, e o que a issue deixava em aberto.

## 1. Geometria: dois retângulos, não um

O Instagram aceita 4:5 no feed e é o 4:5 que a grade do perfil corta. O alvo
(CarrosseIA) desenha em 3:4 porque sobra altura: a foto respira em cima e
embaixo. Os dois juntos dão o desenho certo — e nenhum dos dois sozinho dava:

| peça | medida | onde vive |
|---|---|---|
| **arte** | 1080×1440 (3:4) | o card desenhado e editado no editor |
| **janela segura** | 1080×1350 (4:5), centrada | onde TODO texto senta |
| **PNG exportado** | 1080×1350 (4:5) | a janela, recortada da arte |
| **sangria** | 45 px em cima e embaixo | foto e gradiente podem invadir; texto não |

Tudo isso está em `src/lib/estudio/area-segura.ts` — constantes e as três funções
de conversão (`dentroDaJanela`, `doPeDaJanela`, `dentroDaAreaSegura`). O palco de
export, o card e o rasterizador importam daqui; concordar por importação é a
única forma que não desvia.

**Por que os números de layout continuam os de antes.** O card era 1080×1350. Os
valores de layout (80 px do topo, 48 px do pé, bloco de texto de 1122 px) foram
medidos nessa altura. Em vez de reescrever cada um, o card desenha em 1440 e cada
posição virou `SANGRIA + n`. O desenho fica idêntico ao que já existia, com folga
em cima e embaixo — zero regressão visual e um só número novo.

**Como o recorte acontece.** `html-to-image` não recorta: `width`/`height`
definem o SVG que recebe o nó. Então o palco de export (`estudio.tsx`) entrega um
wrapper de 1080×1350 com `overflow: hidden` e o card deslocado 45 px para cima. O
PNG sai 1080×1350 de verdade — verificado no gate lendo o arquivo com `pngjs`.

## 2. A guia: discreta, mas visível

A primeira versão era uma linha de 1 px de CSS **dentro** do card. Como o card é
escalado por `transform` para ~300 px na tira (escala 0,28), a linha virava
0,28 px de tela: o seletor ligado e nada visível. Foi pego na inspeção da
screenshot, não no teste — o teste só provava que o elemento existia.

Regra que ficou: **espessura em pixels de arte**. Linha tracejada de 6 px de arte
(≈1,7 px de tela), véu laranja a 22% sobre a sangria, e a legenda "área segura
4:5" em CSS na moldura da prévia (`Cartao`), porque 24 px de arte viram 6 px de
tela. A guia é ligável/desligável (padrão ligada, escolha no `localStorage`) e
**nunca** entra no PNG: o palco de export passa `guia={false}`.

## 3. @ do perfil: um por projeto

`CarrosselGerado.arroba`, exibido pela função `arrobaVisivel`
(`src/lib/estudio/arroba.ts`). Um por projeto e não por card: repetir em dez cards
é a edição que a pessoa esquece em um, e o carrossel sai com dois handles.

Duas funções, de propósito:

- `limparArroba` é para **digitar** — aceita `@perfil`, `perfil`, `@@perfil`, e
  devolve o que aparece na tela;
- `normalizarArroba` é para **gravar** — aplica a regra do Instagram (letras,
  números, ponto, sublinhado, 30 caracteres, sem ponto no fim) e devolve `null`
  quando não sobra nada.

Onde aparece: capa no canto superior esquerdo (o `<span />` vazio que já existia),
cards de conteúdo e CTA no meio do rodapé, entre a chamada de arrasto e o
contador.

## 4. Curadoria: 8 fundos × 8 destaques × 6 pares de fonte

`src/lib/estudio/estilo.ts`. Por que lista fechada e não `input type="color"`: o
editor denso foi desligado de propósito, e 16,7 milhões de cores para um usuário
leigo produz card ilegível na maioria das vezes. Trinta fontes têm o mesmo
problema com outro nome.

**Fundos** — três claros de papel e cinco escuros:

| id | nome | fundo | texto | secundária |
|---|---|---|---|---|
| branco | Branco | `#FFFFFF` | `#101114` | `#6B7280` |
| papel | Papel | `#F7F4EE` | `#16110C` | `#6F675C` |
| areia | Areia | `#EFE7DA` | `#1F1A14` | `#7A6A57` |
| grafite | Grafite | `#14161A` | `#FFFFFF` | `#9AA3AE` |
| preto | Preto | `#000000` | `#FFFFFF` | `#A1A1AA` |
| meia-noite | Meia-noite | `#0B1024` | `#F8FAFF` | `#94A3B8` |
| vinho | Vinho | `#1B0B12` | `#FFF5F7` | `#C9A6AE` |
| floresta | Floresta | `#04110F` | `#F2FFFB` | `#93AEA9` |

Fundo e cor de texto viajam **juntos**: a pessoa escolhe uma cor, não três. O
teste puro exige contraste ≥ 4,5:1 do texto e ≥ 3:1 da secundária contra o fundo.

**Destaques** — laranja `#F4511E`, vermelho `#E5342B`, terracota `#C8452B`, ouro
`#D9A521`, verde-água `#2BE0C8`, azul `#3B82F6`, violeta `#A855F7`, lima
`#B4E33D`. Saturação alta porque o destaque aparece em palavra de manchete, no
traço do card de conteúdo e como fundo do card de CTA.

**Regra de contraste do destaque** — piso de 1,8:1 contra o fundo atual
(`combina`/`CONTRASTE_MINIMO_DESTAQUE`). Abaixo disso o chip fica desabilitado com
`title` explicando. Resultado medido: 6 de 8 destaques disponíveis em fundo claro,
8 de 8 em fundo escuro — verde-água e lima somem no branco, e é isso que o piso
impede.

O piso de 1,8 não é o 4,5 do WCAG porque o destaque pinta manchete de 72–116 px e
traço de 10 px. O segundo guarda-costas é `corLegivelSobre`: o card de CTA pinta o
fundo inteiro com o destaque, e branco sobre lima dá 1,5:1 — sem ele o último card
sairia ilegível em metade das paletas.

**Pares de fonte** — Manchete (Anton + Inter), Cartaz (Archivo Black + Inter),
Condensada (Bebas Neue + Inter), Editorial (Playfair Display + Inter), Jornal
(Oswald + Roboto), Técnica (Space Grotesk + Inter). Todas com pilha em `PILHAS`
(`src/lib/templates.ts`); o teste puro usa `temPilhaPropria` para falhar se algum
nome de fonte não existir no build — fonte desconhecida vira Arial no PNG sem
aviso.

Corpo é Inter em cinco dos seis: par bom é título com personalidade e corpo
invisível. Roboto aparece no "Jornal" porque Oswald + Roboto é a dupla de impresso.

## 5. Compatibilidade: ausência, não migração

O projeto guarda **ids**, nunca hex: `estilo: { fundoId, destaqueId, fonteId }`.
Quando a curadoria melhora, o que está salvo acompanha; e id desconhecido (projeto
de outra versão) é descartado, caindo no template.

Projeto gravado antes desta issue não tem `arroba` nem `estilo`. `resolverAparencia`
devolve o template byte por byte nesse caso — nada de migração, nada de "documento
inválido". O gate cobre o caminho inteiro: abre `?abrir=<id>` com JSON antigo,
desenha 3 cards com o fundo do template e salva por cima sem inventar @.

## 6. Gates

- `npx tsx src/lib/estudio/estilo.test.ts` — geometria, compatibilidade, curadoria
  (contraste de todo fundo × todo destaque), fontes carregáveis e regra do @.
- `tests/visual/issue-12-aspecto.spec.ts` — arte 1080×1440, janela 1080×1350, guia
  na prévia e fora do PNG, PNG baixado de verdade medido com `pngjs`, @ em todos os
  cards, duas paletas/fontes ao vivo, projeto antigo abrindo igual.
- `pnpm run lint`, `pnpm run build`.
