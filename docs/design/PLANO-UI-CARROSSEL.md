# Plano de UI/UX — gerador de carrossel (v2)

Escrito em 12/11/2026. Só plano: nada em `src/`, nenhum commit.

O que este documento é: a nova estrutura de telas do gerador de carrossel, com o
carrossel como objeto único de trabalho, uma tela inicial de aprovação, um painel de
configuração e o fluxo de ponta a ponta.

O que ele não é: um segundo sistema de design. A direção **A (Neutro denso)** já está
implementada e é reaproveitada inteira — Inter 14 px, acento `#5E6AD2` (`--primary`),
borda `#E6E8EC` (`--border`), raio 8/12, linha de 44 px, cartão com 13 px de padding,
miniatura de 78 px, filmstrip de 92 px, inspetor de 280 px. Todos esses valores existem
em `design-tokens.json` / `src/app/tokens.css` e nenhum token novo é necessário.

---

## 0. Três decisões do Igor que este plano segue

| # | Decisão (palavras dele) | Efeito no plano |
|---|---|---|
| 1 | “Apaga a noção de projeto de vez, sem etiqueta.” | A palavra `projeto` sai do produto, das rotas, da API e do banco. Cada registro existente **vira um carrossel solto** — não há órfão e não há pasta de arquivo morto. Ver §1.4 e §6.3 |
| 2 | “As duas, escolhível nas configurações.” | Unsplash **e** Pexels, com escolha por organização em Configurações › Imagens, e atribuição gravada e exibida nos dois casos. Ver §4.5 |
| 3 | “Só eu, operando sozinho.” | Aprovação é de uma pessoa: ver, aprovar, baixar, copiar. Sem revisor, sem dono de fila, sem notificação de time, sem “atribuir a”. Ver §3.6 |

Duas consequências dessas decisões, ditas de frente:

- **O registro de trás não é hierarquia.** Hoje `carrossel_projetos` é uma tabela que
  guarda um carrossel — não existe nada acima dela. A “hierarquia de projetos” que o
  Igor sente é vocabulário (`/projetos`, `?projeto=`, “Meus carrosséis”), uma tela de
  listagem e um nível de URL. Apagar a hierarquia é apagar esses três, não os dados.
- **Usuário único tira trabalho, não tira registro.** `autor`, `aprovada_em` e
  `publicada_em` continuam gravados. Custa nada e responde “quando isso foi aprovado”
  quando a pergunta aparecer.

---

## 0.1. Ponto de partida medido (antes de propor)

Lido em 12/11/2026 no código deste repositório, na API do AutoClinic
(`apps/api/src/{carrossel,conteudo-fila,referencias}.ts`) e nas migrations 010–017.
Não é impressão: é o que o app faz hoje.

| Peça | Onde está hoje | O que este plano faz com ela |
|---|---|---|
| Rota raiz `/` | Editor (`src/app/page.tsx`), aceita `?projeto=<id>`; sem o parâmetro é o editor “novo”, que persiste em `localStorage` | Vira a **tela inicial de carrosséis**. O editor passa para `/carrossel/<id>` |
| `/projetos` | Galeria: busca, filtros Todos/Meus/Link ativo/Sem link, card com abrir, duplicar, histórico, link, excluir | **Morre.** O conteúdo dela é o da nova tela inicial, com estados de verdade |
| `/fila` | Fila de sinais + filtro de nicho + referências (Apify) + calendário + qualidade por fonte | Vira `/sinais`, tela secundária. Não é onde se aprova carrossel |
| `/p/<token>` | Leitura pública server-side, 404 quando revogado, devolve só título e documento | **Fica igual.** Mesmo caminho, mesmos tokens |
| `/login` | BFF com GoTrue do AutoClinic | Fica igual |
| Editor | 3 colunas, filmstrip de 92 px, export PNG 1080×1350 em ZIP (`use-component-printer.tsx`) | Fica, muda de endereço e de moldura |
| `carrossel_projetos` | `id, organization_id, autor_id, titulo, briefing, documento, versao_atual, publico_token unique, publico_ativo, criado_em, atualizado_em` | Vira `carrosseis`, com colunas de estado e capa (§6) |
| `carrossel_versoes` | Histórico imutável, `unique (projeto_id, versao)`, restaurar cria versão nova | Fica, com a FK renomeada |
| `conteudo_fila` | `estado in (ideia,rascunho,aprovado,publicado,descartado)`, `briefing`, `documento`, `projeto_id`, `agendado_para date` | Vira `conteudo_pautas`: guarda a pauta, não o carrossel (§6.2) |
| `conteudo_config` | `palavras_obrigatorias[]`, `palavras_proibidas[]`, `max_por_dia`, `ativo` | Cresce e vira a base do painel de Configurações (§4) |
| `conteudo_sinais`, `conteudo_descartes`, `conteudo_referencias`, `conteudo_padroes`, `conteudo_referencias_coletas` | Coleta e medição | Ficam; ganham tela própria em `/sinais` |
| Autorização | **Sem RLS.** `papelMinimo` na API por `owner\|admin\|operador`, org por `?org=` | Mantida; RLS fica documentada com gatilho (§6.5) |
| Estado do carrossel | **Não existe no carrossel.** O estágio mora em `conteudo_fila.estado`, que é da pauta | Passa a existir em `carrosseis.estado` — uma fonte só (§2.3) |

Duas dívidas que aparecem e o plano resolve de passagem:

1. **A miniatura da galeria é falsa.** `cartao-projeto.tsx` pinta um tom derivado do
   `id` porque `/carrossel/projetos` não devolve o documento (divergência nº 4 de
   `impl-a-divergencias.md`). A tela inicial usa capa real (§2.2).
2. **O chrome do editor ainda está em inglês** (`File`, `Brand`, `Theme`, `Numbers`).
   Só os rótulos que a tela inicial e a de aprovação herdam do editor entram nesta
   entrega; a tradução completa do formulário é trabalho separado.

---

## 1. Arquitetura de informação nova

### 1.1 O objeto que sobra

**Carrossel**: uma peça de 5 a 10 slides, 1080×1350, com legenda, hashtags, imagens
com atribuição, estado, histórico de versões e — opcionalmente — um link público e um
sinal de origem.

Tudo o que o produto faz pendura nele. Não existe contêiner, não existe pasta, não
existe etiqueta.

### 1.2 Mapa de telas

```
                    ┌──────────────────────────────────────────┐
                    │  /            Carrosséis (tela inicial)  │
                    │  o que precisa do meu olho hoje           │
                    └───────┬───────────────┬──────────────────┘
                            │               │
              ┌─────────────▼───┐     ┌─────▼─────────────────┐
              │ /carrossel/<id> │     │ /sinais               │
              │ Aprovação       │     │ coleta, pauta, fonte  │
              │  ┌───────────┐  │     └─────┬─────────────────┘
              │  │ .../editar│  │           │ gera carrossel
              │  │ Editor    │──┼───────────┘
              │  └───────────┘  │
              └────────┬────────┘
                       │
        ┌──────────────▼───────────────┐     ┌──────────────────────┐
        │ /p/<token>  leitura pública  │     │ /configuracoes       │
        │ sem login, sem marca do app  │     │ metas · fontes ·     │
        └──────────────────────────────┘     │ volume · imagens     │
                                             └──────────────────────┘
```

Cinco rotas com sessão (`/`, `/carrossel/<id>`, `/carrossel/<id>/editar`, `/sinais`,
`/configuracoes`), uma pública (`/p/<token>`) e o login.

Navegação superior, três destinos, sem menu escondido:

| Item | Ícone | Onde leva | Estado ativo |
|---|---|---|---|
| Carrosséis | grade | `/` | sublinhado de 2 px em `--primary` |
| Sinais | raio | `/sinais` | idem |
| Configurações | engrenagem | `/configuracoes` | idem |

À direita: e-mail e `Sair`. Sem avatar, sem sino, sem contador de notificação — usuário
único não tem para quem notificar (§0 item 3).

### 1.3 Rota por rota

| Rota | Tela | Quem usa | Antes era |
|---|---|---|---|
| `/` | Carrosséis — abas **Para aprovar**, **A produzir**, **Aprovadas**, **Todas** | quem opera | `/projetos` |
| `/carrossel/<id>` | Aprovação individual | quem opera | `/?projeto=<id>` (abria o editor direto) |
| `/carrossel/<id>/editar` | Editor | quem opera | `/?projeto=<id>` |
| `/sinais` | Sinais e pautas | quem opera | `/fila` |
| `/configuracoes` | Metas · Fontes · Volume · Imagens | quem opera | não existia |
| `/p/<token>` | Leitura pública | cliente do Clécio | igual |

### 1.4 O que morre, item por item

