# GAP — CarrosseIA × nosso estúdio

Comparativo entre `carrosseia.com.br/app` (alvo que estamos clonando) e o nosso
`carousel-generator` (Next 14, repo `igorgomes3/carousel-generator`), medido em **23/11/2026**.

De onde vem cada coluna, para ninguém confundir opinião com observação:

- **Eles têm**: REA autenticada de 21/11 (`docs/rea/CARROSSEIA-REA-AUTENTICADA.md`), REA de
  auth de 23/11 (`docs/rea/CARROSSEIA-AUTH-REA.md`), prints em `screenshots/auth-rea/` e
  leitura do bundle servido ao vivo.
- **Nós temos**: código na `main` (issues #8, #10, #11, #12, #13, #15, #16, #17, #18),
  `docs/rea/NOSSO-CODIGO.md` e `docs/rea/PLANO-CLONE.md`.
- **Impacto** = o quanto a falta machuca um usuário leigo (alto / médio / baixo).
- **Custo** = esforço para implementar bem no nosso código (baixo / médio / alto).

## 1. Tabela principal

| Área | Eles têm | Nós temos | Falta | Impacto | Custo |
|---|---|---|---|---|---|
| **Criação** | Wizard de 4 passos: Templates → Tema → Roteiro → Imagens. "Criação rápida com IA" (ideia em texto → template + roteiro, 13 créd.). 30 templates com chips de categoria e busca. Escolha do nº de slides. | Wizard próprio: ideia + galeria de 30 templates, passo 2 com tema, nº de cards (3–10) e upload por card. Formato editorial por nicho (9 formatos × 12 nichos) com gancho decidido em código. | **Importar roteiro próprio** ("Já tenho o texto, importar"), **link de matéria lido de verdade**, e a criação rápida responder em ~2 s com template escolhido por IA (`/api/quick`). | alto (importar) / médio (link) | baixo / médio |
| **Edição de card** | Passo 3 denso: título e corpo por card, **palavra de impacto** por card, fonte de título e de corpo, paleta com 4 cores clicáveis, `@` do Instagram, **logo da marca** em todos os cards, **upload de fonte própria**, tamanho da arte **3:4 / 4:5 / 1:1** (3:4 padrão com janela segura 4:5). | Texto por card, `@`, paleta (fundos/destaques) e pares de fontes curados, janela segura 4:5, card 3:4. | Logo por upload, fonte própria (upload), palavra de impacto por card, escolha 1:1 e 4:5 clássico, "aplicar visual a partir de um projeto". | alto (logo) / baixo (resto) | baixo a médio |
| **Imagens** | Capa por IA com **prompt de cena** opcional ou upload da própria capa; imagem por card; artes nativas por formato (1024 / 1088×1360 / 1080×1440). | Upload por card com redimensionamento, geração por card via `/api/imagem` (job + poll, `data:` URI), fallback de arte da paleta quando o provedor não entrega. | Escolha explícita "gerar capa com IA?" **com o custo na cara** e prompt de cena por card; upload de capa própria separado da foto do card. | médio | baixo |
| **Salvar / publicar** | Grava em `projects` (Supabase) **por conta**; "Meus projetos" com abrir, renomear, apagar e **"usar este visual"**. Publicação é download manual — não existe feed nem agendamento. | Salvamento explícito com hora ("Salvo às 14:32"), "Meus projetos" com abrir/renomear/apagar, store próprio. | **Projeto pertencer à conta** (hoje é cookie anônimo `estudio_dono`), "usar este visual", versões/restauração. | **alto** | médio |
| **Download** | PNG por card e "tudo em ZIP", **preso a plano ativo** (paywall no clique). | PNG individual e ZIP (`jszip`), `document.fonts.ready` antes de rasterizar, 1080×1350 conferido nos bytes. | Nada funcional. O nosso é mais generoso: baixa sem plano. | — | — |
| **Conta / equipe** | Supabase Auth: e-mail+senha, **"Continuar com Google"**, cadastro self-serve, **recuperação de senha por e-mail** (com tratamento de link vencido). Cabeçalho com e-mail, plano, créditos e **Sair**. Sem times/convites. | GoTrue do AutoClinic (e-mail+senha), BFF `/api/auth/*`, e desde a issue #19 menu da conta com nome, e-mail, papel e **Sair da conta**, aviso de sessão expirada e erro de credencial em português. | Cadastro self-serve, login com Google, **recuperação de senha por e-mail** (hoje: "peça a quem administra"), convite de equipe/papéis, tela de conta (o alvo também não tem). | alto (reset) | baixo (GoTrue já suporta) |
| **Modelos** | `modelos` por conta (nomear preset, marcar padrão), `brand_kits` (paletas salvas), "usar o visual" de um projeto. Templates vêm do **banco**, não do JS. | 30 templates extraídos do bundle, fixos em `src/lib/templates.ts`; paleta e fontes ajustáveis por carrossel. | Modelos salvos ("Feito 1"), paletas salvas, biblioteca por conta. | médio | médio |
| **Integrações** | Kirvano (checkout, webhook, "já comprei e não liberou"), **Claude MCP** (`/api/mcp`, `mcp-key`, `mcp_drafts`), Meta Pixel + Google Ads/gtag, OAuth Google, chat de suporte, `/api/origem` (atribuição de primeiro toque), i18n por `data-i18n` e mercado `br`. | 9Router (texto `flash`, imagem `gpt-image*`), GoTrue do AutoClinic, rate-limit por IP. | Pagamento/assinatura, analytics de funil, MCP, suporte, i18n. | alto se for vender / baixo hoje | alto |
| **Paywall / créditos** | 30 créditos de entrada; roteiro 3, arte 10, criação rápida 13; planos a partir de R$47/mês, top-up R$9,90; paywall no **download** com copy diferente para trial e para plano vencido; capa/fotos retidas 7 dias sem plano; página `/creditos` explicando em português. | Nenhum controle de crédito, plano ou paywall. O único freio é `rate-limit` por IP na server action de geração. | Modelo de créditos, planos, paywall no download, página de política. | alto (se monetizar) | alto |

## 2. Lista priorizada (uma linha de justificativa cada)

Ordem = impacto para o leigo ÷ custo. As três primeiras são as que hoje **perdem trabalho
do usuário**.

1. **Projeto amarrado à conta** (alto / médio) — hoje a lista vive no cookie `estudio_dono`:
   trocar de navegador, limpar cookies ou usar o celular faz "Meus projetos" sumir, e quem
   está logado no GoTrue não é o dono de nada.
2. **Recuperação de senha por e-mail** (alto / baixo) — o GoTrue já tem
   `recover`/`verify`; falta SMTP e a tela, e hoje o produto manda o usuário pedir senha
   temporária a um administrador — para um leigo isso é "perdi a conta".
3. **Importar roteiro próprio** (alto / baixo) — quem já escreveu o texto no WhatsApp não
   quer pagar (nem esperar) geração de copy: é só mapear texto → `slides` e reusar o render.
4. **Logo da marca no card** (alto / baixo-médio) — identidade é o primeiro pedido de quem
   posta carrossel profissional; o render já tem a barra de assinatura, falta o upload.
5. **"Usar este visual"** (médio / baixo) — quem acertou a paleta uma vez não quer refazer
   em cada carrossel; sem isso o template fixo manda mais que a marca.
6. **Capa por IA como escolha explícita, com prompt e custo** (médio / baixo) — hoje a capa
   é automática; sem a escolha o usuário não sabe por que a foto ficou daquele jeito.
7. **Link de matéria lido de verdade** (médio / médio) — o alvo promete e cumpre via
   `/api/import`; a nossa copy já foi removida justamente porque não fazia.
8. **Cadastro self-serve + Google** (médio / baixo) — sem isso cada conta nova passa por
   nós; o GoTrue suporta os dois, é configuração + tela.
9. **Modelos salvos e paletas salvas** (médio / médio) — é o que transforma "gerador" em
   ferramenta de rotina, mas exige tabela por conta (depende do item 1).
10. **Palavra de impacto por card + 1:1 / 4:5** (baixo / baixo) — polimento de edição; o
    3:4 com janela 4:5 já cobre o feed.
11. **Analytics de funil (pixel/gtag)** (baixo / baixo) — só importa quando houver tráfego
    pago para medir; sem isso não há como saber onde o funil vaza.
12. **Créditos + planos + paywall** (alto se vender / alto) — decisão de negócio antes de
    engenharia: custa mais caro errar a ordem de cobrança do que construir a tela.
13. **Claude MCP e convite de equipe** (baixo / alto) — público nichado; o alvo tem porque
    atende agência, nós ainda não.

## 3. O que o alvo faz e nós **não** devemos copiar

1. **Access token no `localStorage`** (chave `sb-…-auth-token` com access + refresh): um XSS
   leva a sessão inteira e ela sobrevive ao fechamento do navegador. O nosso access fica em
   memória; só o refresh é persistido.
2. **"Sair" global silencioso** (`logout?scope=global`): derruba a sessão em todos os
   aparelhos e não avisa ninguém.
3. **Sessão vencida sem explicação**: o alvo volta ao muro de login com a copy de marketing;
   nós redirecionamos com `/login?expirado=1` e a frase na tela.
4. **Erro do provedor cru na tela** ("Não deu certo: Invalid login credentials"): nosso
   `mensagens.ts` traduz por tipo de falha e mantém a frase genérica de credencial para não
   revelar quais e-mails têm conta.
5. **Reter capa e fotos por 7 dias sem plano**: é retenção por pressão, não por limite
   técnico — o nosso storage é nosso e não tem por que ameaçar apagar trabalho.
