# Publicação automática no Instagram sem aprovação de app na Meta

Pesquisa e plano de integração. **Só pesquisa — nenhum código foi escrito, nenhum provedor contratado, nada publicado.**
Data da consulta de todas as fontes: **12/11/2026**. Toda afirmação abaixo tem link na seção 8; o que não
consegui confirmar está marcado como **[não confirmado]** e listado na seção 9.

---

## 1. Resumo executivo

1. **Não existe atalho "sem Meta" para publicar em Instagram.** Todo caminho legítimo termina na API da Meta.
   O que existe é: (a) usar **a sua própria app** com a conta dentro dos papéis dela (Standard Access, **sem**
   revisão) ou com Advanced Access (**com** revisão); (b) usar **a app já aprovada de um terceiro** — você não
   passa por revisão nenhuma, quem passa é o provedor.
2. **A boa notícia:** a Meta documenta explicitamente que "app que só serve um negócio que eu possuo ou
   administro" fica em **Standard Access e não precisa de App Review** (`instagram-platform/app-review`,
   atualizada 30/06/2026). Então, para a conta da AutoClinic, existe caminho de custo zero — com as amarras da
   seção 2.1.
3. **Recomendação:** começar com **Upload-Post, plano Basic — US$ 24/mês** (US$ 16/mês no anual). Carrossel
   documentado (até 10 itens por post), uploads ilimitados, 5 perfis, webhooks de status e link de conexão
   para o dono da conta. Plano B quando o produto passar a atender várias clínicas: **Ayrshare Launch —
   US$ 299/mês** (10 perfis, webhooks, `POST /validate/post` para testar sem publicar).
4. **Nada disso dispensa dois pré-requisitos da conta:** ela precisa ser **Business ou Creator** e precisa ser
   conectada uma vez pelo dono (Facebook Page no caso do Ayrshare; fluxo do provedor no caso do Upload-Post).
5. **O gargalo real não é o provedor, é a mídia.** A Meta busca cada slide por **URL pública** e só aceita
   **JPEG**. Hoje o carrossel exporta PNG no navegador (`src/lib/hooks/use-component-printer.tsx`, html-to-image
   + JSZip) e não existe storage no repo. Publicar exige uma etapa nova: render server-side → JPEG → URL
   pública. É a maior parte do trabalho de integração (seção 5.2).

---

## 2. A verdade técnica: existe caminho sem app aprovado?

### 2.1 (a) API oficial do Instagram com app própria

Existem três montagens da API da Meta para Instagram profissional (`instagram-platform/overview`, 29/10/2026):

| Montagem | Login | Token | Página do Facebook | Publica carrossel |
|---|---|---|---|---|
| Instagram API with **Unified Login** (recomendada pela Meta p/ novas integrações) | Instagram ou Facebook | Business Integration System User token | não exige | sim |
| Instagram API with **Instagram Login** | Instagram | Instagram User token (`graph.instagram.com`) | não exige | sim |
| Instagram API with **Facebook Login** | Facebook | Page token (`graph.facebook.com`) | **exige** | sim |

**Nível de acesso — é aqui que a aprovação entra** (citação da doc de overview):

> "**Standard Access** […] is intended for apps that will only be used by people who have roles on them,
> during app development, or for testing your app. If your app only serves your Instagram professional account
> or an account you manage, Standard Access is all your app needs."
>
> "**Advanced Access** is the access level required if your app serves Instagram professional accounts that you
> don't own or manage and can be used by app users who do not have a role on your app […]. This access level
> requires App Review and Business Verification."

A doc de **App Review** (30/06/2026) tem a tabela de cenários, literal:

| Cenário | Login | Acesso | App Review |
|---|---|---|---|
| "My app is only for a business I own or manage" | sem login ou Instagram Login | Standard | **Não exigido** |
| "My app is only for a business I own or manage" | sem login ou Facebook Login | Standard | **Não exigido** |
| "I am a Tech Provider and my app serves multiple businesses" | Instagram Login | Advanced | **Exigido** |
| "I am a Tech Provider and my app serves multiple businesses" | Facebook Login | Advanced | **Exigido** |