| Morre | Consequência | Para onde vai quem usava |
|---|---|---|
| A tela `/projetos` | A lista vira a tela inicial, com estados e aprovação em vez de “abrir/duplicar/histórico” | `/` |
| A palavra `projeto` na interface | Rótulos passam a dizer “carrossel”. `Projeto não encontrado` vira `Carrossel não encontrado` | — |
| `/?projeto=<id>` | `301` para `/carrossel/<id>`. Nenhum link quebrado | redirect no `next.config.js` |
| O modo “editor novo” sem id | Todo carrossel tem id. O rascunho em `localStorage` (`documentFormKey`) não é mais criado | ver §6.3, passo 6 |
| A fila como lugar de aprovar | Aprovar carrossel nunca mais acontece em `/fila`; `/sinais` aprova **pauta**, não peça | `/sinais` |
| O filtro `Meus` | Usuário único — filtrar por autor é filtrar por ele mesmo | saiu |
| O campo de título “Novo carrossel” no topo da lista | Criar em branco deixa de ser a ação principal. Nasce da aba ou do sinal | botão `Novo` na tela inicial: abre o editor com 1 slide em branco |
| `conteudo_fila.projeto_id` | O vínculo se inverte: o carrossel aponta para a pauta | §6.2 |
| O botão “Duplicar” como ação de card | Continua existindo, no menu de contexto (25 px) do card | §2.5 |

### 1.5 O que **não** morre

- **Link público**: `/p/<token>` e os tokens já emitidos continuam abrindo. A decisão
  do Igor não encosta no link, e o plano preserva os valores existentes de
  `publico_token` byte a byte (§6.3, passo 3). Esse é o risco real da mudança e ele é
  tratado explicitamente em §9.1.
- **Histórico de versões**: `carrossel_versoes` fica, com restaurar. Deixa de abrir em
  diálogo na lista e passa a ser uma seção da tela de aprovação (§3.4).
- Editor, pipeline de 6 etapas, lint bloqueante, autosave, export PNG/ZIP, autenticação,
  coleta de sinais por Google News/Trends, referências por Apify.

### 1.6 `/sinais` — o que muda na antiga `/fila`

`/fila` é hoje a única tela onde se aprova um carrossel, e é justamente aí que está o
erro de arquitetura de informação: a tela que coleta pauta é a mesma que decide peça. A
divisão nova é uma linha só — **`/sinais` aprova pauta; `/` aprova carrossel**.

| Bloco da `/fila` | Destino |
|---|---|
| Filtro de nicho (termos, palavras proibidas, itens/dia) | move para **Configurações › Fontes**. Uma casa só; a tela de sinais mostra o efeito e o link para editar |
| Lista da fila com estados de carrossel | vira lista de **pautas** (`ideia`, `gerada`, `descartada`), com `Virar pauta` e `Gerar carrossel` |
| Botão `Aprovar` no item | **sai.** Aprovar carrossel é em `/carrossel/<id>` |
| Referência de performance (Apify) | fica, com `última coleta` e `último erro` visíveis por plataforma |
| Sinais coletados | fica, com `Virar pauta` |
| Qualidade por fonte | fica — agora é alimentada também por `carrosseis.motivo_rejeicao`, então mede rejeição de peça, não só de pauta |
| Semana editorial | fica, mas lê do carrossel (data prevista/`publicada_em`), não de `conteudo_fila.agendado_para` |

Os quatro estados, em uma tabela porque a tela é secundária:

| Estado | O que aparece |
|---|---|
| Normal | `Coletar agora` no topo, sinais do dia com nota e componentes, pautas com estado, painel de referência e a semana |
| Vazio | “Nenhum sinal na janela. `Coletar agora` busca agora; se a fonte estiver fora, a fila de ontem continua valendo.” |
| Carregando | seis linhas skeleton de 44 px; o botão de coleta vira `Coletando…` e não some |
| Erro | faixa com o texto do servidor + `Tentar de novo`; erro **por fonte** aparece dentro do bloco de referência (`TikTok: bloqueado às 09:41`) e não derruba a tela |

---

## 2. Tela inicial — Carrosséis

Rota `/`. A pergunta que a tela responde: **“o que está esperando meu olho agora?”**

### 2.1 Estrutura

```
┌───────────────────────────────────────────────────────────────────────────┐
│  Carrossel   Carrosséis   Sinais   Configurações              igor@…  Sair │  48 px
├───────────────────────────────────────────────────────────────────────────┤
│  Carrosséis                                                  [+ Novo]     │  22/600
│  6 para aprovar · 3 aprovadas · 2 na semana · meta 5                      │  12 px
│  [ Buscar título, legenda ou hashtag ]        [Ordenar: Atualizado ▾]     │  32 px
│  ( Para aprovar 6 ) ( A produzir 2 ) ( Aprovadas 3 ) ( Publicadas 12 )    │  chips
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐       │
│  │ [capa] título            …   │  │ [capa] título            …   │       │  3 col em
│  │        7 slides · há 2 h  …  │  │        5 slides · ontem   …  │       │  1280
│  └──────────────────────────────┘  └──────────────────────────────┘       │
└───────────────────────────────────────────────────────────────────────────┘
```

- Container `max-w-[1180px]`, padding lateral de 22 px (`--space-page`), 22 px de
  respiro no topo. Filtros em linha, cards em `grid md:grid-cols-2 xl:grid-cols-3`,
  gap de 12 px (`--space-gap`).
- Uma única ação primária preenchida na tela inteira: **Novo**. Tudo o mais é ghost ou
  outline (Regra do Papel de `DESIGN.md`).
- No mobile (390 px): uma coluna, cards de largura total, chips em faixa rolável
  horizontal, `Novo` vira botão de largura total abaixo dos chips.

### 2.2 O que cada cartão mostra

| Zona | Conteúdo | Por quê |
|---|---|---|
| Capa | miniatura 4:5 de 78 px, **renderizada do slide 1** (não tom por id) | reconhecer a peça em 200 ms |
| Linha 1 | título do carrossel em 14,5/600, 2 linhas com clamp | é o nome que ele usa |
| Linha 2 | `7 slides · 1080×1350 · há 2 h` em 12 px `tabular-nums` | densidade que já existe no card atual |
| Linha 3 | etiqueta de estado + `pauta: <título do sinal>` truncada | a pauta de origem fica visível, não escondida |
| Linha 4 | `legenda 312/2.200 · 8 hashtags · 2 fotos` (só quando existem) | sabe se a peça está completa antes de abrir |
| Rodapé | **Abrir** (acento) + `⋯` com Duplicar, Histórico, Link público, Excluir | ações não competem com o título |

O cartão **não** mostra autor. Usuário único (§0, item 3): autor vira linha do histórico
de versões, onde a informação serve para auditar, não para filtrar.

### 2.3 Estado: seis no banco (um deles transitório), quatro abas na tela

Estado é do carrossel, não da pauta. Grava em `carrosseis.estado`.

| Estado | O que significa | Quem produz | Ação primária |
|---|---|---|---|
| `a_produzir` | existe o carrossel (ou a pauta), sem slides prontos | criação em branco, ou pauta aprovada sem geração | **Gerar** |
| `gerando` | pipeline rodando (transitório, com `estado_em`) | o robô | **Acompanhar** (a tela faz polling de 4 s) |
| `pronta` | gerado, lint passou, **falta a legenda ou a imagem** | o robô | **Completar** (abre a aprovação no rail) |
| `aguardando_aprovacao` | peça completa e o olho humano ainda não passou | transição automática de `pronta` quando legenda existe | **Aprovar** |
| `aprovada` | ele clicou Aprovar; pode ser baixada como pacote final | clique | **Baixar / Publicar** |
| `publicada` | ele marcou publicado, com data | clique | **Ver / Duplicar** |

`rejeitada` **não** é estado terminal: rejeitar devolve o carrossel para `a_produzir` e
grava `motivo_rejeicao` + `rejeitada_em`. O motivo fica no histórico e alimenta a
pontuação da próxima coleta (§3.5).

Nota honesta sobre `pronta` × `aguardando_aprovacao`: com uma pessoa só, esses dois
estados ficam a trinta segundos de distância. Os dois existem porque o veredito da
máquina (lint) tem de aparecer **antes** do veredito humano, e porque a partir da Fase 4
a legenda é gerada depois dos slides — então existe um intervalo real em que o carrossel
está “pronto em imagem e sem texto”. Na interface, as duas abas se juntam:

| Aba | Estados que agrupa | Contador |
|---|---|---|
| **Para aprovar** | `aguardando_aprovacao` + `pronta` (com aviso “falta legenda”) | soma |
| **A produzir** | `a_produzir` + `gerando` | soma |
| **Aprovadas** | `aprovada` | contagem |
| **Todas** | todos, inclusive `publicada` | total |

Os seis estados ficam também como chips de filtro, num segundo nível, para quem quiser o
estado exato.

### 2.4 Ordenação, busca, filtros

