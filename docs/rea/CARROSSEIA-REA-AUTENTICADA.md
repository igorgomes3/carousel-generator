# REA autenticada — CarrosseIA (sessão real, 21/11/2026)

Método: login pelo cofre (`browser_vault`, handle do Igor), depois inspeção do DOM e captura de rede com wrap de `window.fetch`. Nenhuma senha foi digitada, lida ou registrada.

## Autenticação e backend

- Supabase project `afzzgrdphccvvbumqhjm.supabase.co`; login por `POST /auth/v1/token?grant_type=password`.
- Sessão alimenta o cabeçalho: `créditos` (30 ao entrar), avatar, `Ver Planos`.
- Sem 2FA, sem CAPTCHA no login (só o challenge de Cloudflare na borda).

## Modelo de dados (observado nas chamadas REST)

| tabela | colunas vistas / uso |
|---|---|
| `profiles` | `creditos`, `plano`, `plano_pago`, `plano_ate`, `is_admin`, `ref_code` |
| `projects` | `title`, `aspect`, `handle`, `plan` — o documento inteiro em JSON: `plan.style{font_display,font_body,layout,palette{bg,text,muted,accent},template_id,coverLayout}` + `plan.slides[{type,tag,title,body}]` |
| `modelos` | `id`, `nome`, `preset`, `padrao`, `criado_em` — os templates vêm do banco (`limit=30`), não do JS |
| `brand_kits` | `nome`, `palette` — paletas salvas |
| `mcp_drafts` | rascunhos criados via Claude MCP |

## Endpoints e contratos reais

| endpoint | request | response |
|---|---|---|
| `POST /api/quick` | `{ideia}` | `{template:"marketing", cards:7, nicho:"Marketing digital", auto:false}` em ~2,4 s |
| `POST /api/generate` | `{topic, style, look, capaRegra, slides:7, refs:[], coverMode:"scene", coverPrompt:""}` | `{style:{font_display,font_body,layout,palette}, slides:[{type:"hook"\|"content"\|"cta", tag, title, body}]}` em ~20 s |
| `POST /api/art` | `{prompt, style, quality, size, allowText}` | **202** `{jobId}` |
| `GET /api/art?job=` | — | poll até pronto (base64) |
| `POST /api/origem` | `{origem, detalhe}` | `{ok:true, origem:"google", mercado:"br"}` (instrumentação) |
| `POST /rest/v1/projects` (Supabase) | documento do carrossel | grava o projeto; `aspect:"3:4"` |

Sequência de uma criação completa (timings reais): `/api/quick` 2,4 s → `/api/generate` 20,3 s → `projects` INSERT → `brand_kits` GET → `/api/art` POST 202 → poll.

## O wizard, como ele é de verdade (4 passos)

Stepper: **1 Templates · 2 Tema · 3 Roteiro · 4 Imagens**

**Passo 1 — Templates (home).** "✨ Criação rápida com IA" com textarea `qkIdea` (`0/400`) e botão `✨ Criar com IA · 13 créditos`; abaixo "OU ESCOLHA UM TEMPLATE PARA COMEÇAR" com chips (`Todos`, `DIREITO`, `SAÚDE`, `VIRAL`, …) e grade `tpl-grid` de 30 `button.tpl-card[data-tpl]`. Clicar no card abre **modal de preview** (`tplPrevClose`, setas, miniaturas, `tplPrevUse` "Usar esse template").

**Passo 2 — Tema.** "Sobre o que é o carrossel?" com:
- `topic` (textarea) e `topicLink` (opcional: "a IA lê a página e usa como base");
- **Slides −/+ (padrão 7)**;
- faixa de miniaturas numeradas 1..N para **upload de imagem por card** (card 1 marcado "✨ IA · CAPA");
- capa: `Gerar com IA` vs `Subir minha capa`, mais `coverPrompt` ("descreva a cena; se vazio, a IA cria a partir do tema");
- CTAs: `genPlan` "Gerar roteiro · 13 créd." e `importPlan` "Já tenho o texto, importar";
- durante a geração o botão vira "Escrevendo o roteiro (pode levar ~30s)".

