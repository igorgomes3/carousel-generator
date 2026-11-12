# Três direções — Carrossel AutoClinic

Cada direção move **um eixo só**. As três compartilham a mesma topologia (barra, inspetor,
canvas, painel de pauta, filmstrip) e o mesmo conteúdo real: as mesmas 6 pautas da fila, os
mesmos 7 slides, a mesma marca. O que muda é densidade, tipografia, acento e ritmo.

Renderizações desta rodada em `docs/design/shots/` (1280×900 e 390×844, dpr 2 e 3).
HTML autocontido em `docs/design/mockups/` (fontes woff2 locais, sem CDN).

---

## A — Neutro denso

**Eixo:** informação primeiro. É a direção mais próxima do Linear.

| Token | Valor |
|---|---|
| Sans | **Inter Variable** (woff2 local), base 14 px, entrelinha 1,45 |
| Títulos | 22 px / 600 na página; 14,5 px / 600 no card; metadados 12 px |
| Acento | **indigo `#5E6AD2`** — só ação primária, seleção e estado ativo |
| Superfícies | papel `#FFFFFF`, canvas `#F7F8F9`, borda `#E6E8EC` |
| Texto | `#111318` / `#4E5464` / `#767C8C` |
| Raio | 8 px (`6` em botão e input) |
| Densidade | linhas de 44 px, padding de card 13 px, gap 12 px, inspetor 280 px |
| Gesto próprio | **o filmstrip de 7 miniaturas com conteúdo real** e a linha de status do canvas (`Salvo automaticamente · 7 slides · 1080×1350 · Ajustar 62%`) — o operador sabe em que slide está sem abrir nada |