| Controle | Comportamento |
|---|---|
| Ordenação (select de 32 px) | `Atualizado` (padrão), `Mais antigo parado`, `Data de publicação`, `Título A–Z`. “Mais antigo parado” ordena por `estado_em` ascendente — é o que responde “o que está mofando” |
| Busca | campo único, 32 px, ícone de lupa. Procura em título, **texto da legenda** e hashtags. Debounce de 300 ms, no servidor (`?q=`) — hoje a busca da galeria filtra só o título, no cliente |
| Chips de aba | contagem sempre visível, `aria-pressed`, alvo de 44 px no mobile e 28 px no desktop (o padrão que a galeria já usa) |
| Filtro de fonte | `?fonte=google_news\|tiktok\|instagram\|manual`, para responder “esse lote veio de onde” |
| Filtro de período | `?de=&ate=` sobre `publicada_em`, para fechar o mês |

### 2.5 Ações em lote

Seleção por checkbox de 16 px que aparece no hover do card e no toque longo no mobile;
com 1+ selecionado, a barra de seleção troca o cabeçalho.

| Ação em lote | O que faz | Cuidado |
|---|---|---|
| **Aprovar N** | `POST /carrosseis/aprovar` com lista de ids; responde por id | só aprova o que está `aguardando_aprovacao`; o resto volta em `ignorados[]` com motivo |
| **Baixar N (ZIP)** | um ZIP só, uma pasta por carrossel (`<slug>/<slug>-01.png`, `legenda.txt`, `creditos.txt`) | o navegador bloqueia vários downloads em sequência — por isso é **um** ZIP com subpastas, não N downloads |
| **Marcar publicado** | pede a data (padrão hoje) e confirma | irreversível na prática: confirmação explícita, como o “Marcar publicado” da fila já faz |
| **Excluir N** | dois passos, com o texto do card atual (“apaga o carrossel e todo o histórico”) | — |
| Sem ação de atribuição | não existe “atribuir a” | usuário único |

### 2.6 Os quatro estados obrigatórios da tela inicial

**Normal.** Abas com contagem, grid da §2.1. Com 30+ carrosséis, a paginação é `?pagina=`
com 24 por página e o rodapé diz `1–24 de 58` em `tabular-nums`.

**Vazio.** Três vazios diferentes, não um só:

| Situação | Texto e ação |
|---|---|
| Nenhum carrossel na organização | borda tracejada de 1 px, 40 px de padding: “Nenhum carrossel ainda. Colete sinais para gerar o primeiro, ou crie em branco.” Dois botões: `Ver sinais` (outline) e `Novo` (primário) |
| Aba vazia com outros carrosséis | “Nada em **A produzir**.” + link `Ver todas (58)` |
| Busca sem resultado | “Nada encontrado para *termo*.” + `Limpar busca` |

**Carregando.** Skeleton com a geometria do card real: 78 px de capa, duas linhas de
14 px, uma de 12 px, rodapé de 28 px. Seis cards. Sem spinner central — spinner central
faz a tela piscar a cada troca de aba. Troca de aba com cache em memória: a segunda
visita não mostra skeleton.

**Erro.** Faixa acima do grid, `#B91C1C` sobre `#FEF2F2`, 1 px de borda, com o texto do
servidor e `Tentar de novo`. O grid anterior **não** é limpo. Se o erro for 401, a
camada `apiFetch` renova a sessão uma vez (já faz hoje) e só então a faixa aparece.
Erro de rede no polling de `gerando` **não** é erro de tela: o card mostra o ícone
“sem contato” e volta a tentar em 8 s.

---

## 3. Tela de aprovação individual

Rota `/carrossel/<id>`. A pergunta: **“esta peça está boa? então me dá os arquivos.”**

### 3.1 Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ← Carrosséis      “Harmonização sem exagero”        aguardando aprovação     │ 48 px
├──────────────────────────────────────────┬───────────────────────────────────┤
│                                          │  Slide 3 de 7                     │
│           ┌────────────────────┐         │  ┌─────────────────────────────┐  │
│           │                    │         │  │ Legenda            `Copiar` │  │
│           │   slide 4:5        │         │  │ <texto editável 60–70 ch>   │  │
│           │   escala 1 / 0,9   │         │  │ 312/2.200                   │  │
│           │                    │         │  └─────────────────────────────┘  │
│           └────────────────────┘         │  ┌─────────────────────────────┐  │
│   ‹  ● ● ● ● ● ● ●  ›                   │  │ Hashtags           `Copiar` │  │
│   [1][2][3][4][5][6][7]   filmstrip 92    │  └─────────────────────────────┘  │
│                                          │  8 hashtags · 2 fotos · créditos   │
│                                          │  ── Aprovar (primário)            │
│                                          │  ── Rejeitar com motivo (outline) │
│                                          │  ▸ Baixar PNGs (ZIP)              │
│                                          │  ▸ Baixar este slide              │
│                                          │  ▸ Copiar tudo                    │
│                                          │  ▸ Abrir no editor                │
│                                          │  ▸ Link público                   │
├──────────────────────────────────────────┴───────────────────────────────────┤
│ Salvo · versão 4 · lint: 0 erros, 1 aviso · 1080×1350 · 7 slides            │ 32 px
└──────────────────────────────────────────────────────────────────────────────┘
```

Duas colunas: palco elástico + rail de 360 px fixo (`flex: 0 0 360px`). A barra de
status no rodapé é a mesma ideia da linha de status do editor, com o veredito do lint
dentro — é o que faz a decisão ser informada em vez de estética.

No mobile (390 px): palco em cima com o slide a 100% da largura menos 24 px, filmstrip
logo abaixo, e o rail vira uma folha inferior que abre em 60% da altura com os mesmos
controles. Aprovar e Rejeitar ficam **fora** da folha, colados no rodapé da tela, para
não custar dois toques.

### 3.2 Zona por zona

| Zona | O que a pessoa vê | O que faz |
|---|---|---|
| Palco | slide atual em 4:5, fundo `--canvas`, sombra `--shadow-slide`, setas ‹ › de 44 px | navegar com seta, `←`/`→` e clique na miniatura; `Esc` volta para a lista |
| Filmstrip | 7 miniaturas de 92 px de altura, a atual com anel de 2 px em `--primary` | pular para um slide; mostra o número do slide em `tabular-nums` |
| Rail — Legenda | texto editável (textarea auto-alta), contador `312/2.200` | editar no lugar; salva ao sair do campo (PATCH) e cria versão |
| Rail — Hashtags | a lista em texto corrido, contador `8/12` | editar; hashtag repetida fica sublinhada em âmbar |
| Rail — Meta | `8 hashtags · 2 fotos · créditos: 2` e o crédito de cada foto em 12 px | conferir atribuição antes de publicar |
| Barra de status | `Salvo · versão 4 · lint: 0 erros, 1 aviso · 1080×1350 · 7 slides`; clicar no aviso abre a lista do `lint-carrossel.ts` | entender por que o lint reclamou |

### 3.3 Ações: onde ficam e o que acontece depois do clique

| Ação | Onde | O que acontece no clique |
|---|---|---|
| **Aprovar** | rail, primeiro botão, preenchido em `--primary` | `POST /carrosseis/<id>/aprovar` → `estado=aprovada`, `aprovada_em=now()`; o rail troca para o estado aprovado com `Baixar pacote` como primário; toast `Aprovado · 4 em aberto` com link `Baixar`. **Não** sai da tela |
| **Rejeitar com motivo** | rail, outline `destructive` | abre um painel de 3 linhas com motivos fixos (ver §3.5) + campo livre; ao confirmar → `estado=a_produzir`, `motivo_rejeicao` gravado, e a tela volta para a lista com a aba **A produzir** ativa |
| **Baixar PNGs (ZIP)** | rail, `outline` com ícone de download | renderiza os slides fora da tela com o **mesmo** `useComponentPrinter` do editor (1080×1350, `pixelRatio: 1`) e entrega `<slug>.zip`. Botão passa a `Gerando…` com progresso `3/7`. Falha de um slide não derruba o resto: o ZIP sai com os que deram certo e um aviso `2 de 7 slides não puderam ser convertidos` |
| **Baixar este slide** | rail, ghost; também no menu do slide no palco | baixa `slug-03.png` (2,1 MB médio). Mesmo pipeline, um slide só |
| **Baixar pacote completo** | rail (só depois de aprovado) | ZIP com `<slug>/<slug>-01.png…`, `legenda.txt`, `hashtags.txt`, `creditos.txt` e `carrossel.json` (o documento, para reimportar no editor) |
| **Copiar legenda** | cabeçalho da seção de legenda, 12 px, ghost | `navigator.clipboard.writeText`; toast `Legenda copiada · 312 caracteres`. Falha de permissão → toast com o texto selecionado para `Ctrl+C` |
| **Copiar hashtags** | cabeçalho da seção de hashtags | copia `#a #b #c` em uma linha, separadas por espaço |
| **Copiar tudo** | rail, ghost | um bloco só: legenda, linha em branco, hashtags — o formato que o Instagram aceita colar |
| **Abrir no editor** | rail, ghost no fim | `/carrossel/<id>/editar`, no slide atual |
| **Link público** | rail, ghost | se não existe: `POST /publicar`, copia a URL e mostra `Link ativo · copiado`. Se existe: abre a URL em nova aba com `Revogar` ao lado, em dois passos |
| **Histórico** | rodapé do rail, link discreto `versão 4 · 8 versões` | abre um painel lateral com as versões (versão, motivo, data, autor) e `Restaurar`; restaurar cria versão nova e recarrega a tela |

