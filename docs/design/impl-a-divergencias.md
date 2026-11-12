# Direção A aplicada — o que divergiu do mockup e por quê

Comparação entre `docs/design/shots/impl-a/` (implementação) e
`docs/design/shots/{editor,galeria}-a-neutro-denso-{1280,390}.png` (mockup
aprovado). Cada divergência tem o motivo, não só a descrição.

## O que bateu

| Contrato | Implementado | Medido |
|---|---|---|
| Acento único indigo `#5E6AD2` | `--primary`, botão Exportar, seleção, anel de foco | `rgb(96 107 210)` no outline |
| Superfície neutra + borda fina | papel `#FFFFFF`, canvas `#F7F8F9`, borda `#E6E8EC` | tokens, sem hex em componente |
| Raio 8/12 | 6 (botão/input), 8 (painel/slide), 10 (card), 12 (diálogo) | `--radius-*` |
| Densidade | linha de 44 px, padding de card 13 px, gap 12 px, inspetor 280 px | `--space-row`, `--space-card-pad`, `--size-inspector` |
| Hierarquia por peso e tamanho | 22/600 título de página, 14,5/600 card, 14 corpo, 12 meta | `--text-*` |
| Galeria 3 colunas, card horizontal, miniatura 4:5 de 78 px | `xl:grid-cols-3`, `w-thumb`, `aspect-[4/5]` | 3 colunas em 1280 |
| Estouro zero de 360 a 1440 | — | 0 px em 12 combinações (2 telas × 6 larguras) |

## Divergências assumidas

1. **O editor não tem a terceira coluna de pauta.** O mockup mostra "Pauta de
   hoje" e "Versões" à direita. No produto, pauta é a tela `/fila` e versões é o
   diálogo "Histórico" da galeria. Criar um terceiro painel seria uma tela nova,
   não uma aplicação de direção — e duplicaria duas fontes de verdade.

2. **Filmstrip sem o slide renderizado em escala.** A miniatura desenha fundo do
   tema + título + número, como o mockup faz visualmente, mas não é o slide real
   reduzido. Renderizar o slide inteiro em cada miniatura registraria um segundo
   conjunto de campos com o mesmo nome no react-hook-form (os dois escreveriam no
   mesmo campo). Custo alto, risco real, ganho zero de informação.

3. **Canvas com um slide por vez, mas ainda em carrossel.** O mockup mostra um
   slide só. A faixa do embla ficou com largura de um slide, então a tela mostra
   o slide atual — mas os vizinhos continuam no DOM porque a exportação lê a
   faixa inteira. As setas flutuantes do embla foram removidas (três controles
   para a mesma ação era ruído); o paginador da barra e o filmstrip navegam.

4. **Miniatura da galeria com tom derivado do `id`, não a cor do slide.**
   `/carrossel/projetos` devolve título, versão, contagem, autor e estado — não o
   documento. Pintar a miniatura com a cor real exigiria uma chamada por card só
   para 78 px. Quando a API devolver a capa, `cartao-projeto.tsx` recebe a cor.

5. **Meta em 12 px, não 11 px.** O mockup usa 11 px em rótulo de seção e 12 px em
   metadado. O piso do sistema ficou em 12 px para nada ficar abaixo disso;
   `muted-foreground` também foi escurecido de `#767C8C` (4,2:1) para `#6B7280`
   (4,8:1) porque em 12 px o tom do mockup reprova em AA.

6. **Botão e input em 14 px, não 13 px.** O mockup usa 13 px. Subir 1 px atende
   "nada abaixo de 14 no corpo" sem mexer na densidade das linhas (44 px).

7. **Chrome de formulário segue em inglês.** `Name`, `Handle`, `Url to an image`
   são dívida herdada do projeto open-source; a tradução do formulário inteiro é
   trabalho separado. O chrome de navegação e os títulos de seção estão em pt-BR
   (`Arquivo`, `Exportar PNGs`, `Marca`, `Tema`, `Tipografia`, `Numeração`,
   `Estilo do elemento`).

8. **Menus dentro do slide continuam com ~20 px de alvo real.** Eles vivem dentro
   do slide, que roda em escala 65–89%: 44 px de CSS viram ~29 px de tela. O
   caminho de toque no mobile são os drawers do inspetor (44 px). Estão marcados
   com `data-alvo-menor` e o teste de alvo de toque os exclui explicitamente.

9. **Filtro "Rascunhos" do mockup não existe.** O estado do projeto na API é
   binário (`publico_ativo`); "Rascunhos" não teria como ser calculado. Os
   filtros são Todos / Meus / Link ativo / Sem link, com contagem real.

10. **Ação de link virou ícone.** O mockup mostra "Revogar link" como texto no
    rodapé do card; com 4 ações em texto o rodapé quebrava em duas linhas em
    3 colunas. Ficou ícone com `aria-label` por card ("Gerar link público de
    …"/"Revogar link público de …") — mesmo alvo de 44 px, sem quebra.
