# CONTENTX

Gerador de carrossel para Instagram com agente que publica um post por dia.

O CONTENTX pega um tema (ou a descrição do seu negócio) e devolve um carrossel pronto: 3 a 10 cards em 1080×1350, legenda, hashtags, horário sugerido e PNG/ZIP para baixar. O **piloto automático** usa uma entrevista curta sobre o perfil e gera um carrossel novo por dia, sem o criador precisar abrir nada.

> Produto próprio, com autenticação, banco, painel administrativo e piloto automático próprios. O código nasceu de um clone funcional de outra ferramenta e hoje é outro produto.

## O que ele faz

- **Estúdio em 4 passos**: template → quantidade de cards → roteiro → imagens. Uma decisão por tela.
- **Geração em 6 etapas**: ideia → plano → copy → direção visual → montagem → publicação (legenda/hashtags/horário).
- **CTA obrigatório no último card**, escolhido de um catálogo (pergunta, palavra-chave na DM, seguir, salvar, compartilhar) e garantido em código.
- **Imagem**: capa por IA (`gpt-image-2.5` via 9Router) **ou** upload do dispositivo. Opção de repetir a capa em todos os cards; card sem foto sai em cor sólida.
- **Piloto automático**: entrevista de 4 respostas (ou conversa com o agente), 5 arquétipos de pauta em rotação, histórico de temas para não repetir, e freio de custo (pausa após 3 posts seguidos sem abertura).
- **Contas**: login próprio (Supabase), cadastro com ou sem convite (o admin decide), chave de IA global herdada por todos **ou** chave própria por usuário.
- **Painel admin**: chaves de LLM e imagem, política de entrada, criação de conta e convites de uso único.
- **Salvamento automático** e link público read-only por projeto (`/p/<token>`).

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
- Supabase (Postgres + GoTrue) por produto: RLS por `auth.uid()`
- 9Router como hub de modelos (texto e imagem)
- Export PNG/ZIP no navegador (`html-to-image` + `jszip`)
- systemd + Traefik no servidor próprio; cron do autopilot às 05:00 (America/Sao_Paulo)

## Rodar local

```bash
pnpm install
cp .env.example .env.local   # preencha as chaves
pnpm dev                     # http://localhost:3000
```

Variáveis principais (`.env.example` tem a lista completa):

| Variável | Para quê |
|---|---|
| `CARROSSEL_SUPABASE_URL` / `_ANON_KEY` / `_SERVICE_ROLE_KEY` | banco e auth do produto |
| `OPENAI_BASE_URL` / `OPENAI_MODEL` / `OPENAI_API_KEY` | LLM de texto (herança quando o painel está vazio) |
| `IMAGEM_MODEL` | modelo de imagem (padrão `cx/gpt-image-2.5`) |
| `CARROSSEL_ADMINS` | e-mails com acesso ao `/admin` |
| `AUTOPILOT_CRON_SECRET` | segredo do endpoint interno do cron |
| `NEXT_PUBLIC_APP_URL` | URL pública usada em metadata e links |

## Banco

Migrations em `supabase/migrations/` (aplicar na ordem):

- `projetos` + `perfis` — carrosséis salvos e marca do usuário, RLS por dono
- `config_ia` — chaves do administrador (linha única, só `service_role`)
- `config_produto` — cadastro aberto / exigir convite
- `convites` — código de uso único com expiração
- `chaves_usuario` — chave opcional por usuário (sobrepõe a global)
- `perfis_automacao` — briefing do autopilot, histórico de temas, freio de inatividade
- Atenção: **tabela nova não concede `SELECT` ao `service_role` por padrão** — conceda explicitamente, senão o link público `/p/<token>` responde 404.

## Deploy (servidor atual)

```bash
git pull --ff-only
pnpm build
systemctl restart carousel-generator     # next start -p 8099
```

O domínio é servido por Traefik → socat → `172.18.0.1:8099`. Se o site "carregar para sempre" enquanto `curl http://127.0.0.1:8099/login` responde 200, o problema é a rota container → host (firewall/`docker_gwbridge`), não o build.

Cron do autopilot: `deploy/carrossel-autopilot.timer` (05:00 em São Paulo) chama `scripts/autopilot-tick.sh`, que consome `POST /api/interno/autopilot/tick` uma pauta por vez.

## Custo

Cada capa gerada custa **≈ US$ 0,05** (tabela e premissas em [`docs/CUSTO-IMAGEM.md`](docs/CUSTO-IMAGEM.md)). O autopilot gera só texto; a capa é on-demand justamente para não queimar cota com post que ninguém abriu.

## Testes

```bash
pnpm test:lib        # regras de conteúdo, encaixe de texto, publicação, CTA
pnpm test:visual     # Playwright (render dos cards, conta, responsivo)
```

## Licença

MIT — ver [`LICENSE`](LICENSE).