Regra de ordem no rail: **uma** ação preenchida por vez, definida pelo estado. Em
`aguardando_aprovacao` é `Aprovar`; em `aprovada` é `Baixar pacote`; em `publicada` é
`Duplicar`. Isso mantém a Regra do Papel de `DESIGN.md` sem exceção.

### 3.4 Onde entra o histórico

O diálogo “Histórico” da galeria morre e vira seção do rail. O motivo é o mesmo do resto
do plano: o histórico não é uma propriedade da listagem, é uma propriedade do carrossel.
Único comportamento mantido: restaurar nunca reescreve o passado, cria versão nova
(`carrossel_versoes` já garante com `unique (projeto_id, versao)`).

### 3.5 Rejeitar com motivo

Motivos fixos, em radio (um toque), com campo livre opcional:

| Motivo | Para onde vai |
|---|---|
| `fora do nicho` | conta como descarte na pontuação daquela fonte |
| `texto fraco ou genérico` | entra no padrão medido como exemplo a evitar |
| `pauta sensível` | bloqueia aquele tema por 30 dias (lista `temas_bloqueados`) |
| `já falamos disso` | marca o sinal como usado |
| `erro de fato` | grava `sinal_url` como fonte suspeita e avisa na tela de Sinais |
| outro (campo livre) | só grava |

O motivo é gravado em `carrosseis.motivo_rejeicao` e também em `conteudo_descartes`
(que já existe e já é lida pela métrica de qualidade por fonte). Sem isso, rejeitar seria
perder informação — o mesmo cuidado que a fila tomou com `motivo_descarte`.

### 3.6 O que esta tela não tem, por decisão

Sem “atribuir a”, sem “solicitar revisão”, sem lista de aprovadores, sem comentário em
slide, sem notificação. Aprovar é um clique de quem está olhando. O que fica gravado é
`aprovada_em` e `aprovada_por`, para auditoria — não para fluxo (§0, item 3).

### 3.7 Os quatro estados obrigatórios

**Normal.** §3.1.

**Vazio.** Dois casos:
- Carrossel `a_produzir` sem slides: palco mostra moldura tracejada “Este carrossel
  ainda não tem slides.” + botão primário `Gerar do título` (usa o pipeline com o título
  como tema) e link `Abrir em branco no editor`. O rail mostra legenda vazia e as ações
  de leitura desabilitadas com `title="Sem legenda ainda"`.
- Versão sem legenda: rail mostra “Sem legenda. **Gerar legenda** usa os títulos e o
  corpo dos slides.” com o botão `Gerar legenda` (primário **só** quando não existe
  nenhuma).

**Carregando.** Palco: retângulo de 4:5 em `--muted` com shimmer, na posição final.
Rail: três linhas skeleton de 14 px na legenda, dois blocos de 20 px nas hashtags. Ações
desabilitadas. Nunca um spinner que apaga a tela inteira.

**Erro.** O que der certo continua na tela:
- Falha ao carregar o documento: faixa vermelha + `Tentar de novo`; se for 404
  (`Carrossel não encontrado`), a tela inteira vira um 404 com link `Voltar para
  carrosséis` — e não um card vazio.
- Falha no ZIP: o rail mostra a mensagem e mantém o botão; os slides que converteram
  estão no console e no contador `3/7`.
- Falha ao copiar (permissão de clipboard negada): toast âmbar com o texto aberto num
  `textarea` selecionado, para cópia manual.

---

## 4. Painel de configuração

Rota `/configuracoes`. Quatro abas, uma coluna de 720 px, grupos separados por borda de
1 px (sem cards aninhados). Cabeçalho `Configurações` 22/600 + linha de apoio 12 px.

### 4.1 Aba Metas — o que se mede e como

Metas de **produção** são medíveis hoje, com os dados que existem. Metas de
**desempenho** (alcance, salvamentos, curtidas) não são: dependem da API do Instagram,
que depende da aprovação da Meta (§7). A aba diz isso na cara, para não prometer o que
não mede.

| Meta | Como é calculada hoje | Campo |
|---|---|---|
| Posts por semana | `count(*)` de `publicada_em` na semana corrente | `meta_posts_semana` (1–21) |
| Dias sem post | dias úteis sem `publicada_em` no mês | derivado, sem campo |
| Tempo de sinal até aprovada | `aprovada_em − sinal.coletado_em`, mediana | `meta_aprovacao_horas` (opcional) |
| Taxa de aprovação | `aprovadas / (aprovadas + rejeitadas)` | `meta_aprovacao_min` (%) |
| Custo de IA no mês | soma de `conteudo_ia_uso.custo_estimado` (frente 1 do `PLANO-CONTEUDO.md`) | `meta_custo_mensal_usd` |
| Falhas de coleta | `conteudo_referencias_coletas.fontes` com `erro` | só exibido, sem meta |

Tela: uma linha de 44 px por meta — rótulo à esquerda, `real / meta` em `tabular-nums`
no meio, barra fina de 6 px (`--primary` quando dentro, `#B45309` quando fora) e o campo
de edição à direita. Sem gráfico. O número do mês corrente fica no topo:
`Novembro · 6 de 5 posts · 92% de aprovação · US$ 1,82`.

### 4.2 Aba Fontes — o que entra e de onde

Estado real hoje, medido no código (`apps/api/src/conteudo-fila.ts` e `referencias.ts`):

| Fonte | Como funciona hoje | API / custo | Limite | Risco legal | Veredito |
|---|---|---|---|---|---|
| **Google News (RSS)** | `news.google.com/rss/search?q=<termo>` por termo, parse por regex | sem chave, sem custo | sem limite publicado; responde 429 se martelar | o RSS é público, mas os Termos do Google News não autorizam uso sistemático. Uso pessoal de baixo volume é o cinza onde o produto já vive | **mantém** como fonte principal de pauta |
| **Google Trends BR (RSS)** | `trends.google.com/trending/rss?geo=BR` | sem chave, sem custo | idem | idem | **mantém**, 1 requisição por coleta |
| **TikTok** | via Apify (`apify~tiktok-scraper`), hashtag, `resultsPerPage` | `APIFY_TOKEN`, custo por resultado | `LIMITE_MAXIMO = 30` por coleta, cache de 60 min | **raspagem**: a API oficial de descoberta por hashtag não existe para uso comercial; o Research API é só para acadêmico/ONG aprovado. Raspar viola os Termos do TikTok e pode derrubar IP | **mantém com teto baixo** e rótulo “referência medida, não conteúdo reutilizado” (o que `conteudo_referencias` já documenta) |
| **Instagram** | via Apify (`apify~instagram-scraper`), hashtag | `APIFY_TOKEN`, custo por resultado | 12 por coleta (default), 30 máximo | **raspagem**: a Graph API não tem busca por hashtag para conteúdo geral, e a Hashtag Search para conta Business é limitada a 30 hashtags por 7 dias. Raspar também viola os Termos da Meta | **mantém com teto** até haver app aprovado; depois, troca para a API oficial |
| **Instagram (publicação)** | não existe | Graph API `instagram_content_publish` | 50 publicações/24 h por conta | nenhum, com app aprovado | **fase 8**, bloqueada por burocracia (§7) |

O que a aba mostra por fonte: `ativo` (switch), `termos` (o campo que hoje é “Termos de
busca”, multivalor), `hashtags` (só TikTok/Instagram), `limite por coleta`, custo
estimado do mês, **última coleta** (`há 3 h`) e **último erro** (`429 · 12/11 09:41`).

Regra: nenhuma fonte pode ser desligada sem outra ligada — o botão de desligar a última
fica desabilitado com o motivo no `title`.

### 4.3 Aba Volume — quantos posts por dia

Reaproveita o que existe: `conteudo_config.max_por_dia` (hoje 3) já é o teto aplicado na
geração. A aba apenas o expõe junto do resto.

| Campo | Tipo | Efeito |
|---|---|---|
| Posts por dia | número 1–10 | teto de geração no dia e de publicação marcada para o mesmo dia; a 4ª geração com teto 3 responde `409` com mensagem clara |
| Dias da semana | 7 toggles (seg–dom) | fora dos dias marcados, `Gerar` avisa e não gera |
| Janela de publicação | dois `time` (padrão 09:00–18:00) | usada no calendário de `/sinais` e no aviso de “fora da janela” |
| Gerar automático | switch (padrão **desligado**) | ligado: a coleta que chega de manhã já gera até N carrosséis `aguardando_aprovacao`. Continua valendo “nada publica sozinho” |
| Teto de custo do dia | número em US$ (padrão 2,00) | atingido, a geração para e a tela de Sinais mostra o motivo |