**Passo 3 — Roteiro e ajustes** (é aqui que o produto ganha densidade):
- **Tamanho da arte (OBRIGATÓRIO)**: `Retrato 3:4` (padrão; copy explica que 3:4 ocupa mais tela e o texto nasce dentro da área 4:5 que a grade do perfil corta), `Retrato clássico 4:5`, `Quadrado 1:1`;
- `@ do Instagram` (opcional, aparece nos cards);
- **Fonte de título** e **fonte de corpo**: listas longas (Anton, Bebas Neue, Archivo Black, Oswald, Montserrat, Space Grotesk, Poppins, Playfair, DM Serif, Baloo 2, Fjalla One, Teko, Kanit, Barlow Condensed, Abril Fatface, Alfa Slab One, Righteous, Bungee, Syne, Unbounded, Sora, Rubik, Big Shoulders, Lexend / corpo: Inter, Nunito, Poppins, DM Sans, Work Sans, Manrope, Roboto, Open Sans, Karla, Mulish, Figtree, Public Sans, IBM Plex Sans…);
- **Paleta clicável**: Fundo, Texto, Secundária, Botões;
- **Logo da marca em todos os cards** e **upload de fonte própria** ("diferencial");
- **Roteiro card a card**: `01 Hook · abertura` + título + corpo editáveis + "Palavra de impacto (gigante, na cor de destaque)";
- **"Gerar capa com IA?"** com aviso de custo ("10 créd. ao gerar") e prompt da ilustração;
- CTA `toImages` "GERAR CARROSSEL · 10 créd.".

**Passo 4 — Imagens.** "Cards desenhados na hora, com tipografia nítida em PNG. Baixe individual ou tudo em .zip." Durante o render: `#loading` com `#progBar` e sublegendas ("Montando os cards…", "carregando a tipografia…", "Desenhando a tipografia"). Ações: `Voltar ao roteiro`, `Novo carrossel`, e por card as opções de download.

## Paywall / créditos (observado)

- Entrada com 30 créditos; roteiro consumiu 3; artes 10 (+ redundância na 1ª tentativa): saldo foi a 14 e depois 4.
- Sem plano: "a capa e as fotos de cada projeto ficam guardadas por 7 dias depois da última edição. Texto e layout continuam aqui."

## Meus projetos

Painel lateral (`projPanel`) com lista: título, data, `Abrir`, `✎` renomear, `🗑`, `✨ Usar este visual`.

## Defeito do alvo que vale saber

O render do passo 4 **trava em "Desenhando a tipografia"** quando as fontes remotas não carregam (sessão nova, cache frio): os cards nunca aparecem e não há timeout nem erro. É o motivo de o download ficar inalcançável nesse estado. No nosso clone isso é tratado com `document.fonts.ready` + fallback de família local.

## Prints

`/root/rea/shots-auth/`: `01-home-1440/390`, `02-template-1440`, `03-preview-1440`, `04-gerando-1440`, `06-passo3-4-1440`, `09-rodeiro-1440`, `11-meus-projetos-1440`, `12-resultado-1440`, `13-resultado-390`.

## O que isso muda no clone (deltas a implementar)

1. Passo 2 com **controle de nº de cards** e **upload por card** — hoje o nosso vai direto de tema a geração.
2. Passo 3 (roteiro editável) com **aspecto 3:4 padrão + área segura 4:5**, **@ do usuário**, **paleta e fontes editáveis**, **logo da marca**.
3. **"Gerar capa com IA?" como escolha explícita** com prompt opcional (hoje é automático por template).
4. **Salvar o projeto** (`projects`) para o "Meus projetos" com Abrir/renomear/deletar — hoje o nosso carrossel é descartável.
5. Aceitar **link de matéria** como entrada (`topicLink`), sem depender de Google News.