**Verificação de negócio** (`business-verification`, atualizada 07/07/2023): exigida junto com Advanced Access,
**dispensada** quando "your app will only be used by app users who have a role on the app itself".

**Como funciona o caminho sem revisão na prática (papéis do app):** a doc `app-roles` (08/09/2025) diz que
**Tester** "can grant the app any permission while it is in development, and all features are active for
Testers while it is in development". O produto Instagram usa o papel **Instagram Tester** (adicionar o @ da
conta no App Dashboard → Roles). Limites documentados:

- apps **não** vinculados a um Business Manager: **até 50 testers**;
- apps vinculados a um Business com Business Verification: até **500** entre analytics users e testers.

**Prazo:** a Meta **não publica SLA** para App Review. A doc só lista o que precisa ser entregue: app testável
externamente, screencast do fluxo de cada permissão, instruções de teste para o revisor, ícone 1024×1024,
política de privacidade, categoria, e-mail de negócio, e "at least 1 successful API call" para pedir Advanced.
Relatos de mercado falam em **2 a 6 semanas, com rodadas de reprovação** — é estimativa de terceiro, não
compromisso da Meta **[secundário]**.

**Veredito (a):** ✅ **existe** caminho sem aprovação — app em modo de desenvolvimento + conta adicionada como
**Instagram Tester**, custo US$ 0. Serve para a conta da AutoClinic e para um punhado de contas.
Ressalvas honestas:
- a própria doc de papéis diz que o Tester deve ser "your employee ou […] acting on your behalf as a tester";
  para conta de **cliente** isso vira cinza jurídico, não é o desenho certo para revender;
- continua sendo **a sua app**, então **você** mantém OAuth, refresh de token de 60 dias, tratamento de
  container, rate limit e erros da Meta — trabalho que o provedor terceiro faria por você;
- se a Meta mudar regra de tester/app em desenvolvimento, você quebra sem aviso.

### 2.2 (b) Provedores terceiros com app já aprovada

Você conecta a conta pelo OAuth **deles**; a revisão da Meta já foi feita na app deles. Você nunca cria app na
Meta, nunca submete nada. Em troca: mensalidade, dependência de um intermediário e menos controle sobre o
token (ele fica com o provedor, não com você).

**Veredito (b):** ✅ é o caminho que responde ao pedido do Igor: publicar sem passar pela aprovação da Meta.
Custo mensal real na seção 3.

### 2.3 (c) Truques não oficiais (instagrapi, automação de app, emulador de navegador)

- O `instagrapi` (e primos) usa a **API privada móvel** do Instagram. O README dos mantenedores diz que
  "private API automation is fragile in production because account trust, proxies, device state, challenges
  and rate limits can change independently of the library".
- Os **Termos de Uso do Instagram** proíbem acesso automatizado sem permissão expressa, "regardless of whether
  such automated access is undertaken while logged-in".
- Consequência prática: challenge/selfie-review incontornável, suspensão de conta documentada no issue tracker,
  e a conta em risco é a **do cliente** (a estética), não a nossa.

**Veredito (c):** ❌ **não**. Viola ToS, põe a conta de um cliente pagante em risco de banimento e não tem
qualquer garantia de continuidade. Não é uma opção para produto — em nenhuma fase.

---

## 3. Comparativo dos provedores que publicam **carrossel**

Preços conferidos nas páginas oficiais em 12/11/2026 (câmbio não aplicado; valores como publicados).
"Não claro" = a documentação **não afirma**, e eu não assumo.