Abaixo dos campos, uma linha de leitura, calculada na hora com os números reais:
`Com 1 post por dia útil, são até 22 carrosséis por mês. O teto de custo de hoje dá
para ~30 gerações.` Nada decorado: sai de `dias_semana` × `teto_custo_dia_usd` ÷ custo
médio por geração (que vem de `conteudo_ia_uso`).

### 4.4 Aba Imagens — os dois bancos, escolhíveis

Decisão do Igor: as duas, escolhível nas configurações. Uma escolha por organização, e a
outra fica a um clique de distância quando a cota estoura.

| Campo | Tipo | Padrão |
|---|---|---|
| Banco de imagens | radio: `Unsplash` / `Pexels` | `Pexels` |
| Usar o outro quando a cota acabar | switch | **ligado** — a tela avisa `veio do Pexels: cota do Unsplash acabou` |
| Crédito na legenda | radio: `não incluir` / `linha no fim da legenda` | `linha no fim da legenda` |
| Tamanho máximo do arquivo | select `1.600 px` / `2.000 px` / `original` | `2.000 px` |
| Cache | só leitura: `34 imagens · 128 MB · 12 buscas em cache hoje` | — |

Fatos verificados na documentação de cada provedor em 12/11/2026:

| | Unsplash | Pexels |
|---|---|---|
| Cota | 50 req/h em modo demo; **1.000 req/h** depois de “Apply for Production” aprovado | **200 req/h e 20.000 req/mês** (padrão); sem limite depois de aprovação |
| Atribuição | exigida pelas API Guidelines: crédito ao fotógrafo **e** link para o perfil/Unsplash | “credite quando possível” — `Foto de Fulano no Pexels` com link é o formato sugerido |
| Custo | zero | zero |
| Cuidado de contrato | precisa disparar o endpoint de download por foto usada; confirmar na implementação | não redistribuir o banco de imagens |

Comportamento comum aos dois: ao escolher uma foto, o arquivo é **baixado e cacheado
localmente** (`conteudo_imagens.url_local`, sha256 para não baixar duas vezes) e o
documento aponta para a cópia local. O carrossel nunca depende da URL do provedor — é o
que impede a peça de quebrar quando a cota estoura ou a foto sai do ar.

A aba **não** tem campo de chave. A chave vive no cofre do servidor e a tela mostra só
`••••4f2a · origem: servidor` e o link que explica onde trocar.

### 4.5 Configurável por organização × global

| Item | Por organização | Global (servidor / código) |
|---|---|---|
| Metas (posts, aprovação, custo) | ✅ `conteudo_config` | — |
| Fontes ativas, termos, hashtags, limites | ✅ `conteudo_fontes` | teto duro: 30 itens por coleta |
| Posts por dia, dias, janela | ✅ | teto duro: 10 por dia |
| Banco de imagens e fallback | ✅ | lista de provedores suportados |
| Crédito na legenda | ✅ | formato do texto |
| Tom de voz, marca (nome, @, avatar) | ✅ — resolve a dívida do `My name`/`@name` | — |
| Chaves de API (Apify, Unsplash, Pexels, Meta) | ❌ | ✅ cofre do servidor |
| Modelo do LLM e custo por 1k | ✅ (frente 1 do plano de conteúdo) | default do ambiente |
| Frases proibidas do lint, regras de 5–10 slides | ❌ | ✅ código (`lint-carrossel.ts`) |
| E-mail/usuários | ❌ | ✅ GoTrue do AutoClinic |

### 4.6 Os quatro estados obrigatórios

**Normal.** Abas à esquerda (vertical tabs de 44 px), formulário à direita, ação
primária única `Salvar alterações` na base. Sem salvar automático: configuração que
muda sem intenção é pior que configuração que exige clique.

**Vazio.** Quando a organização nunca salvou nada, os campos vêm preenchidos com o
padrão do código e uma faixa de 1 px explica: “Estes valores vêm do servidor. Salvar cria
a configuração da organização.” Nenhum campo em branco pedindo adivinhação.

**Carregando.** Skeletons de 32 px nas posições exatas dos campos, 6 linhas. A aba não
recarrega ao trocar de aba depois da primeira visita.

**Erro.** Faixa de 1 px `#B91C1C` sobre `#FEF2F2` acima do grupo, com o texto do servidor
e `Tentar de novo`; **o formulário não é limpo**. Erro de validação é inline, ao lado do
campo (`Posts por dia: máximo 10`), não em faixa.

---

## 5. Fluxo ponta a ponta

1. **Coleta.** 08:00 (America/São Paulo): o coletor lê Google Trends BR e Google News
   por termo de `conteudo_fontes`. Se a coleta falhar, a tela de Sinais mostra o erro e
   o dia continua com o que já estava na fila (§9.4).
2. **Pontuação.** Cada sinal recebe nota com `relevancia`, `recencia`, `novidade` e
   dedupe por hash do título — já implementado. Sinal repetido não entra.
3. **Triagem.** Em `/sinais`, ele vê os sinais do dia. `Virar pauta` gera o briefing
   (ângulo, público, dor, promessa, gancho) por LLM. Sinal descartado guarda o motivo.
4. **Pauta.** A pauta aprovada cria um carrossel em `a_produzir`, com `pauta_id` e
   `sinal_id` gravados. A partir daqui ele não olha mais sinais: olha carrosséis.
5. **Geração de slides.** `POST /conteudo/gerar` roda o pipeline de 6 etapas
   (ideia → plano → copy → criativo → revisão → publicação). Estado vira `gerando`.
6. **Portão.** O lint bloqueante (`lint-carrossel.ts`) roda: 5–10 slides, ≥2 elementos e
   ≥8 palavras por slide, sem emoji, sem frase de IA, capa sem “conheça nosso”, CTA com
   verbo de ação. Erro devolve para o modelo com a lista; aviso só informa.
7. **Legenda e hashtags.** A etapa 6 do pipeline já produz legenda e hashtags. Elas não
   são jogadas na tela: entram em `carrossel_legendas` como versão 1, `origem=ia`, e
   aparecem no rail descrito em §3.2. Se a etapa 6 falhar, o carrossel para em `pronta`
   com “falta legenda” e o botão `Gerar legenda` aparece no rail — não se perde o
   carrossel por causa da legenda.
8. **Imagem.** Duas portas, as duas com o banco escolhido em Configurações:
   (a) sugerida — a etapa 4 do pipeline já devolve o tipo de imagem (`nenhuma`,
   `foto_pessoa`, `textura`, `formas_geometricas`); o rail da aprovação usa isso como
   termo de busca inicial e mostra `2 fotos sugeridas`, que ele aceita com um toque;
   (b) escolhida — `Abrir no editor` › painel de imagens de 320 px, busca livre, escolha,
   crédito exibido. Nos dois casos o arquivo é baixado para o armazenamento local e o
   documento guarda a URL local (§4.4).
9. **Estado `aguardando_aprovacao`.** Automático quando existe legenda e o lint está sem
   erro. O carrossel aparece na aba **Para aprovar** da tela inicial.
10. **Aprovação.** Ele abre `/carrossel/<id>`, vê os 7 slides, confere legenda e créditos,
    clica **Aprovar**. Uma chamada, um carimbo. Se estiver ruim, **Rejeitar com motivo**
    volta para `a_produzir` e o motivo vira dado (§3.5).
11. **Download.** `Baixar pacote completo`: 7 PNGs 1080×1350 + `legenda.txt` +
    `hashtags.txt` + `creditos.txt` + `carrossel.json`. Um ZIP, uma pasta, um clique.
12. **Cópia.** `Copiar tudo` deixa legenda + hashtags na área de transferência, prontas
    para colar no Instagram.
13. **Publicação (manual, hoje).** Ele posta pelo aplicativo. Volta ao app e clica
    `Marcar publicado` com a data; `publicada_em` é gravada e o carrossel sai de
    **Aprovadas**.
14. **Fechamento do mês.** Configurações › Metas mostra `6 de 5 posts`, taxa de aprovação
    e custo de IA. É a única leitura de resultado que não depende da Meta.

Quando a aprovação da Meta sair (Fase 8), o passo 13 troca de “manual” para
“automático” sem mexer em 1 a 12. É por isso que a publicação não é pré-requisito de
nada.

---

## 6. Modelo de dados

### 6.1 Renomeações (o que a decisão 1 custa no banco)

