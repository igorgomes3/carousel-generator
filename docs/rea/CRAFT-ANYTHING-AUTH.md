# Craft Anything no escopo de auth — o que ele viu e o que eu confirmei

Rodada de 23/11/2026, sobre `https://carrosseia.com.br/app`, para o escopo da issue #19
(login/logout do alvo + comparativo de lacunas). Par do documento
`docs/rea/CRAFT-ANYTHING.md` (instalação e limites gerais) e
`docs/conteudo/craft-anything/RELATORIO-ESTUDO.md` (tokens e o P0 do nosso deploy).

**Regra desta rodada:** nada da saída do Craft Anything entra como fato. A coluna "eu
confirmei" só tem o que eu vi — no browser com sessão do cofre, no `curl`, no processo do
host — e cada linha diz por qual desses meios.

## 1. Estado da ferramenta neste host (corrige uma nota anterior)

| item | valor |
|---|---|
| versão | `craft-anything-cli 0.6.1`, `/root/projects/craft-anything/bin/` |
| projeto (evidence ledger) | `/root/projects/reas/carrosseia.cany` (8,9 MB, criado nesta rodada) |
| engines | ghidra 12.1.4, adb, apktool, java 25, gdb — e **`engine:chromium ok`** |
| Chromium | `/usr/bin/chromium` (Debian) + `/etc/chromium.d/zz-no-sandbox` |
| IA | **sem backend configurado** (`doctor: ai → No AI backend is set up`) |

Duas consequências práticas:

1. **"Não tem Chromium" não vale mais.** Outra workstream instalou o `chromium` do Debian e
   o arquivo de flags que o root exige (`--no-sandbox --disable-dev-shm-usage`). O `doctor`
   confirma `engine:chromium ok`. O que continua valendo é o resto da nota: nada de `setup`
   nem `--client hermes` — só CLI, em pasta de projeto própria.
2. **`chat` não roda** (depende de backend de IA). O que dá para usar é a CLI/MCP direta:
   `web_site_open` + `web_page_js_analyze` + `web_page_show` na mesma sessão, e os comandos
   offline (`js-app-map`, `web-scripts-save`, `report`). Cliente mínimo que faz o
   encadeamento: `/root/rea/craft/js_map.py <url> <pasta> [largura]`.

## 2. O que o Craft Anything produziu

| comando | evidência | resultado |
|---|---|---|
| `web_site_open` + `web_page_js_analyze` (página viva, 1440) | `ev_f3d632f6…c4869 0e40` | "6 script(s) … **1 module(s), 26 endpoint(s), 0 route(s)**" |
| `web_page_show` (mesma sessão) | `ev_650e1dca…73d8df` | 6 scripts, 85 recursos, 35 entradas, 0 request outline; resultado acima do orçamento de resposta (8 MiB) → resumo + `core_evidence_browse` |
| `js-app-map` no bundle exportado | `ev_1c03fe1b…c3c86a` | "13 source files, **28 endpoint(s), 0 route(s)**"; `stats.endpoints` = 30 linhas |
| `web_site_capture` (rodada anterior, outra workstream) | `docs/conteudo/craft-anything/estudo-alvo/` | tokens, 390/768/1440, `capture.json` |

O bundle que o `js-app-map` leu fui eu que montei: `index.html` (782.984 b, baixado com
`curl`) + os 6 scripts inline extraídos para arquivo, em
`/root/projects/reas/carrosseia.cany/bundle/`.

### Endpoints que ele achou no código do app (`/api/*`)

`GET /api/config` · `POST /api/quick` · `POST /api/generate` · `POST /api/import` ·
`POST /api/art` + `GET /api/art?job=` · `GET|POST /api/mcp-key` ·
`DELETE /api/mcp-key?id=` · `POST /api/origem` · `POST /api/vincular-compra`

### Storage que ele achou

`localStorage.getItem/setItem('cs_origem')` e `setItem('cs_origem_detalhe')` em
`guardarOrigem`.

## 3. Comparação, linha por linha