| Provedor | Preço real do plano que publica carrossel | Carrossel multi-imagem | Agendamento | Limite por mês | Exige conta Business/Creator | O que o usuário faz ao conectar | Conecta conta de terceiros (OAuth/white-label)? |
|---|---|---|---|---|---|---|---|
| **Ayrshare** | **Premium US$ 149/mês** (1 perfil, até 14 redes) · **Launch US$ 299/mês** (até 10 perfis) · Business US$ 599/mês (30 perfis). Sem plano grátis; 28 dias de teste no Launch | ✅ até **10** imagens/vídeos via `mediaUrls` | ✅ ilimitado | Ilimitado por post (limite da Meta é por conta) | ✅ **Business ou Creator + Página do Facebook vinculada** | Clica no link de conexão (JWT/link session) ou widget embutido, escolhe a Página e autoriza | ✅ `Profile-Key` por cliente + `/profiles/link-sessions` + widget Ayrshare Connect |
| **Upload-Post** | **Basic US$ 24/mês** (US$ 16 no anual, 5 perfis) · Professional US$ 50 (25 perfis + white-label) · Free US$ 0 (10 uploads/mês, 2 perfis) | ✅ `POST /api/upload_photos` com `photos[]`, até **10** no Instagram | ✅ | **ilimitado** nos planos pagos | ✅ profissional (Instagram não aceita perfil pessoal) | Recebe link de conexão white-label (JWT, 48h) ou conecta no painel | ✅ `createUser` + `generateJwt` → `access_url` |
| **Blotato** | **Starter US$ 29/mês** (20 contas, API + MCP inclusos em todo plano pago) | ✅ 2 a **10** `mediaUrls` = carrossel | ✅ | Ilimitado por post | ✅ profissional | Conecta a conta no painel do Blotato (sem white-label) | ⚠️ não é por usuário: uma API key da conta, N contas conectadas manualmente |
| **Publer** | **Business US$ 10/mês** (1ª conta) — anual US$ 8; cada conta extra ~US$ 7 **[secundário]**; Professional US$ 5 **não** tem API | ✅ carrossel listado nos tipos de post da API | ✅ | conforme plano | ✅ Business e Creator | Conecta no workspace do Publer | ❌ token de workspace (`Bearer-API` + `Publer-Workspace-Id`), não OAuth por cliente |
| **Buffer** | **US$ 5/canal/mês** (US$ 60/ano por canal; 1.000 requests/canal/mês) · US$ 10/canal/mês (3.000 requests) | ⚠️ **não claro**: `PostType` tem `carousel`, mas a doc de criação não mostra post de carrossel | ✅ | "unlimited" com fair use de 5.000 posts/canal | ✅ profissional | OAuth 2.0 + PKCE no seu app client (Settings → API) | ✅ app clients com PKCE documentados |
| **Metricool** | **Advanced a partir de €43/mês** (até 15 marcas) — é o plano onde a API existe | ✅ até **10** imagens ("Add more than 10 images to a carousel" consta como limitação) | ✅ | conforme plano | ✅ profissional | Conecta a marca no Metricool | ⚠️ **[não confirmado]** se há OAuth de terceiro; o que achei é token de usuário |
| **Postiz** (open source) | Self-host grátis em infra própria **mas** exige app própria na Meta · cloud US$ 29–99/mês **[secundário]** | ✅ (no cloud) | ✅ | conforme plano | ✅ profissional | Self-host: criar app Meta e configurar `INSTAGRAM_APP_ID/SECRET` | ❌ no self-host **não resolve** o problema — "Both methods will require a Meta for Developers account" |

Observações que importam para o nosso caso:

- **Carrossel é commodity entre os provedores**: 10 itens é o teto de todos, e o nosso carrossel é 5–10. Nenhum
  provedor vira gargalo de quantidade.
- **O diferencial real é multi-tenant**: só **Ayrshare, Upload-Post e Buffer** documentam fluxo para *usuário
  final* conectar a própria conta (link/JWT/widget/OAuth). Publer, Metricool e Blotato são "uma conta, um
  token" — ótimos para a AutoClinic sozinha, ruim para revender.
