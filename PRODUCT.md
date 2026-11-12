# Product

<!-- impeccable:product-schema 1 -->

> Registro escrito nesta rodada (11/11/2026) **a partir do código e do banco reais** do
> repositório `carousel-generator-eval`, sem rodada de entrevista: nenhuma pessoa
> respondeu nesta sessão. Cada afirmação abaixo tem origem verificável no repositório,
> nos documentos de `docs/` ou no comportamento medido do app rodando. O que é
> inferência está marcado como **[inferido]**.

## Platform

web

## Users

**Operador de conteúdo do AutoClinic** (`app_usuarios.papel = operador | admin | owner`).
Trabalha para o Clécio, dono do AutoClinic — plataforma de automação comercial e
inteligência de prospecção para **clínicas de estética**. O trabalho dele é manter o
Instagram da AutoClinic abastecido: pegar uma pauta real (notícia ou tendência do setor
de estética), transformá-la em carrossel de 5 a 10 slides, aprovar, exportar PNG e
publicar. Vocabulário: pauta, sinal, briefing, gancho, CTA, aprovar, descartar.

Papéis, verificados em `docs/auth-carrossel.md` e `src/app/projetos/page.tsx`:
`owner` e `admin` enxergam todos os projetos da organização; `operador` vê só os
próprios; projeto de outro autor responde **404**, não 403.

**Leitor do link público** — cliente ou colega que recebe `/p/<token>` e só lê o
carrossel. Sem login, sem autor, sem organização, sem id interno.

## Product Purpose

Transformar um sinal real de mercado em carrossel pronto para o Instagram **sem perder
trabalho e sem publicar besteira**. O produto existe porque a alternativa era: alguém
digita o texto no Canva, ninguém sabe quem escreveu, e o carrossel de ontem some quando a
aba fecha.

Sucesso = o operador sai da abertura do app com PNG 1080×1350 na mão, e o carrossel
publicado nasceu de uma pauta que uma pessoa aprovou.

## Positioning

**A pauta nasce de sinal, não de inspiração, e nada publica sozinho.** O estado máximo
que o robô cria é `ideia`; `aprovado` só existe por clique humano
(`src/app/fila/page.tsx`, cabeçalho do arquivo). O gerador é o único elo entre a coleta
(Apify/Google News) e a peça: ele recebe briefing, roda um pipeline de 6 etapas e passa
por um lint **bloqueante** antes de desenhar.

Um concorrente pode copiar "gerar carrossel com IA". Não copia de graça: fila de sinais
com pontuação explicável + lint com voz de IA proibida + histórico de versões com
restaurar + link público revogável, tudo sobre a mesma conta do painel.

## Operating Context

- Instagram, formato 4:5 — 1080×1350 por slide, 5 a 10 slides (`src/lib/lint-carrossel.ts`).
- pt-BR é a língua do produto; o chrome herdado do editor está em inglês (ver Constraints).
- Autosave com debounce de 1,2 s, sem dois PATCH em voo, flush quando a aba fica oculta
  (`src/lib/hooks/use-autosave-projeto.ts`).
- Toda mudança real de conteúdo gera versão no servidor (comparação em `jsonb`);
  restaurar cria versão nova e nunca reescreve o histórico.
- A conta é a mesma do painel AutoClinic: GoTrue self-hosted, via BFF do Next
  (`/api/auth/login`, `/api/auth/refresh`, `/api/ac/<caminho>`).
- Geração passa por LLM no 9Router (`OPENAI_BASE_URL` local). Não há provedor de imagem
  com credencial: os fundos são procedurais (`solido`, `gradiente-suave`, `brilho`,
  `grade`, `pontos`, `papel`).
- Export sai em ZIP com um PNG por slide (o navegador bloqueia vários downloads em
  sequência) — `src/lib/hooks/use-component-printer.tsx`.

## Capabilities and Constraints

Funciona hoje:

- galeria com título, versão, contagem de slides, autor, link público, duplicar,
  histórico com restaurar e excluir em dois passos;