| afirmação da ferramenta | como eu verifiquei | veredito |
|---|---|---|
| "1 module, 0 route" na página viva | `curl` do HTML: **zero** `<script src>` de origem própria; 6 scripts inline, o maior com **570.272 b** | **Confirmado, e a explicação é essa**: o site é HTML + JS inline sem router. Não há módulo nem rota para o analisador achar; ele só mapeou o pixel do Facebook (`fbevents.js`), de onde vieram 26 "endpoints" que são `schema.org`, `facebook.com/tr`, `wa.me` — ruído, não produto |
| `js-app-map` acha `/api/*` no bundle | conferi contra a captura de rede que fiz logado (21/11) e o código inline | **Confirmado para `config`, `quick`, `generate`, `art`, `origem`** (vi os cinco na rede). `import`, `mcp-key` e `vincular-compra`: **só no código** — eu não os disparei, então são "achado estático, não observado em execução" |
| nada sobre `supabase.co/auth/v1` | capturei a rede com sessão: `POST /auth/v1/token?grant_type=password` → 200, `POST /auth/v1/logout?scope=global` → **204**, `GET /rest/v1/profiles`, `/rest/v1/modelos` | **Lacuna do método, não do alvo.** O `supabase-js` monta essas URLs em runtime; leitura estática de bundle nunca as mostra. Todo o REA de auth depende do meu browser, não do Craft Anything |
| `localStorage: cs_origem` | abri o alvo logado: chaves `cs_origem`, `sb-afzz…-auth-token`, `cs_origem_detalhe`; depois do "Sair", sobram só as duas `cs_origem*` | **Confirmado**, e o CA só viu a metade que está no código (a chave da sessão é criada pelo SDK) |
| fonte da interface: "Space Grotesk 43, Inter 8, JetBrains Mono 4" | medi `getComputedStyle` em todos os elementos visíveis a 1440, no gate aberto: **Space Grotesk 75, Inter 83, JetBrains Mono 4**; o CSS declara as três (`--font-sans` vazio; `Inter, "Inter Fallback", system-ui, sans-serif` e `"Space Grotesk", "Space Grotesk Fallback", sans-serif`) | **Direção certa, número diferente.** A interface usa as duas: Space Grotesk para display/UI, Inter para corpo, JetBrains Mono para números. Os valores absolutos de um `capture` dependem do estado da página — usar como ordem de grandeza, nunca como métrica |
| "DM Sans" apareceria como fonte do alvo | primeiro `getComputedStyle` que rodei devolveu DM Sans em `h1`/`body` — **antes de o CSS do app aplicar** (Google Fonts carrega ~40 famílias de template, DM Sans entre elas) | **Falso positivo meu, registrado de propósito**: medir fonte logo depois do `goto` dá a família do `<link>` de fontes, não a da interface. Esperar o CSS e remedir |
| "0 forms" no capture do alvo | browser: o gate tem 2 inputs e 1 botão, mas **não** um `<form>` (o submit é `button.onclick`) | **Confirmado** — e é por isso que contagem de `<form>` não serve como medida de "tem login" |

## 4. O P0 do nosso deploy — verificado por mim, com uma correção

A rodada anterior concluiu que a produção serve a árvore do worktree `w90-formatos`.
**Isso não é o que o processo mostra:**

| medida | valor |
|---|---|
| porta 8099 | `next-server` pid **1810732**, cwd `/proc/1810732/cwd → /home/debian/staging/projects/carousel-generator-eval` (**repo raiz**) |
| início do processo | **22/11/2026 12:50:59** |
| `.next` no disco | reconstruído **23/11 15:47** (depois do processo subir) |
| HTML servido em `/login` | pede `/_next/static/css/3b46309f67065f2f.css` → **400** (1.987 b, corpo de erro do Next) e `21205cf413076ea0.css` → **200** (33.450 b) |
| esse chunk existe? | **não** na árvore servida; só em `.worktrees/w90-formatos/.next/static/css/` |
| `/login` aos meus olhos (navegador, 1440) | 42 nós, **0 forms / 0 inputs / 0 headings**, `innerText` vazio, `styleSheets` = **nenhuma**, `body` em `Times New Roman`, print de 5.851 b (branco) |

Leitura: **build feito em cima de um servidor rodando.** O processo em memória tem o HTML
do build antigo; os arquivos estáticos saem do disco novo. O chunk antigo não existe mais
na árvore servida (só no worktree de onde veio o build anterior), então HTML e assets não
casam, o CSS não aplica e o chunk que hidrataria também não chega — 42 nós de shell, tela
em branco. Unidade: `carousel-generator.service` (ativa, é ela que ocupa a 8099).

**A correção é um restart, não um commit**: `systemctl restart carousel-generator`. Não
executei — é o deploy de outra workstream e mexer em sistema vivo não é meu chamado sem
ordem do Igor. O que eu garanto: o código na `main` está certo (o mesmo `/login` renderiza
com estilo e hidrata no meu build local, prints em `screenshots/auth/`).

## 5. Para que serve e para que não serve (neste escopo)

Serve:

- inventário estático do bundle em minutos, com contagem de funções/endpoints e
  `evidence_id` por afirmação — bom para "quais endpoints existem no código".
- segunda opinião sobre tokens e fontes, sem escrever automação.
- não precisa de sessão nem de browser quando se aponta para arquivo (`js-app-map`).

Não serve:

- **fluxo autenticado**: `web_site_open` usa perfil privado e sem cookies; `web_walkthrough_record`
  aceita cookies mas o navegador dele não é a "página aberta" do `web_site_capture`. Login,
  menu da conta, "Sair" e sessão expirada continuam sendo browser do Hermes + cofre.
- **site com JS inline**: 0 rotas e módulos — para este alvo, o resultado honesto é "não há
  router"; quem escrever "o CA não achou rotas, portanto o site não tem telas" erra.
- **URLs montadas em runtime** (SDK do Supabase): invisíveis para leitura estática.
- `chat` sem backend de IA, e `report` só vale o que o ledger tiver.

## 6. Reproduzir

```bash
CA=/root/projects/craft-anything/bin/craft-anything-cli

# 1) mapa do bundle (offline, sem browser)
mkdir -p /root/projects/reas/carrosseia.cany/bundle   # index.html + scripts inline
$CA --project /root/projects/reas/carrosseia.cany --deep js-app-map \
    --input-path /root/projects/reas/carrosseia.cany/bundle --output-format json

# 2) página viva + análise de JS na mesma sessão (script já pronto)
/root/rea/craft/js_map.py https://carrosseia.com.br/app /root/rea/craft/js-alvo 1440

# 3) o que ficou no ledger
$CA --project /root/projects/reas/carrosseia.cany core-evidence-show --format md
```

Saídas cruas desta rodada: `/root/rea/craft/js-alvo/` (`js-analyze.json`,
`js-app-map-bundle.json`, `page-show.json`) e o projeto `…/carrosseia.cany/`
(`evidence/`, `bundle/`).