- **Exigência de Página do Facebook**: confirmada no Ayrshare ("Linking Instagram requires selecting a Facebook
  Page that is linked to an Instagram Account"). Para Upload-Post e Blotato **[não confirmado]** — validar no
  primeiro teste.

---

## 4. Recomendação

**Começar com Upload-Post — plano Basic, US$ 24/mês (US$ 192/ano, sai US$ 16/mês no anual).**

Por quê, em ordem de peso:
1. **Carrossel documentado e explícito** (`/api/upload_photos` com `photos[]`, 10 itens no Instagram), barato.
2. **Uploads ilimitados** — o custo não cresce com o volume de carrosséis, que é justamente o que a AutoClinic
   vai fazer (conteúdo diário/semanal).
3. **Já tem o que a fase 2 vai precisar**: link de conexão white-label (JWT de 48h), webhooks
   (`upload_completed`, `social_account_connected`), fila/retry, editar e despublicar.
4. **Teto de custo conhecido**: 5 perfis no Basic cobrem AutoClinic + contas de teste; profissional (25 perfis
   + white-label) é US$ 50/mês quando entrar cliente.
5. **Free tier real (10 uploads/mês)** permite o primeiro teste ponta a ponta sem cartão e sem gastar.

**Plano B (quando trocar):** **Ayrshare Launch, US$ 299/mês**, se o produto virar plataforma com dezenas de
clínicas conectando sozinhas. Motivos: provedor maior, `POST /validate/post` (valida o JSON sem publicar),
webhooks, widget embutido. Custo 12× maior no início — não faz sentido antes de haver cliente pagando.

**Descartados para começar:** Publer (sem OAuth por cliente, prende a um workspace), Metricool (só a partir de
€43 e mecanismo de conexão de terceiro não confirmado), Buffer (mais barato de todos, US$ 5/canal/mês, mas o
suporte a **criar** carrossel não está documentado — não dá para apostar o produto nisso), Postiz self-host
(exige app Meta, ou seja, o problema que o Igor quer evitar).

---

## 5. Plano de integração no carrossel

Contexto real do repo hoje: export é **client-side** (`html-to-image` + `JSZip` em
`src/lib/hooks/use-component-printer.tsx`), dados em Postgres do AutoClinic via BFF (`src/app/api/ac/[...caminho]`),
nenhum storage no `package.json`. Marca vem de `src/lib/default-document.tsx` (`name: "My name"`,
`handle: "@name"`) — a Fase 0 (W25) está movendo isso para as configurações da conta.

### 5.1 Pré-requisitos da conta (uma vez, feito por uma pessoa)

1. Instagram da AutoClinic em **Business ou Creator**.
2. Conta conectada no Upload-Post (`createUser` + `generateJwt` → `access_url`, ou pelo painel no primeiro teste).
3. Confirmar no painel: conta aparece como conectada e o perfil correto está vinculado ao nosso `profile_key`.

### 5.2 O gargalo: PNG no navegador → JPEG em URL pública

A Meta **busca** o arquivo (`image_url`) no momento da publicação: a URL precisa ser pública sem cookie, e
**JPEG é o único formato aceito** ("JPEG is the only image format supported"). O Upload-Post recebe o arquivo
via multipart (não exige URL nossa) — isso simplifica **o caminho escolhido**:

- **Escolha: render server-side → JPEG → multipart para o provedor.** Não precisamos de bucket público; basta
  enviar os bytes. Opções avaliadas:
  - **(A) Playwright no servidor** (`@playwright/test` já está no projeto como devDependency; já há
    `playwright.config.ts`) para abrir a rota do slide e tirar JPEG. Custo: Chromium de pé na VPS (~300–400 MB
    de RAM por contexto), fila de render, timeout.
  - **(B) `@react-pdf/renderer`** (já é dependência de produção) para gerar o slide como imagem/PDF. Menos
    fiel ao layout CSS real — risco de divergência visual entre o que o operador aprovou e o que publica.
  - **(C) Storage (S3/Supabase) + PNG do navegador**: o operador exporta e sobe. Mata o "automático".
  - **Decisão proposta:** **(A)** para fidelidade pixel a pixel — o operador aprova o slide no editor, então o
    publicado tem que ser aquele. Se a VPS não aguentar concorrência, (B) como fallback documentado, nunca (C)
    no fluxo principal.
- **Consequência de pipeline:** a publicação deixa de ser ação do navegador e vira **rota de servidor**
  (`POST /api/publicacao`), porque token e render não podem viver no cliente.

### 5.3 Fluxo de conexão (OAuth do provedor)

```
[Configurações da conta]
  → botão "Conectar Instagram"
  → backend: POST /api/publicacao/conectar
      gera/inventa profile (createUser com id da organização)
      chama generateJwt(profile_key, { redirectUrl: https://app/api/publicacao/callback, platforms:['instagram'] })
  → devolve { access_url } (48h) → navegador redireciona para lá
  → dono autoriza Instagram na página do provedor
  → provedor redireciona para /api/publicacao/callback
  → backend confirma GET no provedor: conta conectada? qual @? grava em `publicacao_conta`
```

Regras: `state` assinado e de uso único no callback; nunca aceitar `profile_key` vindo do cliente; callback
é server-side, então a `PUBLICADOR_API_KEY` não aparece no bundle.

### 5.4 Onde o segredo vive

| Segredo | Onde | Onde **não** |
|---|---|---|
| API key do provedor | env do servidor (`PUBLICADOR_API_KEY`), lida só em route handler | `NEXT_PUBLIC_*`, bundle, cliente |
| `profile_key` por organização | coluna em `publicacao_conta` (id interno, não segredo) | — |
| Token da conta IG do cliente | **nunca** passa por nós: fica com o provedor | banco, log, prompt de LLM |
| Segredo de webhook | env `PUBLICADOR_WEBHOOK_SECRET`, validação HMAC na entrada | — |

Se um dia guardarmos credencial nossa de cliente (não recomendado): tabela separada com `pgsodium`/KMS e
criptografia em repouso, nunca coluna em claro. Senha do Instagram do cliente **jamais** é armazenada — o
fluxo é OAuth, e ponto.

### 5.5 Modelo de dados proposto

```
publicacao_conta
  id, organizacao_id, provedor ('upload_post'), profile_key,
  ig_usuario (@), ig_user_id, conectado_em, estado ('conectado'|'expirado'|'revogado')

publicacao                       -- 1 linha por tentativa de publicar um carrossel
  id, carrossel_id, organizacao_id, publicacao_conta_id,
  status ('na_fila'|'renderizando'|'enviando'|'publicado'|'falhou'|'cancelado'),
  idempotency_key (carrossel_id + hash(slides+caption)),  -- impede post duplicado
  legenda, total_slides, provedor_post_id, permalink,
  erro_codigo, erro_mensagem, tentativas, criado_em, atualizado_em, publicado_em
```

Regra dura do produto (já é a do repo): **nada publica sozinho** — a linha só nasce de um clique humano em
`aprovado`. `publicado` é estado **final**; para corrigir, publica-se de novo (novo id) e o antigo é marcado
`cancelado`, nunca reescrito.

### 5.6 Legenda

Legenda vem da **marca dinâmica** (nome + @ das configurações da conta) + CTA do carrossel. Se a marca estiver
vazia, **omitir** — nunca imprimir "My name"/"@name" na legenda (mesma regra da Fase 0 para o slide).
Limite prático: 2.200 caracteres de legenda; validar antes de enviar e cortar em fronteira de palavra, com
aviso ao operador.

### 5.7 Status: webhook primeiro, polling como rede

- **Webhook** (`upload_completed`, `social_account_connected`) com validação de segredo → atualiza
  `publicacao.status` e grava `permalink`.
- **Polling de segurança** a cada 60 s por até 5 min apenas para publicações em `enviando` sem webhook (a doc
  da Meta recomenda exatamente essa cadência para container; o provedor abstrai o container, mas o timeout é o
  mesmo espírito).
- **Timeout duro**: se em 10 min não houver evento nem polling conclusivo → `falhou` com `erro_codigo='sem_confirmacao'`
  e o operador vê "publicação não confirmada — verificar no Instagram antes de repetir" (nunca retry automático
  cego, risco de post duplicado).

### 5.8 Quando falha (matriz de ação)

| Sintoma / código | Causa provável | Ação |
|---|---|---|
| `session expired` / conta desconectada | dono trocou senha, revogou acesso ou virou perfil pessoal | marcar `publicacao_conta.estado='expirado'`, pedir reconexão; não retentar |
| mídia não buscada / 400 no upload | arquivo corrompido, > limites, formato errado | validar no render: JPEG, ≤ 8 MB, 1080×1350, 1 slide por arquivo |
| "duplicate/similar content" | repetição do mesmo conteúdo | bloquear antes do envio pela `idempotency_key`; se veio do provedor, mostrar mensagem clara |
| rate limit da Meta (100 posts/24h por conta) | volume | fila com contador por conta; erro definitivo, não retry |
| 5xx do provedor | instabilidade | retry exponencial 3× (1 min, 5 min, 15 min) com a **mesma** `idempotency_key` |
| webhook perdido | rede | polling 5 min; se achar publicado, reconciliar `publicado` |

Toda falha grava `erro_codigo` + mensagem crua do provedor (sem PII) e aparece na tela do carrossel com um
botão único: **Tentar de novo** (novo idempotency key só se o operador confirmar que não publicou).

### 5.9 Como testar sem postar de verdade

1. **Free tier do Upload-Post** (10 uploads/mês) + **conta de teste** (um IG Business separado, nunca o da
   AutoClinic). Publica de verdade, mas em conta descartável — é o único teste que prova o caminho todo.
2. **Modo sombra no nosso código**: `PUBLICADOR_MODO=sombra` faz o serviço renderizar, validar e **parar antes
   do POST**, gravando o payload completo em log estruturado. Cobre 90% dos testes de CI sem sair da máquina.
3. **Testes automatizados** com o provedor mockado (fetch stub) cobrindo: sucesso, sessão expirada, 5xx com
   retry, webhook duplicado, timeout.
4. Se um dia formos de Ayrshare: `POST /validate/post` valida o JSON exato sem publicar (documentado).

### 5.10 Gates de aceite da fase de publicação

- carrossel de 7 slides → JPEG ×7 renderizados no servidor, 1080×1350, mensurável por `pngjs`/`pixelmatch`
  (já no projeto);
- publicação em conta de teste retorna `permalink` e a linha vai a `publicado`;
- revogar acesso no Instagram → próxima tentativa falha com `expirado` e a UI pede reconexão;
- dois cliques em "Publicar" → **um** post (idempotência provada);
- webhook simulado com segredo errado → 401 e nada muda no banco.

---

## 6. Riscos e o que fazer

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| **Provedor sobe preço** | média (o piso de entrada do Ayrshare hoje é US$ 149/mês) | custo | teto contratual mensal; provedor isolado atrás de uma interface `PublicadorPort` (1 arquivo) para trocar em dias |
| **Dependência de terceiro** (regra, mudança de API) | média | publicação para | adapter fino + testes contra o contrato nosso; assinar changelog; manter rota manual "baixar ZIP e postar" sempre viva |
| **Conta do cliente bloqueada/derrubada** | baixa-média (conteúdo, não automação) | o cliente perde o perfil, não o produto | publicação só de conteúdo aprovado por humano; nunca usar automação não oficial; contrato diz que a conta é do cliente |
| **Provedor cai** (fora do ar) | baixa | atraso de publicação | fila local persistente + retry; status nunca fica ambíguo; fallback manual com o ZIP |
| **Token/credencial vaza** | baixa | postam na conta do cliente | token do IG nunca passa por nós; API key só em env de servidor; rotação; log sem segredo |
| **Revisão da Meta pega o provedor** (app dele reprovada) | baixa | perda do canal | segundo provedor homologado (Ayrshare) pronto para plugar; não é migração de semanas |
| **Divergência visual render vs. aprovado** | média | peça publicada errada | render do mesmo componente React do editor; teste de imagem (pixelmatch) no gate |
| **Formato do Instagram** (corte pelo 1º slide) | certa se ignorada | slides cortados | todos os slides 4:5 1080×1350; o 1º define o corte de todos |

---

## 7. Regras do Instagram que afetam o gerador (checadas na doc de 20/10/2026)

- **JPEG é o único formato de imagem aceito.** Nosso export atual é PNG → precisa converter no servidor.
- **Mídia em servidor público** no momento da publicação (o provedor resolve isso por nós; se um dia usarmos
  API própria, é requisito).
- **Carrossel é cortado pela proporção do primeiro slide**, default 1:1. Como geramos 4:5 (1080×1350), todos os
  slides têm que sair 4:5 — qualquer slide com outra proporção sai cortado.
- **Tamanho do carrossel:** a doc diz, em um trecho, "up to 20 images, videos, or a combination"; em outro,
  "Carousels are limited to 20 images"; o diagrama da mesma página mostra 10. Os provedores que documentam o
  limite (Ayrshare, Upload-Post, Blotato, Metricool) param em **10**. Nosso intervalo é 5–10 → sem risco. Não
  existe folga para pedir 12 no futuro sem re-checar (Publer não declarei limite — não confirmei).
- **Limite de publicação:** 100 posts publicados por API em 24h por conta (carrossel conta como 1); um trecho da
  doc fala em 50 — a própria página é inconsistente. Para o nosso volume é irrelevante.
- **Container expira em 24h** e status vai a `EXPIRED`; polling recomendado 1×/min por até 5 min. O provedor
  gerencia, mas o nosso timeout segue a mesma lógica.
- **`is_ai_generated`** existe na API (só no container pai do carrossel). Decidir com o Igor se conteúdo gerado
  por IA deve ser marcado — hoje o produto usa LLM no texto.
- Legenda: 2.200 caracteres; hashtags e menções têm limites práticos próprios.

---

## 8. Fontes (todas consultadas em 12/11/2026)

| # | Fonte | O que usei |
|---|---|---|
| 1 | Meta — Instagram Platform overview (atualizada 29/10/2026) — https://developers.facebook.com/documentation/instagram-platform/overview | Standard vs Advanced Access, 3 montagens, 60 dias de token, conta profissional obrigatória |
| 2 | Meta — App Review for Instagram API (atualizada 30/06/2026) — https://developers.facebook.com/documentation/instagram-platform/app-review | tabela "app só para negócio que possuo → App Review não exigido"; requisitos da submissão |
| 3 | Meta — Business Verification (atualizada 07/07/2023) — https://developers.facebook.com/documentation/development/release/business-verification | verificação dispensada com papéis no app |
| 4 | Meta — App Roles (atualizado 08/09/2025) — https://developers.facebook.com/documentation/development/build-and-test/app-roles | Tester recebe qualquer permissão em desenvolvimento; **até 50 testers** (500 se vinculado e verificado) |
| 5 | Meta — Content Publishing (atualizada 20/10/2026) — https://developers.facebook.com/documentation/instagram-platform/content-publishing | carrossel (`media_type=CAROUSEL` + `children`), JPEG, URL pública, corte pelo 1º slide, 100 posts/24h, status do container, `is_ai_generated` |
| 6 | Ayrshare — Pricing — https://www.ayrshare.com/pricing/ | Premium US$ 149 / Launch US$ 299 / Business US$ 599; webhooks a partir do Launch; 28 dias de teste |
| 7 | Ayrshare — Instagram API docs — https://www.ayrshare.com/docs/apis/post/social-networks/instagram | carrossel até 10 via `mediaUrls` |
| 8 | Ayrshare — Fix Instagram Linking — https://www.ayrshare.com/docs/help-center/technical-support/facebook-or-instagram-linking-issues | exige Business/Creator **+ Página do Facebook** |
| 9 | Ayrshare — API Integration for Business — https://www.ayrshare.com/docs/multiple-users/api-integration-business · Ayrshare Connect — https://www.ayrshare.com/blog/introducing-ayrshare-connect/ | `Profile-Key`, link sessions/JWT, widget embutido |
| 10 | Ayrshare — Validate a Post — https://www.ayrshare.com/docs/apis/validate/validate-post | valida sem publicar |
| 11 | Upload-Post — Pricing — https://www.upload-post.com/pricing/ | Free 10 uploads/2 perfis; Basic US$ 24 (US$ 16 anual, 5 perfis); Professional US$ 50 (25 perfis, white-label); uploads ilimitados |
| 12 | Upload-Post — FAQ (carrossel) — https://docs.upload-post.com/resources/faq | `POST /api/upload_photos` com `photos[]`; Instagram 10 itens; validade de token e reconexão |
| 13 | Upload-Post — Webhooks — https://docs.upload-post.com/api/webhooks | `upload_completed`, `social_account_connected`, secret HMAC |
| 14 | Upload-Post — White label — https://www.upload-post.com/whitelabel/ | `createUser` + `generateJwt` → `access_url` 48h |
| 15 | Blotato — Pricing — https://www.blotato.com/pricing | Starter US$ 29/mês, 20 contas; API+MCP em todo plano pago |
| 16 | Blotato — Publish post (REST) — https://help.blotato.com/rest-api-reference/publish-post · https://www.blotato.com/api/instagram | múltiplos `mediaUrls` = carrossel (2–10) |
| 17 | Publer — Plans — https://publer.com/plans · Help "Plans and Pricing" — https://publer.com/help/en/article/15h4yqh/ | Professional US$ 5, Business US$ 10 (1ª conta), +US$ 4/+US$ 7 por conta |
| 18 | Publer — API docs — https://publer.com/docs | token `Bearer-API` + `Publer-Workspace-Id`; carrossel entre os tipos de post |
| 19 | Buffer — Pricing — https://buffer.com/pricing | US$ 5/canal/mês (1.000 requests), US$ 10/canal/mês (3.000) |
| 20 | Buffer — Building Apps / Authentication — https://developers.buffer.com/guides/building-apps.html · https://developers.buffer.com/guides/authentication.html | OAuth 2.0 + PKCE, app clients, escopos `posts:write` |
| 21 | Buffer — API reference — https://developers.buffer.com/reference.html | `PostType` inclui `carousel`; criação de carrossel **não** documentada |
| 22 | Metricool — Pricing — https://metricool.com/pricing/ | API no plano Advanced (a partir de €43/mês) |
| 23 | Metricool — API limitations per network — https://help.metricool.com/api-limitations-per-social-network-n7zlr | carrossel até 10 imagens; limitações por rede |
| 24 | Postiz — Self-host Instagram — https://docs.postiz.com/self-host/providers/instagram | "Both methods will require a Meta for Developers account" |
| 25 | instagrapi — README e best practices — https://github.com/subzeroid/instagrapi · https://instagrapi.com/guides/instagram-private-api-python | fragilidade em produção, risco de suspensão |
| 26 | Instagram — Termos de Uso (via análise citada) — https://help.instagram.com/581066165581870/ | proibição de acesso automatizado sem permissão |
| 27 | Relatos de prazo de App Review (secundário) — https://www.blotato.com/blog/instagram-api-pricing | 2 a 6 semanas, múltiplas rodadas |

**[secundário]** = não é fonte primária e não deve ser citado como fato para o Igor sem essa marcação.

---

## 9. O que não está claro (não estou assumindo)

1. **Buffer:** a API tem `PostType.carousel` no enum, mas **não achei documentação de criação** de post de
   carrossel. Marcado como "não claro" de propósito — não serve de base para decisão.
2. **Metricool:** mecanismo de autorização para apps de terceiros (OAuth) não localizado; o que existe é token
   de usuário. Se multi-tenant importar, precisa confirmação com o suporte deles.
3. **Upload-Post e Blotato:** não confirmei se exigem **Página do Facebook vinculada** (o Ayrshare exige).
   Pode aparecer como bloqueio no primeiro teste; testar antes de prometer prazo.
4. **Upload-Post — teste sem publicar:** não achei "dry run" documentado; o caminho é free tier + conta de
   teste + modo sombra nosso.
5. **Prazo de App Review:** a Meta não publica SLA; os "2 a 6 semanas" são de terceiros.
6. **Carrossel de 11–20 itens:** a doc da Meta parece permitir 20 em um trecho; todos os provedores param em
   10. Se o produto quiser >10, é assunto novo.
7. **Preço do Postiz cloud** (US$ 29–99) veio de fonte secundária; a página de pricing oficial não foi lida.