- fila de conteúdo: coleta de sinais, pontuação por relevância/recência/novidade,
  briefing por pauta, filtro de nicho (termos de busca, palavras proibidas, itens/dia),
  calendário editorial, tabela de qualidade por fonte, padrão medido dos concorrentes;
- geração por prompt livre (editor) e por pauta (fila → `/api/conteudo/gerar`);
- lint bloqueante: 5–10 slides, ≥2 elementos e ≥8 palavras por slide, um conceito por
  slide, sem emoji, lista de frases de IA proibida, capa sem "conheça nosso", CTA com
  verbo de ação; dígito no slide é aviso, não erro;
- design automático (paleta + fundo + contraste) a partir do tom e da direção visual;
- link público `/p/<token>`, revogável, republicar mantém a mesma URL;
- edição de marca (nome, handle, avatar), tema, fontes, números de página e opacidade.

Restrições e dívidas declaradas:

- **A marca não está ligada à organização.** Carrossel gerado nasce com `My name` /
  `@name` (`references/carousel-generator.md` do stack AutoClinic). O operador reescreve
  a marca em cada peça.
- **O chrome do editor é o do projeto open-source de origem** (inglês: "File", "Brand",
  "Theme", "Fonts", "Numbers", "My Carousel File", "YOUR TITLE", "Your awesome subtitle").
- Sem provedor de imagem: fundo fotográfico não é prometido em lugar nenhum.
- Autenticação compartilhada com o painel significa que uma sessão vale para os dois — e
  que qualquer 401 tratado errado derruba as duas telas (ver Evidence).
- Sem SMTP no GoTrue: senha não é recuperável, só substituível.

## Brand Commitments

- Nome do produto na tela: **Carrossel** (galeria e fila) — o editor ainda mostra
  "Carousel Generator", herdado da origem open-source.
- A marca que o operador publica é a do AutoClinic; o produto não tem marca própria
  além do wordmark de texto.
- Tom de voz: direto, operacional, sem superlativo. Os textos do produto dizem o que
  fazem e o que não fazem ("Nada publica sozinho", "Não tem como desfazer").

## Evidence on Hand

- Fila real com 6 pautas e notas (capturada nesta rodada em
  `docs/design/atual/fila-1440.png`).
- Um projeto real criado nesta rodada para fotografar a galeria e o editor
  (`docs/design/atual/galeria-1440.png`, `editor-projeto-1440.png`), apagado ao fim.
- Capturas atuais em 1440 e 390 de `/login`, `/projetos`, `/` e `/fila` em
  `docs/design/atual/`.
- Documento de arquitetura de autenticação e persistência: `docs/auth-carrossel.md`.
- Ausências que trabalho futuro **não pode inventar**: número de usuários ativos,
  depoimentos de cliente, métricas de crescimento, preço do produto.

## Product Principles

1. **Humano no portão.** O robô chega até `ideia`; aprovar é clique. Nenhuma peça sai
   sem alguém ter olhado.
2. **Não perder trabalho é requisito, não conforto.** Autosave, versão, restaurar e
   rascunho local migrado existem porque a dor real era perder o carrossel.
3. **O portão bloqueia o que é defeito e avisa o que é dúvida.** Erro volta para o
   modelo com a lista; aviso só informa — portão que reprova tudo é desligado.
4. **A peça é do cliente, a ferramenta é nossa.** O que o cliente recebe (`/p/<token>`)
   não pode mostrar ferramenta de editor.
5. **A pauta tem origem.** Todo carrossel publicado deveria poder responder de qual
   sinal ele nasceu.

## Accessibility & Inclusion

- O editor é operado por teclado e o repositório já roda axe com portão em
  `tests/visual/acessibilidade.spec.ts`: nenhuma violação `critical` ou `serious` nas
  telas principais.
- Contraste do chrome é requisito; contraste do **conteúdo do slide** é decisão de
  design do usuário e fica fora do portão (nota explícita no teste).
