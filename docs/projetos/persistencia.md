# Salvar projeto e Meus projetos (issue #13)

Escrito em 21/11/2026 junto com a implementação. Este documento existe porque a
issue deixou uma pergunta aberta — **"persistimos pelo caminho existente
(`PATCH /carrossel/carrosseis/{id}`) ou criamos store próprio?"** — e a resposta
precisa de justificativa medida, não de preferência.

## Decisão: store próprio, no disco

| Critério | `carrossel_projetos` (API do AutoClinic) | Store próprio (escolhido) |
|---|---|---|
| Formato do documento | `DocumentSchema` do editor antigo (slides com elementos soltos, tema, paleta) | `CarrosselGerado` do estúdio (card + texto + imagem) |
| Quem pode gravar | exige `organization_id` + `autor_id` → sessão GoTrue do painel | qualquer um que abra o estúdio; identidade anônima por cookie |
| Imagens | `jsonb` (1–2 MB de base64 por capa) dentro do banco que o painel consulta | arquivo no disco, JSON só com o caminho |
| Risco | escrever no banco de produção de outro produto | isolado neste repo |

Converter `CarrosselGerado` ↔ `DocumentSchema` para usar a tabela existente seria
inventar compatibilidade que ninguém usa e quebraria na primeira mudança de
card do estúdio. As imagens em `jsonb` incharia o banco do painel — o mesmo
banco que responde a fila de conteúdo e o CRM. E exigir login do AutoClinic para
salvar o carrossel do leigo contradiz a própria tela (ele chega em `/` e cria).

`carrossel_projetos` continua sendo o certo para o **editor antigo**
(`/carrossel/<id>/editar`). Nada nele mudou.

## Modelo gravado

Um diretório por projeto em `data/estudio/projetos/<uuid>/`:

```
projeto.json          # ProjetoSalvo + dono (o dono nunca sai do servidor)
arquivos/card-01.png  # uma imagem por card que tiver imagem
```

```jsonc
{
  "id": "uuid",
  "nome": "5 erros que matam seu carrossel",
  "templateId": "minimalist",      // paleta + fontes (fonte única: lib/templates.ts)
  "tema": "texto do passo 2",
  "slides": [{ "tipo": "capa", "titulo": "…", "corpo": "…",
               "imagem": "/api/projetos/<id>/arquivos/card-01.png?v=2" }],
  "criadoEm": "…", "atualizadoEm": "…", "salvoEm": "…",
  "versao": 2,
  "dono": "uuid do cookie estudio_dono"
}
```

Paleta e fontes **não são copiadas**: `templateId` aponta para `TEMPLATES`, então
mudar um template no código atualiza todos os projetos que o usam — que é o que
o estúdio promete (o template é o visual).

## Migração idempotente

`src/lib/estudio/armazenamento.ts` → `MIGRACOES`:

| id | nome | o que faz |
|---|---|---|
| 1 | `cria-diretorios` | `mkdir -p` da raiz e de `projetos/` |
| 2 | `remove-temporarios` | apaga `.tmp-*` de gravação interrompida |

Cada id aplicado fica em `data/estudio/migracoes.json` e a aplicação é
serializada por uma promise única por processo. Rodar de novo não faz nada; se o
processo cair no meio, a próxima requisição reaplica o que falta.

## Gravação atômica

`escreverAtomico` grava em `<arquivo>.tmp-<rand>` e faz `rename`. `rename` no
mesmo diretório é atômico: ou o `projeto.json` antigo está inteiro, ou o novo
está inteiro — nunca meio arquivo. É a proteção contra "salvei e o projeto veio
vazio" depois de um restart no meio da escrita.

## API

| rota | método | o que faz |
|---|---|---|
| `/api/projetos` | GET | lista do dono (`ResumoProjeto[]`, com a capa para a miniatura) |
| `/api/projetos` | POST | cria; devolve o projeto inteiro |
| `/api/projetos/<id>` | GET | projeto inteiro |
| `/api/projetos/<id>` | PATCH | salva por cima (`nome`, `slides`, `tema`, `templateId`) |
| `/api/projetos/<id>` | DELETE | apaga o projeto e as imagens |
| `/api/projetos/<id>/arquivos/<nome>` | GET | serve a imagem do card (`immutable`, `?v=<versão>`) |

Imagens chegam em `data:image/…;base64` (é o que a IA devolve), são decodificadas
no save e trocadas pelo caminho do arquivo. Sem isso, abrir a lista baixaria
~10 MB de base64.

## Dono

Cookie `estudio_dono` (uuid, `httpOnly`, 1 ano, `sameSite=lax`,
`secure:false` porque o app roda em http na tailnet). Nasce no primeiro
salvamento; projeto de outro dono responde **404**, nunca 403.

## Onde fica cada coisa na tela

- **Salvar**: botão explícito no passo "Seu carrossel está pronto". Não é
  autosave: autosave mente quando falha e o usuário aqui é leigo. O status diz
  "Salvo às 22:57", "Alterações não salvas" ou o erro.
- **Proteção**: `beforeunload` quando há alteração pendente, `confirm` antes de
  "Criar outro"/"Novo" e antes de sair por link.
- **Meus projetos**: `/projetos` (nome, miniatura da capa, "N cards · Salvo às
  HH:MM", Abrir / Renomear / Apagar com confirmação).
- **Abrir**: `/?abrir=<id>` (não `?projeto=`, que é link antigo do editor e o
  middleware responde 301 para `/carrossel/<id>`).

## Pendências conhecidas

1. **Identidade é o cookie.** Trocar de navegador perde a lista; limpar cookies
   perde a lista. O próximo passo é vincular ao GoTrue que já existe em
   `/login` **sem** tornar o login obrigatório para criar — ex.: no primeiro
   login, migrar os projetos do cookie para `autor_id`.
2. **Sem histórico de versões.** `versao` já é gravada, mas não há tela de
   restaurar (a tabela do editor tem; o estúdio não).
3. **Sem limite de tamanho.** Um POST com 10 capas de 2 MB são 20 MB de corpo.
   Funciona hoje; se virar problema, o caminho é subir a imagem em rota própria
   e mandar só o caminho no PATCH.
4. **`data/` precisa sobreviver ao deploy.** Está no `.gitignore`; qualquer
   rotina de deploy que faça `git clean -fdx` apaga os projetos. Backup do
   diretório é responsabilidade do deploy, não do app.
5. **`/projetos` continua atrás do middleware de sessão** (`ac_sessao`), igual a
   `/`. Quando a identidade for a real (item 1), essa porta pode mudar.
