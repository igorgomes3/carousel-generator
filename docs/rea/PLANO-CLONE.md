# Plano — clone do CarrosseIA na nossa base (UI/UX radical)

Mapa Wayfinder: https://github.com/igorgomes3/carousel-generator/issues/2

## O que o alvo faz (evidência em `docs/rea/CARROSSEIA-REA.md`)

Funil de 4 passos numa única tela: **template → tema → gera (texto + capa IA) → edita e baixa PNG**.
Capa por IA (`gpt-image-1`, async job), cards desenhados em canvas 2D 1080×1350, 13 créditos por carrossel.

## O que já temos (recon do nosso código)

| peça | onde | estado |
|---|---|---|
| pipeline de texto em 6 etapas | `src/lib/conteudo.ts`, `src/lib/gerar-documento.ts` | pronto e testado (`conteudo.test.ts`) |
| documento (schema) | `src/lib/validation/*`, `src/lib/default-document.tsx` | pronto |
| render dos slides | `src/components/pages/*` (`CommonPage`), `slides-editor.tsx` | pronto |
| export PNG 1080×1350 | `src/lib/hooks/use-component-printer.tsx` | pronto |
| auth + sessão | `src/lib/auth/sessao.ts`, `/api/auth/login`, middleware | pronto |
| lista de carrosséis | `src/components/carrosseis/lista-carrosseis.tsx` + `lib/carrosseis/lista.ts` | pronto, mas cara de painel de operador |
| API de projetos | `/api/ac` → AutoClinic (`GET/PATCH /carrossel/carrosseis`) | em uso |
| **geração de imagem** | — | **não existe** |
| temas (daisyUI) | `src/lib/themes.ts`, `pallettes.tsx`, `style-menu.tsx` | **sai** |
| fila de sinais / Google News | `src/app/sinais/page.tsx`, `/api/conteudo/gerar` | **sai** |

## Decisões de v1 (suposições declaradas)

1. **Uma tela de estúdio** em `/`, no vocabulário do CarrosseIA: "Pronto para criar? Me conta a sua ideia" + `✨ Criar com IA` + `OU ESCOLHA UM TEMPLATE` com chips de categoria + "Meus carrosséis" enxuto.
2. **Wizard de 4 passos** em `/criar` (cliente): `1 template → 2 tema → 3 gerando → 4 resultado`, com barra de progresso e um único CTA por tela.
3. **Templates no lugar de temas**: `src/lib/templates.ts` com 8 templates no formato do alvo (`id, nome, categoria, palette{bg,text,muted,accent}, font_display, font_body, layout`) mapeados para `config.theme` + `config.fonts`. Zero seletor de tema.
4. **Geração de imagem real** via 9Router `/v1/images/generations` (`b64_json`), rota nova `POST /api/imagem`; botão "Gerar capa com IA" no passo 2 e "Nova imagem" por slide no passo 4.
5. **Ver e baixar**: passo 4 mostra os slides em fila (scroll-snap, 4:5), com `Baixar PNG` por slide e `Baixar todos` (o hook já exporta 1080×1350).
6. **Sem Google News**: nenhuma entrada por notícia. Entrada = tema digitado (ou link colado → texto do link é lido e vira tema).
7. **Persistência**: salva pelo caminho existente (`PATCH /carrossel/carrosseis/{id}`) quando há projeto; se a criação pela API não existir, o carrossel gerado vive na sessão e o download continua funcionando. Não invento endpoint.
8. **Fora**: paywall/créditos, publicação Meta, multi-conta, editor completo por slide (v2).

## Ordem de execução

1. `src/lib/templates.ts` + tokens do alvo no Tailwind (fundo `#F5F4F1`, laranja `#F4511E`, stone) — 30 min.
2. `/` estúdio + `/criar` wizard + `/carrossel/[id]` resultado — o grosso.
3. `POST /api/imagem` (9Router) + botões de capa/cena.
4. Remoções: `/sinais`, nav, temas, `api/conteudo/gerar` interno mantido por compat (fila do AutoClinic) mas fora da UI.
5. Gates: `pnpm build`, `pnpm lint`, Playwright com screenshots 390/1440 de estúdio, wizard e resultado.
6. Branch `feat/clone-carrosseia` + PR com screenshots.

## Riscos

- Fidelidade ao logado do CarrosseIA depende do cofre (ticket #3). A v1 clona o funil público + o wizard observado; ajustes finos entram depois do acesso.
- API do AutoClinic pode não ter criação de carrossel — por isso o download não depende dela.
- Custo de imagem: 1 capa por carrossel no caminho rápido; cenas sob demanda.
