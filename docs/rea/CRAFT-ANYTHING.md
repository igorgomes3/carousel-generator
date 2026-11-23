# Craft Anything — instalação, teste e o que ele acrescenta

Instalado em 23/11/2026 a pedido do Igor, **só o CLI** (a GUI não roda em VPS headless).

## Instalação

| item | valor |
|---|---|
| versão | `craft-anything-cli 0.6.1` |
| origem | release oficial `craft-anything-0.6.1-linux-x86_64.tar.gz` |
| integridade | SHA-256 `83ec0730c9117f399122b315c63ed4c3a8d31ac55bddd74cb8b33cd2f76ef704`, igual ao `SHA256SUMS.txt` do release |
| binário | `/opt/craft-anything/craft-anything-0.6.1-linux-x86_64/bin/craft-anything-cli` (symlink em `/usr/local/bin`) |
| motors | Ghidra 12.1.4, adb, apktool, gdb, java OK; Chromium instalado por apt (`/usr/bin/chromium`) |

Duas coisas que travaram e como resolvi:

1. **"This needs a Chromium-based browser installed"** — o Playwright Chromium (`~/.cache/ms-playwright`) não é detectado e não há variável de ambiente que aponte o caminho (`CHROME_PATH`, `CHROMIUM_PATH`, `CRAFT_CHROMIUM`, `CHROME_BIN` testados). Resolvido instalando `chromium` do Debian.
2. **"Running as root without --no-sandbox is not supported"** — o wrapper Debian lê `/etc/chromium.d/*`; criei `/etc/chromium.d/zz-no-sandbox` com `--no-sandbox --disable-dev-shm-usage`. (É ajuste de host, reversível: apagar o arquivo.)

## Modelo de sessão — a armadilha principal

Cada comando do CLI abre e fecha o próprio navegador. `web_site_capture` exige uma página já aberta por `web_site_open`, então **os dois não podem ser comandos separados**: dá "no website is open".

Caminho que funciona sem GUI: subir o servidor MCP (`craft-anything-cli --project <dir> --allow-run --deep mcp`) e encadear `web_site_open` + `web_site_capture` na mesma sessão. Script pronto: `/root/rea/craft/craft_mcp.py`.

Segunda armadilha: **Clean room bloqueia cookie**. `web_site_open` não aceita `storage`, e `web_walkthrough_record` (que aceita cookie) é recusado em Clean room — precisa de `--deep`. Mas o navegador do walkthrough **não é** a "página aberta" para o `web_site_capture`. Resultado: capturar uma área logada do nosso próprio app pela CLI não é possível hoje; só o estado público.

## O que rodou ("study")

| alvo | resultado |
|---|---|
| `https://carrosseia.com.br/app` | capturado em 390/768/1440; `capture.json` + `README.md` + 3 PNGs em `/root/rea/craft/cap-alvo` |
| `http://127.0.0.1:3010/login` (nosso) | capturado em 390/768/1440 em `/root/rea/craft/cap-nosso`, mas **0 headings, 0 links, 0 imagens, outline vazio** com 11,9 KB de HTML |

O "check" do Craft Anything (`rebuild_check`) só existe **dentro de um projeto de rebuild** — exige o projeto que ele mesmo construiu, com um coding agent (Claude Code/ACP). Para comparar dois sites independentes o par disponível é `web_pixels_compare` / `web_snapshots_compare`, que comparam capturas, não produtos.

## O que ele achou que eu não tinha

**Fonte de interface do alvo:** 43 elementos com `"Space Grotesk"`, 8 com `Inter`, 4 com `JetBrains Mono`. Meu `docs/rea/CARROSSEIA-REA.md` dizia "sans geométrica (Inter-like)" — errado: a interface do CarrosseIA é **Space Grotesk**, e Inter é secundária. No nosso clone a interface está em Inter (tokens `--font-sans`).

Outros tokens medidos, agora com contagem:

| token | alvo |
|---|---|
| fundos | `#ffffff` (52), `#f2f0ec` (13), `#faf9f7` (2), `#ff5a1f` (3), `#171412` (1) |
| raios | `999px` (21), `16px` (12), `10px` (7), `12px` (3) |
| sombras | `rgba(23,20,18,.05) 0 2px 10px` (12), `0 4px 20px .06`, `0 20px 56px .14` |
| larguras | `1080px`, `900px`, `1200px`, `404px` |
| tipografia | 12,5px (24), 14,5px (15), 11,5px (3); pesos 600 (47), 400 (6), 700 (6) |

**Nosso login:** a captura não encontrou um único heading ou link — a página só existe depois do JS. Para leigo e para robô, isso é tela em branco. Vale corrigir (render server-side do formulário ou ao menos do H1).

## Veredito de uso

- Bom para: dossiê de tokens medidos com contagem, captura em 3 larguras, inventário de outline/imagens/links, e (em Deep mode) mapa de JS, HAR, comparação de snapshots.
- Não substitui a REA que fiz do CarrosseIA: o que importa lá é o **comportamento pós-login e os contratos de API**, e o Craft Anything lê isso só com Deep mode + captura autenticada, que na CLI está bloqueada.
- Continua valendo como segunda opinião barata: captura + tokens em uma chamada, sem escrever browser automation.
