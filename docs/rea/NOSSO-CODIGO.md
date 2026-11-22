# Recon do nosso código — o que havia e o que o clone reaproveita

Repo: `igorgomes3/carousel-generator` (Next 14 App Router, TypeScript, Tailwind).
Deploy atual: `https://carrossel.149-56-214-54.sslip.io` (Traefik → API do AutoClinic).

## Rotas antes

| rota | o que era | destino no clone |
|---|---|---|
| `/` | lista de carrosséis com abas, busca, filtro de fonte, paginação — cara de painel de operador | **estúdio** (wizard) |
| `/sinais` | fila de conteúdo por notícia (sinais + aprovação + calendário) | **removida** |
| `/carrossel/[id]` | ficha do carrossel (estado, versão, link público) | mantida |
| `/carrossel/[id]/editar` | editor denso (inspetor, filmstrip, seletor de tema) | mantido como tela secundária, sem tema |
| `/configuracoes` | marca da organização | mantida |
| `/login` | e-mail + senha (proxy `/api/auth/*` → AutoClinic) | mantida |
| `/p/[token]` | link público somente leitura | mantida |

## Chamadas de API

- `/api/ac/*` → proxy server-side para a API do AutoClinic (`AUTOCLINIC_API_URL`, default `http://100.87.192.48:8097`). Usado para `GET/PATCH /carrossel/carrosseis`, marca, configurações.
- `/api/auth/login`, `/api/auth/refresh` → sessão própria (access em memória, refresh em `localStorage`, cookie `ac_sessao=1` só como marcador para o middleware).
- `/api/conteudo/gerar` → rota interna (segredo `CONTEUDO_INTERNO_TOKEN`) que a fila do AutoClinic chama. **Mantida** por compatibilidade de contrato; fora da UI.
- `/api/proxy` → proxy de imagem.

## Onde o texto nasce (reaproveitado inteiro)

- `src/lib/conteudo.ts` — pipeline de 6 etapas (ideia → plano → copy → criativo → revisão → publicação) com Zod + normalização de campos que o modelo erra (tom, função do slide, posição).
- `src/lib/gerar-documento.ts` — `gerarDocumentoCompleto(tema, apiKey, slides)`: planeja, escreve, faz lint (`lint-carrossel.ts`), tenta de novo listando os defeitos, e veste o documento.
- Modelo: `/v1` compatível com OpenAI apontando para o 9Router local (`OPENAI_BASE_URL=http://127.0.0.1:20128/v1`, `OPENAI_MODEL=flash`).

O clone chama **esse mesmo pipeline** em `/api/gerar` e converte a saída para o contrato do estúdio (`SlideCarrossel`). Nada de prompt novo solto na tela.

## Onde a imagem deveria nascer (não existia)

Não havia nenhuma geração de imagem: `themes.ts` + `pallettes.tsx` + `background-styles.tsx` só pintavam fundo (sólido, gradiente, ruído). O editor aceitava upload (`ImageSourceFormField`) e URL.

Agora: `POST /api/imagem` → 9Router `/v1/images/generations` (`IMAGEM_MODEL`, default `cx/gpt-image-2.5`), job assíncrono em memória + `GET ?job=` para poll, saída em `data:image/...;base64`. Mesmo desenho do `/api/art` do CarrosseIA.

## Render e export (o que sobrou de útil)

- `src/components/pages/*` (`CommonPage`, `PageBase`) — render DOM dos slides do editor antigo, com `id="page-base-N"`.
- `src/lib/hooks/use-component-printer.tsx` — export PNG 1080×1350 via `html-to-image` + ZIP (`jszip`), com limpeza do DOM do editor antes de rasterizar. Continua servindo o editor.
- O estúdio usa um render próprio (`src/components/estudio/cartao.tsx`) porque o card do alvo é um layout fechado (manchete caixa-alta sobre foto, barra "arrasta", card escuro) e não a pilha título/subtítulo/descrição do editor. Export: `src/lib/estudio/exportar.ts` (mesmos 1080×1350 e ZIP, esperando `document.fonts.ready`).

## O que foi removido

- `src/app/sinais/page.tsx` (fila de sinais — a origem era pauta de notícia; o CEO proibiu Google News).
- Link "Sinais" na navegação; o vazio da lista agora leva ao estúdio.
- Seção "Tema" do inspetor do editor (`ThemeForm`) — a cor vem do template do estúdio.
  `themes.ts`/`pallettes.tsx` continuam no repo porque o documento antigo ainda os lê ao
  abrir carrossel salvo (compatibilidade), mas nenhuma tela oferece escolher tema.

### Issue #8 (21/11/2026) — o resto da remoção

A primeira passada tirou a tela de tema e a rota `/sinais`, mas deixou duas portas
abertas. O que fechou nesta rodada (detalhe em
`docs/design/issue-8-remocao-temas-e-noticias.md`):

- `src/components/sugestoes-panel.tsx` **apagado**: era o painel "Sugestões para aprovar"
  dentro do editor, lendo `GET /conteudo/fila` — o último caminho de notícia até a tela.
- `src/lib/themes.ts`, `src/lib/pallettes.tsx`, `src/lib/theme-utils.ts`,
  `src/components/forms/theme-form.tsx`, `src/components/color-theme-display.tsx`
  **apagados**. Não era verdade que o documento antigo precisa deles: a cor sempre veio
  de `config.theme.primary/secondary/background`, nunca do nome da paleta. O campo
  `pallette` continua no schema como legado.
- `src/lib/compat/documento-salvo.ts` (novo): todo documento salvo passa por um
  normalizador que preenche campo por campo. Antes, um campo fora do schema fazia o
  carrossel abrir em branco.
- `src/lib/fonts-map.tsx`: `fontIdToClassName` não estoura mais com fonte desconhecida
  (era `fontsMap[id].className` direto — fonte aposentada derrubava o editor).
- `src/lib/hooks/use-persist-form.tsx`: rascunho local que não bate com o schema é
  normalizado, não apagado com `localStorage.clear()`.
- Fonte de pauta nova: campo de tema livre + "Minhas pautas"
  (`src/lib/estudio/pautas-salvas.ts`, `localStorage`).
- `/api/conteudo/gerar` **permanece**: contrato com a fila da API do AutoClinic, fora da UI.

## O que foi adicionado

- `src/lib/templates.ts` — 30 templates do CarrosseIA (paleta, display, body, layout, `capaIA`, `styleText`), chips de categoria, `pilhaFonte()`.
- `src/lib/estudio/tipos.ts` — contrato `CarrosselGerado`/`SlideCarrossel`.
- `src/components/estudio/cartao.tsx` — card 1080×1350 (capa foto+manchete, conteúdo, CTA), escala por `transform`.
- `src/components/estudio/estudio.tsx` — wizard: ideia → tema → gerando → pronto (baixar).
- `src/app/api/gerar/route.ts`, `src/app/api/imagem/route.ts`.
- `src/lib/estudio/exportar.ts`, `scripts/prova-estudio.mjs` (gate visual).
