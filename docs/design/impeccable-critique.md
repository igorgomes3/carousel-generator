⚠️ DEGRADED: single-context (subagentes proibidos pela configuração permanente do usuário — `SOUL.md` regra #0 veda `delegate_task`; as duas avaliações rodaram em sequência isolada: A foi escrita em disco em `/root/.hermes/cache/scratch/assessment-a.md` **antes** de o detector entrar neste contexto)

# Impeccable critique — Carrossel AutoClinic

Alvo: `/root/projects/carousel-generator-eval` — `/` (editor), `/projetos` (galeria),
`/fila`, `/login`. Modo da superfície: **Operate** (o operador executa uma tarefa).
Motor `impeccable 4.8.2`, build de produção na porta 4331, 11/11/2026.
Evidência visual desta rodada: `docs/design/atual/*.png`.

## Design Health Score

| # | Heurística | Nota | Achado principal |
|---|-----------|-------|------------------|
| 1 | Visibility of System Status | 2 | Autosave avisa (`src/app/page.tsx:20-31`), mas exportar PNG não mostra progresso por slide e a galeria não mostra miniatura nenhuma |
| 2 | Match System / Real World | 2 | Chrome do editor em inglês dentro de produto pt-BR; `v3 · 5 slides · 11/11/2026, 20:19` sem rótulo; `google_news:clinica de estetica` cru na fila |
| 3 | User Control and Freedom | 2 | Sem undo/redo; lixeira do slide age no primeiro clique; sair do editor salvo é um link pequeno |
| 4 | Consistency and Standards | 2 | Três gramáticas de estado ativo; painel de sugestões fora do sistema (raio, sombra, tipografia) |
| 5 | Error Prevention | 2 | Autosave e versões são fortes; "Descartar" da fila e a lixeira do slide não pedem confirmação |
| 6 | Recognition Rather Than Recall | 2 | Galeria sem miniatura: para saber o que é o carrossel é preciso abrir; barra do editor tem ícone vazio e um `·` solto |
| 7 | Flexibility and Efficiency | 1 | Nenhum atalho de teclado, nenhuma ação em lote na galeria |
| 8 | Aesthetic and Minimalist Design | 1 | Dois sistemas de navegação concorrentes no canvas, 65% de viewport morta na galeria, placeholder domina o conteúdo |
| 9 | Error Recovery | 1 | 401 em qualquer chamada chama `sair()` (`src/lib/auth/sessao.ts:133-136`) e joga em `/login` sem explicar |
| 10 | Help and Documentation | 1 | Nenhuma ajuda contextual; o único texto explicativo é especificação interna vazando ("Autor vê os próprios; gestor e dono veem a organização") |
| **Total** | | **16/40** | **Poor (12–19) — overhaul necessário** |

## Design Specificity Verdict

**Categoria-intercambiável, com uma camada de produto colada por cima.**

**Avaliação de design (A, sem o detector):** o editor é o `carousel-generator` open-source
do FranciscoMoretti — wordmark "Carousel Generator", link para o GitHub do autor no topo,
"My Carousel File", "YOUR TITLE", "Your awesome subtitle", "My name", "@name", "400 × 200",
abas "Brand / Theme / Fonts / Numbers". Nada ali pertence ao AutoClinic. A camada de produto
— galeria em pt-BR, fila de conteúdo, sugestões por pauta, plano — vive em três telas
separadas e não contaminou o editor. Consequência: o operador que abre `/` não vê o produto
dele, vê um template em inglês; e a marca que ele repete todo dia (nome, @, avatar, cor)
está enterrada na primeira aba de um rail de quatro ícones.

**Varredura determinística (B):** 32 achados no editor em 1280, 30 em 390, 16 na fila,
0 na galeria em 1280 e 1 em 390; `/login` não mediu (timeout de navegação em duas
tentativas). O detector **concorda** com A em duas frentes e acrescenta três coisas que a
avaliação visual não tinha medido:

- **Concorda:** texto funcional em 10 px (26 nós no editor, 6 na fila) e contraste 3,7:1 /
  3,8:1 — o que A chamou de "cinza de apoio fraco".
- **Concorda:** `nested-cards` no painel de sugestões — A chamou de "colagem de outra tela".
- **Acrescenta:** hierarquia tipográfica achatada na fila (degrau de 1,14:1 contra alvo de
  1,25:1); linha de ~130 caracteres no texto de ajuda do filtro; rolagem lateral em 390 px
  na galeria (card 129 px além da borda).
- **Falso negativo conhecido:** `impeccable detect src` devolve `[]` porque o app estiliza
  com classes Tailwind e o motor de arquivo não lê utilitário Tailwind. Zero ali não é limpo.
- **Falso positivo:** nenhum dos 79 achados foi falso positivo; todos foram conferidos no
  render ou no código.

**Overlays:** não houve injeção de overlay no navegador do usuário nesta rodada — o detector
rodou em perfil headless próprio. Nada aparece na tela do Igor por causa desta critique.

## Overall Impression

O produto tem a espinha certa (autosave, versões, fila com tese, lint bloqueante, link
público) e a pele errada. O que falta não é ornamento: é decisão. Hoje o app é um fork bem
mantido com três telas de produto ao lado; o operador sente isso na primeira abertura do
editor. A maior oportunidade única: **fazer o editor parecer o produto e mostrar a peça** —
miniatura na galeria, marca da organização por padrão, uma ação primária de verdade.

## What's Working

1. **Autosave + histórico de versões + restaurar.** Resolve a dor real (perder o carrossel) e
   está implementado com cuidado: debounce de 1,2 s, um PATCH por vez, flush na aba oculta.
2. **A fila tem tese de produto.** "Nada publica sozinho": o estado máximo que o robô cria é
   `ideia`, aprovar é clique, e a tela mostra a nota decomposta por relevância/recência/novidade.
3. **Link público revogável com token opaco**, que reaproveita a mesma URL ao republicar —
   resolve o handoff com o cliente sem mandar print no WhatsApp.

## Priority Issues

**[P1] O editor não parece o produto.**
- **Por quê:** o operador passa 80% do tempo ali e vê inglês, template genérico e a marca
  dele como placeholder. É o primeiro contato e é onde o produto perde a identidade.
- **Fix:** chrome em pt-BR; marca (nome, @, avatar, cor) como dado da organização aplicado
  por padrão; previews abrindo com pauta real em vez de "YOUR TITLE".
- **Comando:** `/impeccable clarify`.

**[P1] Um 401 derruba a sessão e a tela vai para `/login`.**
- **Por quê:** reproduzido nesta rodada (`docs/design/atual/bug-401-f5.png`). Com refresh
  token rotacionado por outra sessão da mesma família, um F5 em `/projetos` cai em
  `/login?de=/projetos`. Pior: `sair()` em `src/lib/auth/sessao.ts:133-136` apaga o refresh
  token mesmo quando o 401 veio de uma rota isolada, não da sessão.
- **Fix:** encerrar a sessão só quando o refresh for recusado pelo GoTrue; 401 de rota comum
  devolve o erro para a tela. Mesma regra que o painel do AutoClinic já aplica.
- **Comando:** `/impeccable harden`.

**[P1] Nenhum ponto de ação primária no editor.**
- **Por quê:** exportar é o objetivo do trabalho e "PNGs" é `variant="outline"` do mesmo peso
  de "File". Sem hierarquia, o operador procura o botão que fecha o trabalho.
- **Fix:** um botão preenchido (exportar), um acento único no sistema, hierarquia por peso e
  tamanho, e o pager promovido a elemento de navegação real em vez de quatro caixas iguais.
- **Comando:** `/impeccable layout`.

**[P2] A galeria não mostra o carrossel.**
- **Por quê:** card só de texto, 65% de viewport morta, metadados sem rótulo, título truncado
  com espaço sobrando, e rolagem lateral em 390 px.
- **Fix:** miniatura do slide 1, grid de 2–3 colunas, data relativa, rótulo nos metadados,
  `flex-wrap` na linha de ação.
- **Comando:** `/impeccable adapt`.

**[P2] Painéis flutuantes fora do sistema.**
- **Por quê:** Sugestões e Plano usam raio, sombra e tipografia próprios, cobrem o canvas e,
  no mobile, o FAB `+` sobrepõe o cabeçalho do painel.
- **Fix:** um único vocabulário de painel (borda hairline + fundo `card` + raio 12), encaixado
  na grade em vez de flutuando sobre ela.
- **Comando:** `/impeccable layout`.

## Persona Red Flags

**Alex (power user / operador diário):** zero atalhos — trocar de slide é clique em seta,
duplicar slide é um ícone sem rótulo, exportar não tem opção de escala nem de formato. Sem
seleção múltipla na galeria, sem "duplicar slide" no canvas, sem busca. Ele vai pedir isso na
primeira semana e vai usar o Canva enquanto não existir.

**Jordan (primeira vez):** abre o editor e encontra "File", "Brand", "My name", "@name",
"400 × 200". Não há nada que diga "escreva o texto aqui". A primeira aba aberta é de estilo,
não de conteúdo. Abandono provável no primeiro slide.

**Sam (leitor de tela / teclado):** os ícones do editor têm `aria-label` (bom), mas 26 nós de
texto funcional em 10 px e contraste 3,7:1; o input de título da galeria tem só placeholder
como pista visual (o `<label class="sr-only">` existe, mas some na tela); o slider de opacidade
não expõe valor.

## Minor Observations

- `bg-primary/10` sobre `bg-muted/20` no canvas (`src/components/slides-editor.tsx:70`).
- `·` solto e quadrado vazio na extremidade direita da barra do editor (ícone que não renderizou).
- Toolbar do segundo slide desalinhada da borda do card no render de 1440.
- Slider de opacidade sem trilho preenchido: parece travado em 100%.
- Três formatos de data diferentes no app; nenhum usa tempo relativo.
- `link ativo` é a única etiqueta de estado que aparece na galeria — as outras quatro da fila
  não têm equivalente ali.

## Questions to Consider

- Se o operador só escreve texto e exporta PNG, por que a tela inicial dele é uma barra de
  quatro abas de estilo?
- O que muda se a marca for da organização e o editor nunca mais perguntar nome e @?
- A galeria precisa ser uma tela separada, ou é o estado natural do editor?
- Qual é o mínimo honesto de cliques entre "abrir o app" e "PNG na mão"? Hoje são pelo menos
  oito, e dois deles são espera sem feedback.

**Perguntas para o Igor** (as respostas mudam o plano de implementação):
1. Prioridade agora: **(a)** consertar sessão/galeria (P1 técnicos), **(b)** rebrandar o editor
   para o produto AutoClinic, ou **(c)** os dois na ordem a→b?
2. A marca (nome, @, avatar, cor) deve virar **dado da organização** (configurado uma vez) ou
   continuar por projeto?
3. O editor deve manter o rail de 4 abas de estilo ou trocar por um painel único contextual
   (estilo do elemento selecionado + marca)?
