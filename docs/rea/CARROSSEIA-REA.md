# REA — CarrosseIA (carrosseia.com.br/app): o que foi observado

Data: 21/11/2026. Alvo: https://carrosseia.com.br/app (estado logado-não). Método: leitura do bundle público servido ao browser + screenshot + leitura do HTML (5,2 MB) e do script inline (570 KB).

## Arquitetura observada (não é Next/React)

- Nenhum `_buildManifest.js`, nenhum framework: **HTML estático + JS inline** (`document.querySelector`/`getElementById`), Supabase `@supabase/supabase-js@2` via CDN jsdelivr, `/api/config` devolve `supabaseUrl` + `supabaseAnonKey` para o cliente iniciar a sessão.
- Terceiros: Facebook Pixel, Google Ads (`AW-18273245809`), Google Fonts, Kirvano (checkout, `pay.kirvano.com` / `app.kirvano.com`), `carouselia.app` (host da API).
- Tabelas Supabase usadas no cliente: `projects`, `modelos`, `profiles`, `brand_kits`, `mcp_drafts`.
- Endpoints próprios: `/api/config`, `/api/quick`, `/api/generate`, `/api/art`, `/api/import`, `/api/origem`, `/api/mcp-key`, `/api/mcp/`, `/api/vincular-compra`.

## Fluxo (marketing + app)

Landing diz os 4 passos, e o bundle confirma wizard de 4 etapas (`state.step`):

1. **Escolher template** — ~30 templates, 18 nichados. Cada template é um objeto:
   `{ id, nome, tag, capaIA, capaRegra, layout, uniformCards, tituloGrande, font_display, font_body, scene, palette:{bg,text,muted,accent}, look:{lighting,palette,background,camera,mood,finish}, styleText, sample }`
   Exemplos de id: `minimalist`, `neon`, `aurora`, `impacto`, `autoral`, `advogada`, `post-rede-social`, `advocacia`, `insider`, `essencial`, `full-texto`, `zero` (Criar do zero).
2. **Dizer o tema** — textarea com contador `0/400` e botão `✨ Criar com IA · 13 créditos`; aceita também **link de matéria** (`/api/origem`, `/api/import`).
3. **A IA escreve e desenha** — `/api/generate` (roteiro, 3 créditos) e depois `/api/art` (capa, 10 créditos).
4. **Editar e baixar** — PNG por slide em 1 clique; download preso ao plano (paywall de créditos).

## Orquestração da criação rápida (`/api/quick`)

```
qkStep('ideia','run')
POST /api/quick { ideia }            -> escolhe template + nº de cards
POST /api/generate                   -> roteiro (3 créditos)
generateImages()                     -> monta passo 4 e dispara a capa (10 créditos) via /api/art
```
Total 13 créditos. O comentário do código diz explicitamente que `/api/quick` **não gera nada**: só chama na ordem certa o que já existe.

## `/api/art` (geração de imagem)

- `POST /api/art { prompt, style, quality:'medium', size, allowText }` → `{ jobId }`.
- `GET /api/art?job=<jobId>` a cada 4 s, deadline 260 s: `{status:'pending'}` → resultado com **base64 PNG**.
- Tamanhos: `1:1 → 1024x1024`, `4:5 → 1088x1360`, `3:4 → 1080x1440` (nativo no `gpt-image-2`, zero corte).
- Dois modos: capa (com `allowText` conforme template) e **imagem de cena sem texto** (`No text, no letters, no words, no watermark, no logo`).
- O prompt da capa é montado com o `look` do template (luz, paleta, fundo, câmera, clima, acabamento) + a paleta do brand kit.

## Render dos cards

- **Canvas 2D no cliente.** `renderSlide(slide, i, total, st)` desenha cada card; `drawCoverOverlay`, `drawChrome`, `drawCards` são as camadas.
- Export: `canvas.toDataURL('image/jpeg', 0.72)` para thumbnails e PNG para download.
- Formatos de arte por slide (`fmt`): base 1080x1350 (4:5) com variantes; `TOP0`, `HS` controlam chrome e tipografia.
- Vitrine de templates é gerada ao vivo (`renderTemplateThumb`, `desenhaVitrine`) — a prévia da grade é o próprio renderizador rodando com `sample` do template.

## UI medidas (tokens reais)

| token | valor |
|---|---|
| fundo da página | `#F5F4F1` / `#F5F5F4` (off-white quente) |
| card | `#FFFFFF`, raio 16 px, sombra `0 10px 30px rgba(0,0,0,.06)` |
| primária | laranja `#F4511E`–`#FF5B22` |
| texto | `#1C1917`; secundário `#57534E`; placeholder `#A8A29E` |
| borda | `#E7E5E4` |
| suporte (chat) | verde `#22C55E`, pílula flutuante |
| tipografia | sans geométrica (Inter-like); logo 20-22 px/700; corpo 14 px; labels 12-13 px/600 |
| raio de input/botão | 8-10 px; botão primário altura 48 px |

Componentes: card de login com segmented control `Entrar | Criar conta`, inputs com label acima, botão primário laranja full-width, divisor `ou`, `Continuar com Google`, microcopy legal com links laranja. Fora do card: botão flutuante "Suporte".

Home logada-não (abaixo do card): `✨ Criação rápida com IA — Pronto para criar? Me conta a sua ideia. [0/400] [✨ Criar com IA · 13 créditos]` e depois `OU ESCOLHA UM TEMPLATE PARA COMEÇAR` com chips de categoria (`Todos, DIREITO, SAÚDE, VIRAL, VIAGEM, URGENTE, VÍDEO, IMÓVEIS, NUTRIÇÃO, TREINO, FINANÇAS, CLÍNICA, MARKETING, IA, SAÚDE BUCAL, EDUCAÇÃO, ESTÉTICA, JOIAS, PETS`) e grade de cards de template (`Criar do zero` + previstos ao vivo).

## Copy de produto (vocabulário a clonar)

- "Crie carrosséis em menos de 1 minuto. A IA escreve o roteiro e desenha as artes, prontas pra postar nas suas redes."
- "Pronto para criar? Me conta a sua ideia."
- "✨ Criar com IA · 13 créditos"
- "OU ESCOLHA UM TEMPLATE PARA COMEÇAR"

## O que continua DESCONHECIDO (precisa de login)

- Tela logada: existe dashboard/lista de projetos? Como se chamam as abas?
- Estados do passo 3 (gerando, erro, retry) e do passo 4 (editor por slide).
- O que o botão de download entrega de fato: PNG por slide, ZIP, ou os dois.
- Paywall: quando aparece, o que mostra.
- Payload de `/api/generate` (forma das slides) e schema de `projects.slides`.

Evidência bruta: `/root/rea/html_app.html`, `/root/rea/inline.js`, `/root/rea/shots/*.png`.