| Antes | Depois | Por quê |
|---|---|---|
| `carrossel_projetos` | `carrosseis` | a tabela nunca foi contêiner; o nome mentia |
| `carrossel_projetos.projeto_id` em `conteudo_fila` | `carrosseis.pauta_id` (invertido) | o carrossel aponta para a pauta, não o contrário |
| `carrossel_versoes.projeto_id` | `carrossel_versoes.carrossel_id` | idem |
| `/api/carrossel/projetos` | `/api/carrossel/carrosseis` | rota diz o que devolve |
| `?projeto=<id>` | `/carrossel/<id>` com `301` | URL sem hierarquia |

`publico_token` e `publico_ativo` **não** mudam de nome nem de valor.

### 6.2 Colunas novas

`carrosseis` (era `carrossel_projetos`)

| Coluna | Tipo | Nota |
|---|---|---|
| `estado` | text + check | `a_produzir\|gerando\|pronta\|aguardando_aprovacao\|aprovada\|publicada` |
| `estado_em` | timestamptz | quando entrou no estado atual; alimenta “mais antigo parado” |
| `pauta_id` | uuid FK → `conteudo_pautas` | o vínculo que substitui `conteudo_fila.projeto_id` |
| `sinal_id` | uuid FK → `conteudo_sinais` | denormalizado de propósito: a tela inicial mostra a origem sem join duplo |
| `capa` | jsonb | `{titulo, fundo, cor_texto, slides}` do slide 1, gravado a cada versão. É o que faz a miniatura ser real sem N chamadas |
| `slug` | text, único por org | nome do arquivo do ZIP (`harmonizacao-sem-exagero-01.png`) em vez de `carousel-01.png` |
| `legenda_id` | uuid FK → `carrossel_legendas` | a legenda vigente |
| `aprovada_em`, `aprovada_por` | timestamptz, uuid | auditoria, não fluxo |
| `publicada_em` | date | o “marcar publicado” |
| `motivo_rejeicao`, `rejeitada_em` | text, timestamptz | o motivo vira dado (§3.5) |
| `lint` | jsonb | `{erros, avisos, gerado_em}` — o veredito que a tela de aprovação mostra |

Índices: `(organization_id, estado, estado_em)` para a tela inicial;
`(organization_id, publicada_em desc)` para metas e período.

`conteudo_pautas` (era `conteudo_fila`)

| Coluna | Mudança |
|---|---|
| `documento` | **sai** — o documento pertence ao carrossel, não à pauta |
| `projeto_id` | **sai** — invertido para `carrosseis.pauta_id` |
| `estado` | passa a `ideia`, `gerada`, `descartada` (o ciclo de vida da pauta termina quando o carrossel nasce) |
| `agendado_para` | **sai** — data de publicação é do carrossel (`publicada_em`) e a intenção de agenda é do carrossel também; pauta não tem data |

`conteudo_config` (por organização)

| Coluna | Tipo | Para quê |
|---|---|---|
| `meta_posts_semana` | int | §4.1 |
| `meta_aprovacao_min` | int (%) | §4.1 |
| `meta_custo_mensal_usd` | numeric(8,2) | §4.1 |
| `dias_semana` | int[] | §4.3 |
| `janela_publicacao` | `tstzrange`-like: `time` + `time` | §4.3 |
| `gerar_automatico` | boolean default false | §4.3 |
| `teto_custo_dia_usd` | numeric(8,2) | §4.3 |
| `banco_imagens` | text check `unsplash\|pexels` | §4.4 |
| `banco_fallback` | boolean default true | §4.4 |
| `credito_na_legenda` | text check `nao\|linha_final` | §4.4 |
| `tom`, `marca_nome`, `marca_handle`, `marca_avatar_url` | text | resolve a dívida do `My name`/`@name` |
| `temas_bloqueados` | text[] + `bloqueado_ate` | o “pauta sensível” de §3.5 precisa de onde morar |

`conteudo_fontes` (nova)

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | uuid PK | |
| `organization_id` | uuid FK | |
| `origem` | text | `google_news`, `google_trends`, `tiktok`, `instagram` |
| `ativo` | boolean | |
| `termos` | text[] | termos de busca (Google) |
| `hashtags` | text[] | TikTok/Instagram |
| `limite_por_coleta` | int | teto duro 30 |
| `ultima_coleta_em`, `ultimo_erro` | timestamptz, text | o que a tela mostra |

`carrossel_legendas` e `carrossel_legendas_versoes` — como no `PLANO-CONTEUDO.md`
frente 2, com `projeto_id` → `carrossel_id` e **sem** os campos de fluxo de revisor.
Duas colunas daquela proposta saem: `aprovada_por` (não há segundo aprovador) e `estado`
(o estado da legenda seria uma segunda cópia de `carrosseis.estado` — a legenda é texto
versionado, o estado é do carrossel).

`conteudo_imagens` e `conteudo_imagens_busca` — como no `PLANO-CONTEUDO.md` frente 3,
com `provedor` aceitando `unsplash|pexels` e `credito_na_legenda` booleano.

### 6.3 Migração, passo a passo

Antes de qualquer DDL, cinco contagens que decidem se a migração é trivial:

```sql
-- 1) todo carrossel nasce de uma linha; se der 0, não há hierarquia a desfazer
select count(*) from carrossel_projetos;
-- 2) linhas de fila que JÁ apontam para carrossel
select count(*) from conteudo_fila where projeto_id is not null;
-- 3) linhas de fila em estado "adiantado" sem carrossel (inconsistência a investigar)
select id, estado from conteudo_fila
 where projeto_id is null and estado <> 'ideia';
-- 4) carrosséis vazios (documento sem slides) — viram a_produzir, não viram órfãos
select count(*) from carrossel_projetos
 where jsonb_array_length(coalesce(documento->'slides','[]'::jsonb)) = 0;
-- 5) links públicos que precisam continuar abrindo
select count(*) from carrossel_projetos where publico_ativo and publico_token is not null;
```

Passos:

1. `alter table carrossel_projetos rename to carrosseis;` e renomear as FKs
   (`carrossel_versoes.projeto_id` → `carrossel_id`). Nenhuma linha se move.
2. Criar `conteudo_pautas` a partir de `conteudo_fila`: copia `id`, `organization_id`,
   `sinal_id`, `briefing`, `estado` mapeado (`ideia→ideia`,
   `rascunho|aprovado|publicado→gerada`, `descartado→descartada`), `motivo_descarte`.
3. Para cada `conteudo_fila` com `projeto_id`, gravar `carrosseis.pauta_id` e
   `carrosseis.sinal_id`. **Nenhum token é tocado**: `publico_token` fica com o mesmo
   valor, e a rota `/p/<token>` continua resolvendo pela mesma consulta, só com o nome da
   tabela novo.
4. `estado` inicial de cada carrossel existente, derivado do que a linha diz:
   | Situação | Estado |
   |---|---|
   | `documento` sem slides | `a_produzir` |
   | tem slides, sem legenda | `pronta` |
   | tem slides e a pauta de origem estava `aprovado`/`publicado` | `aprovada` |
   | tem slides e a pauta estava `rascunho` | `aguardando_aprovacao` |
   | pauta em `publicado` | `publicada`, com `publicada_em` = `conteudo_fila.atualizado_em` |
5. Preencher `capa`, `slug` e `lint` numa passada única (job, não migração): `capa` sai
   do slide 1 do documento; `slug` do título normalizado com sufixo de 4 caracteres do
   id quando colidir; `lint` roda `lint-carrossel.ts` sobre o documento.
6. **Rascunhos do navegador** (`documentFormKey`): a importação que a galeria oferece hoje
   continua na tela inicial por **uma** release, num aviso único — “Existe um rascunho
   salvo neste navegador pelo editor antigo. Importar?”. Depois disso, sai. Apagar o
   rascunho antes de o servidor confirmar seria perder trabalho (o mesmo cuidado que a
   versão atual já toma).
7. `drop table conteudo_fila` só depois de `conteudo_pautas` estar em produção há uma
   semana, com `refresh` comparado linha a linha. Até lá, as duas convivem com escrita
   só na nova.

**Nada fica órfão.** Não existe registro de projeto sem carrossel porque projeto *era* o
carrossel. O que existe são carrosséis vazios (passo 4, linha 1) — eles ficam visíveis em
**A produzir** e são apagáveis pelo próprio Igor, um por um, com o texto de confirmação
que já existe. Apagar em massa por migração seria decidir por ele.

### 6.4 Rollback

Migração em transação única, com `rename` em vez de `create` (barato e reversível) e
`conteudo_fila` mantida uma semana. Reverter é rodar o rename ao contrário; o passo 3 é
o único com dado novo (`pauta_id`, `sinal_id`, `estado`), e ele é aditivo — colunas
extras não quebram o código antigo.

### 6.5 RLS: onde está e onde vai estar

Hoje **não há RLS** neste banco. O controle é na API: `papelMinimo(path, metodo)` em
`apps/api/src/server.ts`, por `app_usuarios.papel` (`owner|admin|operador`) e
`organization_id`, com `404` em vez de `403` para não confirmar existência de id alheio.

