# Product

<!-- impeccable:product-schema 1 -->

> Registro escrito nesta rodada (11/11/2026) **a partir do código e do banco reais** do
> repositório `carousel-generator-eval`, sem rodada de entrevista: nenhuma pessoa
> respondeu nesta sessão. Cada afirmação abaixo tem origem verificável no repositório,
> nos documentos de `docs/` ou no comportamento medido do app rodando. O que é
> inferência está marcado como **[inferido]**.
>
> **Revisado em 21/11/2026 (issue #8).** Duas afirmações abaixo deixaram de valer: a
> pauta **não** nasce de notícia e não existe mais catálogo de tema/paleta na interface.
> Onde o texto antigo contradiz isso, o texto foi corrigido e a origem da mudança está em
> `docs/design/issue-8-remocao-temas-e-noticias.md`.

## Platform

web

## Users

**Operador de conteúdo do AutoClinic** (`app_usuarios.papel = operador | admin | owner`).
Trabalha para o Clécio, dono do AutoClinic — plataforma de automação comercial e
inteligência de prospecção para **clínicas de estética**. O trabalho dele é manter o
Instagram da AutoClinic abastecido: partir de uma pauta **que ele mesmo escreve** (dúvida
do público, erro comum do setor, oferta), transformá-la em carrossel de 5 a 10 slides de
engajamento, editar, exportar PNG e publicar. Vocabulário: pauta, gancho, CTA, template,
baixar. Notícia do setor **não** é pauta: rende assunto datado e nenhum salvamento
(issue #8).

Papéis, verificados em `docs/auth-carrossel.md` e `src/app/projetos/page.tsx`:
`owner` e `admin` enxergam todos os projetos da organização; `operador` vê só os
próprios; projeto de outro autor responde **404**, não 403.

**Leitor do link público** — cliente ou colega que recebe `/p/<token>` e só lê o
carrossel. Sem login, sem autor, sem organização, sem id interno.

## Product Purpose

Transformar uma pauta escrita por uma pessoa em carrossel pronto para o Instagram **sem
perder trabalho e sem publicar besteira**. O produto existe porque a alternativa era: alguém
digita o texto no Canva, ninguém sabe quem escreveu, e o carrossel de ontem some quando a
aba fecha.

Sucesso = o usuário sai do estúdio com PNG 1080×1350 na mão, e o carrossel tem um gancho
que dá vontade de salvar.

## Positioning

**A pauta nasce de quem publica, não de um feed.** A entrada é o campo de tema livre do
estúdio, com as ideias que a própria pessoa guardou em “Minhas pautas”. Coleta automática
de notícia (Google News/Trends) foi **removida** na issue #8: notícia rende assunto
datado, não carrossel viral. O gerador recebe o tema, roda um pipeline de 6 etapas
(ângulo → plano → copy → direção visual → revisão → publicação) e passa por um lint
**bloqueante** antes de desenhar.

Um concorrente pode copiar "gerar carrossel com IA". Não copia de graça: pipeline de 6
etapas com voz de IA proibida no lint + 30 templates medidos de um produto real + histórico
de versões com restaurar + link público revogável, tudo sobre a mesma conta do painel.

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

- estúdio em `/`: tema livre + 30 templates + capa por IA + download PNG/ZIP;
- “Minhas pautas”: atalhos com as ideias que o usuário salvou (navegador);
- galeria com título, versão, contagem de slides, autor, link público, duplicar,
  histórico com restaurar e excluir em dois passos;
- geração pelo estúdio (tema → `/api/gerar`) e pelo editor (prompt livre);
- lint bloqueante: 5–10 slides, ≥2 elementos e ≥8 palavras por slide, um conceito por
  slide, sem emoji, lista de frases de IA proibida, capa sem "conheça nosso", CTA com
  verbo de ação; dígito no slide é aviso, não erro;
- design automático (cor + fundo + contraste) a partir do tom e da direção visual;
- link público `/p/<token>`, revogável, republicar mantém a mesma URL;
- edição de marca (nome, handle, avatar), fontes, números de página e opacidade.

Restrições e dívidas declaradas:

- **A marca não está ligada à organização.** Carrossel gerado nasce com `My name` /
  `@name` (`references/carousel-generator.md` do stack AutoClinic). O operador reescreve
  a marca em cada peça.
- **O chrome do editor é o do projeto open-source de origem** (inglês: "File", "Brand",
  "Fonts", "Numbers", "My Carousel File", "YOUR TITLE", "Your awesome subtitle").
- Sem provedor de imagem: fundo fotográfico não é prometido em lugar nenhum.
- Autenticação compartilhada com o painel significa que uma sessão vale para os dois — e
  que qualquer 401 tratado errado derruba as duas telas (ver Evidence).
- Sem SMTP no GoTrue: senha não é recuperável, só substituível.
- **A coleta de notícia do backend continua fora deste repositório.** A UI e a rota
  interna saíram; desligar o coletor é trabalho no repositório da API do AutoClinic.

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
5. **A pauta tem dono.** Todo carrossel nasce de uma pauta escrita por uma pessoa (ou
   guardada por ela em “Minhas pautas”), nunca de um feed de notícia — e o documento
   guarda o texto de origem.

## Accessibility & Inclusion

- O editor é operado por teclado e o repositório já roda axe com portão em
  `tests/visual/acessibilidade.spec.ts`: nenhuma violação `critical` ou `serious` nas
  telas principais.
- Contraste do chrome é requisito; contraste do **conteúdo do slide** é decisão de
  design do usuário e fica fora do portão (nota explícita no teste).
