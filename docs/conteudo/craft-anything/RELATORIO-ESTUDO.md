# Craft Anything — estudo comparado (CarrosseIA × nosso carrossel)

Ferramenta: `craft-anything-cli 0.6.1` (a instalação do Igor em `/root/projects/craft-anything/bin/`), via sessão MCP — `web_site_open` + `web_site_capture` no mesmo processo (`/root/rea/craft/craft_mcp.py`), porque cada comando do CLI abre e fecha o próprio navegador.

**Mudança de estado compartilhado que o Igor precisa saber:** o "sem Chromium" deixou de valer. Instalei `chromium` do Debian (`/usr/bin/chromium`) e criei `/etc/chromium.d/zz-no-sandbox` (`--no-sandbox --disable-dev-shm-usage`, exigido por rodar como root). O `doctor` agora mostra `engine:chromium ok`. Reverter = `apt remove chromium` e apagar esse arquivo.

Artefatos brutos:

- `estudo-alvo/` — carrosseia.com.br/app, 390/768/1440 (`capture.json`, `page.html`, 3 PNGs, `README.md`)
- `estudo-nosso-publico/` — carrossel.149-56-214-54.sslip.io, 390/768/1440

## 1. Alvo (CarrosseIA) — o design system inteiro, medido

O capture traz as CSS custom properties, o que nenhuma leitura de olho dava:

| token | valor |
|---|---|
| `--accent` / `--orange` | `#FF5A1F` |
| `--accent-2` / `--queimado` / `--danger` | `#C2410C` |
| `--bg` / `--cream` / `--paper` | `#FAF9F7` / `#FAF9F7` / `#FFFFFF` |
| `--surface-2` | `#F2F0EC` |
| `--ink` / `--ink-2` / `--ink-3` | `#171412` / `#5B554D` / `#8C8579` |
| `--line` / `--line-2` / `--line-strong` | `#E7E5E2` / `#DEDBD6` / `#CFCBC4` |
| `--ok` / `--amber` | `#2E7D32` / `#FFA94D` |
| raios | `--r-xs 8px`, `--r-sm 10px`, `--r 12px`, `--r-lg 16px`, `--r-xl 20px` |
| sombras | `--shadow-xs 0 1px 2px rgba(23,20,18,.05)`, `--shadow-sm 0 2px 10px .05`, `--shadow 0 4px 20px .06`, `--shadow-pop 0 12px 32px .10`, `--shadow-lg 0 20px 56px .14` |
| anel de foco | `--ring 0 0 0 3px rgba(255,90,31,.16)` |
| transição | `--t 180ms ease` |
| fontes | interface `"Space Grotesk"` (43 elementos), `Inter` (8), mono `"JetBrains Mono"` (4) |
| tipografia | 12,5px (24×), 14,5px (15×), 11,5px (3×); pesos 600 (47), 400 (6), 700 (6) |

Contagem de conteúdo: 16 headings, 39 imagens, 18 links, 78 itens de outline, 0 forms.

Correção ao nosso `CARROSSEIA-REA.md`: eu tinha escrito "sans geométrica (Inter-like)". **É Space Grotesk na interface**, Inter só secundária.

Limites do capture (declarados pela própria ferramenta): estado único da página (menus/diálogos não abertos), `page.html` cortado em 4 MiB dos 5,27 MB.

## 2. Nosso carrossel — o que o craft-anything viu

`https://carrossel.149-56-214-54.sslip.io` → redireciona para `/login?de=/`.

| medida | valor |
|---|---|
| headings / links / imagens / outline | **0 / 0 / 0 / 0** |
| HTML | 12,2 KB |
| screenshot 1440 | branco puro (hash `99db2a93…`) |
| screenshot 390 / 768 | idênticos ao capture anterior feito em `127.0.0.1` (hashes `3041d996…`, `67f28d17…`) |
| CSS custom properties | nenhuma |

O mesmo hash de PNG em dois hosts diferentes (local × produção) elimina a hipótese "captura rápida demais": a página é branca de forma determinística.

### A causa, medida no browser do Hermes (app autenticado)

Com `ac_sessao=1`, o estúdio renderiza (h1 presente, 2027 px de altura), mas:

| elemento | valor computado |
|---|---|
| `--font-sans`, `--accent`, `--background`, `--foreground` | **vazios** |
| `body` | `font-family: "Times New Roman"`, 16 px |
| `h1` | `"Times New Roman"`, 32 px |
| `button` | `Arial`, 13,3 px, `border-radius: 0` |
| cores que aparecem | `#1C1917` / `#E7E5E4` — são os estilos inline dos componentes, não os tokens |

E o HTML da produção referencia dois chunks de CSS:

```
/_next/static/css/21205cf413076ea0.css  -> 200, 33.450 b
/_next/static/css/3b46309f67065f2f.css  -> 400, 1.987 b  (corpo é uma página "400: Bad Request" do Next)
```

Leitura da evidência: a produção está servindo HTML de um build cujo chunk de CSS não existe mais no deploy atual. Sem esse chunk os tokens (`--font-sans` etc.) nunca são definidos, `font-family: var(--font-sans)` computa vazio e a interface inteira cai em Times New Roman. É defeito de **deploy/artefato**, não de design — e é anterior a qualquer mudança minha: eu não deployei nada, e a branch do clone não está no ar.

## 3. Divergência com o W95

Não existe `docs/conteudo/GAP-CARROSSEIA.md` neste checkout no momento em que escrevi isto (só `FORMATOS-CARROSSEL.md`). Portanto não há duas versões para confrontar ainda — e **não editei esse arquivo**.

O que eu entrego ao W95 como evidência crua, sem interpretar o trabalho dele:

1. `/login` em produção: 0 headings, screenshot branco, determinístico (mesmo hash em dois hosts).
2. `--font-sans` vazio e Times New Roman no documento, com `ac_sessao=1`.
3. `/_next/static/css/3b46309f67065f2f.css` responde **400** com corpo HTML de erro.

Se o documento do W95 disser que o login "funciona e só é feio", a evidência acima sustenta o contrário: a página não tem estilo aplicado e não tem heading nenhum no DOM. As duas versões devem ir ao Igor lado a lado.

## 4. O que o `check` cobre — e o que não cobre

`rebuild_check` só existe dentro de um projeto de rebuild do Craft Anything (exige o build dele e um coding agent via ACP). Para dois sites independentes, o par disponível é `web_pixels_compare` / `web_snapshots_compare`. Comparar os PNGs do alvo (site com conteúdo) com os nossos (branco) daria 100% de diferença e não informa nada; a comparação útil aqui é de **tokens e estrutura**, que está nas seções 1 e 2.

## 5. O que isso muda no clone (ticket #12)

- Fonte de interface do estúdio: `Inter` → **Space Grotesk** (a do alvo), Inter como secundária e JetBrains Mono para números.
- Tokens: `--bg #FAF9F7`, `--ink #171412`, `--ink-2 #5B554D`, `--line #E7E5E2`, `--accent #FF5A1F`, `--accent-2 #C2410C`, raios 8/10/12/16/20, sombras na escala acima, `--t 180ms ease`.
- Antes de qualquer polimento: consertar o deploy que perdeu o chunk de CSS — sem isso nenhuma tela nossa parece produto.

## 9. Correção medida (W95, 23/11 — depois da seção 6)

A conclusão "o processo que atende a 8099 está servindo a árvore do worktree `w90-formatos`"
**não se sustenta** quando se olha o processo:

| medida | valor |
|---|---|
| porta 8099 | `next-server` pid 1810732, `/proc/1810732/cwd` → `…/carousel-generator-eval` (**repo raiz**) |
| início do processo | 22/11/2026 12:50:59 |
| `.next` no disco | reconstruído 23/11 15:47 — **depois** de o processo subir |

O que explica o sintoma é outro mecanismo, mais simples: **build em cima de servidor
rodando**. O HTML vem do build que está em memória (pede `3b46309f67065f2f.css`), os
estáticos vêm do disco novo (que só tem `21205cf413076ea0.css` e `c5a5bafa9c3e63df.css`), e
o chunk antigo sobrevive apenas dentro do worktree. Logo: HTML de um build × assets de
outro; CSS não aplica e a hidratação não chega. Confirmado por mim em `/login`: 42 nós, 0
inputs, 0 stylesheets aplicadas, `Times New Roman`, print branco de 5.851 b. Correção =
`systemctl restart carousel-generator` (não executado; deploy de outra workstream).

Detalhe completo e a tabela "o que o CA disse × o que eu confirmei" em
`docs/rea/CRAFT-ANYTHING-AUTH.md`.