Regra desta entrega: **manter a autorização onde ela já está** e não abrir um segundo
modelo de permissão no meio de uma mudança de UI. Criar RLS agora, com um usuário só,
seria tranca para um risco que ainda não existe — e RLS mal feito derruba a API inteira
de uma vez.

Gatilho declarado para RLS: **a segunda organização real com usuário ativo**. Quando
acontecer, as políticas já estão desenhadas:

| Tabela | Política |
|---|---|
| `carrosseis`, `carrossel_versoes`, `carrossel_legendas`, `conteudo_pautas`, `conteudo_imagens`, `conteudo_fontes`, `conteudo_config` | `organization_id = current_setting('app.org')` no `using` **e** no `with check` |
| `conteudo_sinais`, `conteudo_referencias`, `conteudo_padroes` | idem (dado de cliente: pauta e medição) |
| `admin_log` | leitura só por `admin`/`owner` da org; escrita só pela API |
| Nenhuma tabela é acessível pelo navegador | o Next fala com a API por BFF (`/api/ac/<caminho>`); RLS aqui é a segunda tranca, não a primeira |

O único dado que sai da organização hoje é o `/p/<token>`, e ele sai por uma única
consulta que devolve **só** título e documento — sem autor, sem organização, sem id
interno. Isso não muda.

---

## 7. Fases

Dias de engenharia, um desenvolvedor. “Pode começar sozinha” = sem depender de decisão
externa nem de credencial.

| # | Fase | Entrega | Dias | Depende de | Sozinha? |
|---|---|---|---|---|---|
| 0 | **Renomear a fundação** | `carrosseis`, `conteudo_pautas`, colunas de estado/capa/slug, redirect `?projeto=`, API `/carrosseis`, `scripts/qa-carrossel-api.mjs` atualizado (22 casos) | 2 | — | **Sim** |
| 1 | **Tela inicial** | `/` com abas, cartões com capa real, busca no servidor, 4 estados, ações em lote | 3 | 0 | **Sim** |
| 2 | **Tela de aprovação** | palco + filmstrip + rail, aprovar/rejeitar, ZIP por slide e pacote, copiar legenda/hashtags, histórico | 4 | 1 | **Sim** |
| 3 | **Painel de configuração** | `/configuracoes` com Metas, Fontes, Volume, Imagens; `conteudo_fontes`; tetos duros | 3 | 0 | **Sim** |
| 4 | **Legendas** | geração a partir dos slides, versões, edição no rail, `Gerar legenda` | 3 | 2 | sim, com config fixa no código |
| 5 | **Banco de imagens** | Pexels + Unsplash, escolha por org, cache local, atribuição na tela, no ZIP e no `/p/<token>` | 4 | 3 | sim (chaves são cadastro, não código) |
| 6 | **Metas** | cálculo e leitura `real/meta`, mês corrente | 2 | 3 | **Sim** |
| 7 | **Sinais** | `/sinais` enxuta: coletar, virar pauta, ver erro por fonte, qualidade por fonte | 3 | 3 | **Sim** |
| 8 | **Instagram (publicação)** | OAuth, container por slide, publicar, registro | 3 + **4–8 semanas de calendário** | 4, 5, aprovação da Meta | **Não** |

Total de engenharia: **24 dias** (0 a 7). A fase 8 não entra nessa conta porque o
trabalho dela é curto e a espera dela é longa.

### 7.1 Ordem e o que entrega primeiro

```
0 (2d) ──► 1 (3d) ──────────────────────► 2 (4d) ──► 4 (3d) ──► 8 (Meta)
                    └──► 3 (3d) ──┬──► 5 (4d) ──────────────┘
                                  └──► 6 (2d)
                                  └──► 7 (3d)
```

**Em uma semana, sozinho: fases 0 + 1.** O produto deixa de ter galeria de projetos e
passa a ter caixa de entrada de carrosséis, com estado de verdade e miniatura real. Isso
já responde ao pedido principal do áudio, sem depender de nenhuma conta externa.

**Em duas semanas: 0 + 1 + 2.** O ciclo “vê → aprova → baixa → copia” fecha, e o dia de
trabalho passa sem abrir o editor uma vez.

**O que depende de terceiro, e não pode travar nada:** chaves de Unsplash/Pexels (cadastro
gratuito, minutos) e aprovação da Meta (semanas). A fase 5 roda em modo demo — 50
requisições/hora no Unsplash e 200 no Pexels são suficientes para um operador sozinho — e
a fase 8 começa quando a aprovação sair, sem tocar em 0–7.

### 7.2 O que sai do plano anterior

O `PLANO-CONTEUDO.md` (ramo `docs/impeccable-carrossel`) planejou cinco frentes. Com as
três decisões de hoje, três delas mudam de tamanho:

| Frente anterior | Destino |
|---|---|
| 1. Configurações da IA | vira a aba **Metas**/**Volume** + uma seção “Modelo” dentro de Configurações. Sem tela própria |
| 2. Legendas e descrições | fase 4, **sem** o mini-fluxo de revisor (`aprovada_por` sai) |
| 3. Banco de imagens | fase 5, com **os dois** provedores escolhíveis |
| 4. Agendamento com executor | **encolhe para data no carrossel.** Executor de fila só se justifica quando existir publicação automática — hoje “agendar” é escrever uma data e olhar o calendário |
| 5. API do Instagram | fase 8, igual |

---

## 8. Critérios de aceite

Verificáveis: URL, SQL, teste de rota ou olho. Nada de “ficou bom”.

### 8.1 Tela inicial

1. `/` responde 200 autenticado e redireciona para `/login?de=/` sem sessão.
2. `/projetos` responde 301 para `/`.
3. `/?projeto=<id>` responde 301 para `/carrossel/<id>`.
4. Nenhum texto visível nas telas com a palavra “projeto” (asserção no teste de UI
   varrendo o DOM das rotas `/`, `/carrossel/<id>`, `/sinais`, `/configuracoes`).
5. Com 3 carrosséis `aguardando_aprovacao` e 2 `aprovada`, a aba **Para aprovar** mostra
   `3` e só eles (SQL conferido contra a tela).
6. O cartão mostra a cor de fundo do slide 1 do documento — comparação de pixel da
   miniatura contra o mesmo slide renderizado no editor (tolerância 2/255 por canal).
7. Busca por uma palavra que aparece **só na legenda** devolve o carrossel (hoje não
   devolveria: a busca atual é só de título, no cliente).
8. 4ª geração no mesmo dia com `max_por_dia = 3` responde 409 e a tela mostra
   a mensagem.
9. Os quatro estados (§2.6) com `?estado=vazio|carregando|erro` no ambiente de dev.
10. `axe` sem violação `critical`/`serious` em `/` nos dois tamanhos, 390 e 1280 — mesmo
    portão de `tests/visual/acessibilidade.spec.ts`.

### 8.2 Tela de aprovação

1. Aprovar grava `estado='aprovada'`, `aprovada_em` e `aprovada_por` (verificável por
   SQL) e a tela não navega.
2. Rejeitar com motivo grava `estado='a_produzir'`, `motivo_rejeicao` e uma linha em
   `conteudo_descartes` com o mesmo motivo.
3. `Baixar PNGs` produz um ZIP com 7 arquivos nomeados `<slug>-01.png` … `<slug>-07.png`,
   cada um com 1080×1350 confirmado por leitura do PNG (não por confiança no código).
4. Cada PNG do ZIP, aberto, mostra a mesma imagem que o slide no palco — comparação visual
   em 2 slides, um com foto e um com fundo procedimental.
5. `Copiar legenda` coloca no clipboard o texto exato do textarea (teste com
   `navigator.clipboard.readText` no Playwright, com permissão concedida).
6. `Copiar tudo` devolve legenda, linha em branco, hashtags — nessa ordem.
7. Restaurar a versão 1 cria a versão `n+1` com o conteúdo da 1 e o histórico continua
   com todas as linhas (`select count(*)` antes e depois).
8. `/p/<token>` de um carrossel aprovado abre; do mesmo carrossel depois de revogado
   devolve 404; e o crédito da foto aparece na página pública.
9. Os quatro estados (§3.7), incluindo 404 de id inexistente.

### 8.3 Configurações

1. Salvar `banco_imagens='unsplash'` e buscar uma foto no editor devolve resultado do
   Unsplash (verificável no log da requisição externa).
2. Com `banco_fallback` ligado e o Unsplash respondendo 429 (simulado), a busca devolve
   resultado do Pexels **e** o aviso `veio do Pexels: cota do Unsplash acabou`.
3. `conteudo_imagens.url_local` é o que aparece no documento; apagar a foto do provedor
   (ou revogar a chave) não quebra o carrossel — o PNG continua saindo.
4. A resposta de `GET /api/conteudo/config` nunca contém chave de provedor — só o `hint`
   de 4 caracteres (asserção na rota).
5. `meta_posts_semana = 5` com 3 posts publicados no mês mostra `3 / 5` e barra em
   `#B45309`; com 6, mostra `6 / 5` e barra em `--primary`.
6. Desligar a única fonte ativa é bloqueado, com o motivo visível no `title`.
7. Os quatro estados (§4.6).

### 8.4 Fluxo e migração

1. Contagens de §6.3 rodadas antes da migração, com os números registrados no PR.
2. Depois da migração: `select count(*) from carrosseis` = `select count(*) from
   carrossel_projetos` de antes (nenhuma linha criada nem perdida), e todo
   `publico_token` ativo continua resolvendo em `/p/<token>` (teste automatizado para os
   5 primeiros tokens reais).
3. Nenhum carrossel com `estado` nulo; nenhum com `estado='aprovada'` sem `aprovada_em`.
4. Geração real de um carrossel de 7 slides, com pauta de origem, legenda e 2 fotos, do
   sinal até o ZIP — o teste de fumaça que fecha a entrega. Roda em dev, com uma conta.
5. `scripts/qa-carrossel-api.mjs` (no repositório do AutoClinic) roda verde com as rotas
   novas — os 22 casos, incluindo projeto de outro autor respondendo 404, documento igual
   sem gerar versão, restaurar criando versão nova, link revogado fechando na hora. O
   mesmo script roda verde contra o código antigo antes do merge (prova do rollback).

---

## 9. Riscos

### 9.1 O que quebra quando o projeto sai

| Risco | Probabilidade | Impacto | Como resolver sem voltar atrás |
|---|---|---|---|
| **Link público já enviado ao cliente para de abrir** | baixa se `publico_token` não for tocado; **alta** se alguém “limpar” a tabela no rename | crítico — cliente com link morto | migração preserva o valor de `publico_token` byte a byte; a consulta de `/p/<token>` só muda o nome da tabela; teste automatizado percorre os tokens ativos antes e depois (§8.4.2) |
| Favoritos e links internos com `?projeto=` morrem | certa | baixo | `301` para `/carrossel/<id>` no `next.config.js` |
| Histórico de versões perde o vínculo | baixa | alto | FK renomeada na mesma transação; `on delete cascade` continua; contagem de `carrossel_versoes` antes/depois comparada |
| `conteudo_fila` com estado adiantado e sem carrossel (inconsistência) | média — depende dos dados reais | médio | contagem 3 de §6.3 antes de migrar; linha inconsistente vira pauta `gerada` e o carrossel é criado a partir do `documento` da fila |
| Carrosséis vazios poluem a tela inicial | alta | baixo | viram `a_produzir`, visíveis e apagáveis um por um; a migração **não** apaga nada |
| Duas tabelas convivendo (fila antiga e pautas) divergem | média | médio | escrita só na nova desde o dia 1; `drop` só depois de uma semana com refresh comparado |
| Alguém reintroduz a palavra “projeto” por hábito | alta | baixo | critério de aceite 8.1.4 varrendo o DOM |
| **A régua de QA da API fica cega na migração** | alta se a Fase 0 não incluir o script | alto — é o único teste de regressão do carrossel | `scripts/qa-carrossel-api.mjs` (184 linhas, 22 casos) chama `/api/carrossel/projetos` em quase toda asserção. Atualizar as rotas **no mesmo PR** da Fase 0 e rodar o script contra o código antigo e o novo (§8.4.5) |

### 9.2 Scraping que pode ser bloqueado

| Fonte | Como quebra | Sinal | O que fazer |
|---|---|---|---|
| Google News (RSS) | 429 ou tela de consentimento no lugar do XML | `parseRss` devolve 0 itens; `fontes[].erro` preenchido | backoff de 3 tentativas (1, 5, 15 min), depois marca a fonte em erro até o dia seguinte; a tela de Sinais mostra `Google News: bloqueado às 09:41` e o dia continua com a fila |
| Google Trends | feed muda de formato ou some | 0 itens | idem; Trends é fonte de bônus — perder não impede o dia |
| TikTok via Apify | ator quebrado, token sem crédito, IP barrado | erro do ator no relatório de coleta | trocar o ator (na API ele já é parâmetro, `ator`, e não constante), depois desligar a plataforma por 24 h e avisar na tela; **nunca** cair para scraping direto do domínio |
| Instagram via Apify | login exigido, bloqueio de IP, mudança de markup | erro do ator | mesma escada do TikTok. Aceitar o custo de perder referência de IG até a API oficial |
| Qualquer fonte | coleta inteira falha | `conteudo_referencias_coletas.fontes` com erro | a geração continua funcionando com pauta manual (`Novo` → título → gerar). **A coleta nunca é pré-requisito de gerar** |

Regra transversal: falha de fonte é **degradação visível**, não exceção silenciosa. Toda
coleta grava o relatório por plataforma que `conteudo_referencias_coletas.fontes` já
guarda — a tela de Sinais é obrigada a mostrá-lo.

### 9.3 Cota de API

| API | Cota (12/11/2026) | Consumo esperado | Margem | Plano B |
|---|---|---|---|---|
| Unsplash | 50/h demo, 1.000/h produção | 1 busca + 1 download por carrossel ≈ 20/h num dia cheio | demo já serve para 1 pessoa | Pexels por fallback |
| Pexels | 200/h, 20.000/mês | idem | muito folgada | Unsplash por fallback |
| Apify (referências) | por crédito, custo por resultado; limite duro 30/coleta nesta casa | 2 coletas/dia × 30 = 60 resultados/dia | depende do plano contratado | desligar TikTok/IG e viver de Google News; o briefing continua funcionando |
| Google News/Trends | sem cota publicada | 1 requisição por termo por coleta ≈ 8/dia | alta | — |
| Meta Graph (fase 8) | 50 publicações/24 h, 25 containers simultâneos | 1–3/dia | alta | publicar manualmente |

Cache obrigatório onde o custo é por uso: busca de imagem (24 h por termo, tabela já
planejada) e coleta de referência (60 min por assinatura de hashtags, já implementado).

### 9.4 Quando a fonte de conteúdo falha

Playbook, na ordem, sem decidir no escuro:

1. **Fila não vazia?** Gere do que já está lá. Coleta é entrada, não portão.
2. **Fila vazia?** `Novo` → título → gerar do título (o pipeline aceita tema em texto).
3. **Fonte bloqueada 24 h?** A tela de Sinais mostra o erro e a hora. Não insiste: martelar
   transforma bloqueio temporário em bloqueio permanente.
4. **Fonte bloqueada 3 dias seguidos?** A aba Fontes marca a fonte como `instável` e
   sugere desligar. Decisão dele, não do robô.
5. **Tudo falhou e ele precisa de post hoje?** O editor e o ZIP não dependem de nada
   externo — exceto imagem, e imagem tem cache local. O produto degrada até “carrossel
   feito à mão, com fundo procedimental”, que é o que ele já faz hoje.

### 9.5 Riscos que vêm das decisões, ditos na cara

| Risco | Por quê | Mitigação |
|---|---|---|
| Sem projeto, sem agrupamento por campanha | se um dia ele quiser “os carrosséis do lançamento de janeiro”, não há onde marcar | a busca e o período cobrem 90% disso. Se doer de verdade, volta como campo de texto opcional — não como tabela. **Não** implementar preventivamente |
| Usuário único esconde o custo de multiusuário | `autor_id`, `aprovada_por` existem, mas nada no desenho é testado com duas pessoas | manter os campos e o 404-para-id-alheio da API; quando o segundo usuário chegar, a UI já tem os dados para decidir o fluxo |
| Dois bancos de imagem dobram a superfície | duas autenticações, dois formatos de resposta, duas licenças | contrato único normalizado (`{id, thumb, largura, autor, atribuicao}`) e atribuição gravada por imagem — uma mudança de licença não reescreve histórico |
| Aprovação em um clique, sem segunda opinião | peça fraca passa | o lint continua bloqueante e visível na barra de status; a taxa de aprovação é medida em Metas — o freio é dado, não pessoa |

---

## 10. O que este plano não decide

Três coisas ficam para o Igor, e nenhuma trava a Fase 0 nem a Fase 1:

1. **Marca na organização** (nome, @, avatar) — passa a ser configuração da organização e
   resolve o `My name` de todo carrossel novo. Se ele quiser manter a marca por carrossel
   (para o dia em que houver dois clientes), é uma linha em `conteudo_config` e um
   seletor no editor. Proposta: organização como padrão, carrossel pode sobrescrever.
2. **Gerar automático** ligado ou desligado por padrão. Proposta: desligado. Ele acorda,
   vê 5 carrosséis prontos, aprova 3. Ligar antes de confiar na qualidade enche a caixa de
   entrada de coisa que ele vai rejeitar — e rejeição em massa ensina o modelo errado.
3. **Instagram**: quando começar a papelada da Meta. O código são 3 dias; o calendário são
   4 a 8 semanas. Quanto antes começar, menos ele depende do ZIP no fim do ano.