**Editor:** três colunas apertadas. Marca no topo do inspetor com a frase de escopo ("vem da
organização"), campos do slide logo abaixo, fundo em swatches, tipografia em segmentado de
três opções, e "Fundo do slide" (cor sólida / degradê / grade). Canvas com slide 4:5 ancorado
embaixo, filmstrip colado no rodapé. Pauta à direita com nota numérica visível e versões
abaixo.

**Galeria:** 3 colunas, card horizontal — miniatura 4:5 de 78 px com o título real do slide 1
+ título do projeto em 2 linhas clampadas + `v4 · 7 slides · há 2 h` + etiqueta de estado e
autor. Ações no rodapé do card: Abrir (acento), Duplicar, histórico.

**Custo:** o mais baixo dos três. Já é shadcn, já é denso; a mudança é de escala tipográfica,
paleta de acento e reordenação do inspetor. O que exige trabalho é o filmstrip com render
real (hoje o editor só desenha o slide atual em escala cheia).

---

## B — Claro e arejado

**Eixo:** descanso e leitura. Notion com a disciplina do Stripe Dashboard.

| Token | Valor |
|---|---|
| Sans | **Public Sans** (woff2 local), base 15 px, entrelinha 1,5 |
| Títulos | 30 px / 600 na página; 16 px / 600 no card; metadados 13 px |
| Acento | **azul `#2383E2`** |
| Superfícies | papel `#FAFAF8` (branco quente), canvas `#F2F2EE`, card `#FFFFFF`, borda `#E8E7E1` |
| Texto | `#1A1C1F` / `#55595F` / `#82868D` |
| Raio | 10 px |
| Densidade | linhas de 52 px, padding de card 16 px, gap 14 px, inspetor 296 px |
| Gesto próprio | **o card grande de 2 colunas** com miniatura de 92 px: cada carrossel ocupa espaço de verdade, e o branco quente do papel separa a interface da peça |

**Editor:** mesmo esqueleto, mais respiro entre seções e tipografia maior em tudo que é
leitura (rótulos, ajuda, metadados). O canvas ganha mais ar ao redor do slide; o filmstrip
respira.

**Galeria:** 2 colunas com cards altos. Lê como biblioteca, não como planilha. Numa org com
30 carrosséis, mostra 6 por tela e obriga a rolar — o preço do ar.

**Custo:** médio. Exige refazer o grid da galeria (2 colunas), subir a escala tipográfica
inteira e revisar todos os paddings. É a direção mais confortável para quem usa 20 minutos por
dia e a menos eficiente para quem produz 40 carrosséis por mês.

---

## C — Acento confiante

**Eixo:** bloco de marca marcado. Vercel, com Geist.

| Token | Valor |
|---|---|
| Sans | **Geist** (woff2 local, 4 pesos), base 14 px, entrelinha 1,45 |
| Títulos | 25 px / 600 na página; 15 px / 600 no card; metadados 12 px |
| Acento | **teal `#0D9373`** — preenchido em ação primária e em etiqueta de estado |
| Superfícies | papel `#FFFFFF`, canvas `#F6F6F5`, borda `#E7E7E4` |
| Texto | `#0B0B0C` / `#55554F` / `#83837D` |
| Raio | 12 px |
| Densidade | linhas de 44 px, padding 15 px, gap 14 px |
| Gesto próprio | **o teal como cor de marca do produto** — o mesmo verde que já aparece nas capas dos carrosséis, então a ferramenta e o entregável compartilham paleta |

**Editor:** idêntico em topologia ao A, com raio maior e o acento teal em vez do indigo. O
ganho é semântico: a interface passa a ter a cor do produto que o operador publica.

**Galeria:** 3 colunas, mesmo card horizontal do A, com etiqueta de estado tintada de teal.

**Custo:** baixo em layout, alto em validação. Teal é a única cor da tela e precisa passar AA
em três contextos (botão preenchido, etiqueta tintada, anel de foco). E há um risco de marca:
o teal do produto é decisão do Clécio, não do design.

---

## Comparativo

| | A — Neutro denso | B — Claro e arejado | C — Acento confiante |
|---|---|---|---|
| Sensação | ferramenta de produção | biblioteca | produto com marca |
| Varredura (6 carrosséis) | 6 na primeira tela | 6 em duas telas | 6 na primeira tela |
| Melhor para | operador diário, 40/mês | revisor ocasional | handoff com cliente |
| Custo de implementação | baixo | médio | baixo |
| Risco | virar genérico | virar lento | cor de marca sem dono |

## Recomendação: **A — Neutro denso**

Três razões, na ordem que importa:

1. **A tarefa é varredura, não contemplação.** O operador abre o app para achar uma pauta,
   gerar, conferir 7 slides e exportar. Densidade serve; ar atrapalha. O card horizontal de
   78 px mostra 6 carrosséis numa tela e ainda deixa o título legível.
2. **É a direção que menos inventa.** O app já é shadcn denso; o que falta é escala
   tipográfica, acento e hierarquia — não outro layout. A entrega pode ser feita por partes,
   tela por tela, sem uma semana de refactor.
3. **O acento é trocável.** Indigo `#5E6AD2` pode virar o teal do AutoClinic em uma variável
   (`--acento`), sem mexer em layout. Isso deixa a decisão de marca para o Clécio, onde ela
   pertence, sem travar a implementação.

Se o Igor quiser a marca do produto na interface agora, **C** entrega o mesmo layout do A com
o teal — é a troca de uma variável e a validação de contraste em três contextos.

**O que os renders revelaram que a prosa não dizia:** no A, o slide ancorado embaixo (título
no terço inferior, rodapé de marca colado na base) resolve o vazio que a versão centrada
deixava no meio da peça — e é o que mais aproxima o mockup de "produto que já saiu". No B, o
branco quente `#FAFAF8` faz o card branco parecer flutuando sem precisar de sombra; no A a
mesma separação exige borda. No C, o teal em etiqueta tintada é o único lugar onde a cor
aparece duas vezes na mesma tela — e é justamente onde ela começa a competir com o botão.
