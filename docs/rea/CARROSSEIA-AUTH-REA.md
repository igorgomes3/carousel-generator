# REA — login, sessão e saída do CarrosseIA (23/11/2026)

Alvo: `https://carrosseia.com.br/app` (e `/planos`, `/creditos`). Método: navegador real
com o login preenchido pelo cofre (`browser_vault`, origem `https://carrosseia.com.br`),
leitura do DOM ao vivo, captura da rede com wrap de `window.fetch` e leitura do script
inline que o próprio site serve (570 KB, script `#6`).

Nenhuma senha foi digitada, lida, ecoada ou registrada. Nenhum e-mail foi disparado
(nada de "esqueci a senha" com endereço real) e nenhuma conta foi criada: os dois fluxos
foram lidos no código do alvo e medidos só nos estados que não produzem efeito externo.
O login recusado foi testado com um e-mail inexistente (`naoexiste.auth.rea@example.com`).

Borda: a primeira requisição cai num challenge do Cloudflare (`Checking your browser…`)
que passa sozinho em alguns segundos. Não há CAPTCHA na tela de login, e não há 2FA:
com e-mail + senha a sessão abre direto.

## 1. Tela de login (o "muro")

`/app` sem sessão monta o app inteiro e cobre com um gate (`#authgate`, classe `.on`);
o `<body>` ganha `.anon` e o conteúdo atrás escurece. Não é rota separada — é o mesmo
`/app`.

Card (`.auth-card`), de cima para baixo:

| elemento | detalhe |
|---|---|
| marca | `logo.png`, 32 px |
| subtítulo `#authSub` | "Crie carrosséis em **menos de 1 minuto**. A IA escreve o roteiro e desenha as artes, prontas pra postar nas suas redes." |
| abas `#tabLogin` / `#tabSignup` | `Entrar` (ativa) · `Criar conta` |
| `#authErr` / `#authOk` | faixas de erro (vermelho) e sucesso (verde) |
| `#nameField` | label "Seu nome", placeholder "Como quer ser chamado" — **só na aba Criar conta** |
| `#emailField` | label "E-mail", `type=email`, placeholder `voce@email.com`, `autocomplete=email` |
| `#authPass` | label "Senha", `type=password`, placeholder "mínimo 6 caracteres", `autocomplete` muda para `new-password` no cadastro |
| `#authSubmit` | botão laranja cheio: "Entrar" / "Criar conta" / "Salvar nova senha" / "Aguarde…" durante o envio |
| `#forgotBtn` | link "Esqueci a senha" |
| `#authOr` | divisor "ou" |
| `#googleBtn` | "Continuar com Google" (OAuth Supabase) |
| `#authFoot` | "Ao entrar ou criar a conta, você concorda com os **Termos de Uso** e a **Política de Privacidade**." |

Fora do card: botão flutuante verde "Suporte" (canto inferior direito).

Variações por query string, lidas no código e observáveis pela URL:

- `/app?login` → abre na aba Entrar com "Bem-vindo de volta. Entre na sua conta."
- `/app?signup` → abre na aba Criar conta com "Crie sua conta para começar."
- `/app?signup&bought=1` → "Pagamento recebido! Crie sua conta com o **mesmo e-mail da compra** pra liberar seus créditos." (vem da Kirvano)
- chegada pelo link do e-mail de senha → o muro vira **uma pergunta só** (senha nova): abas, e-mail, Google e "esqueci a senha" desaparecem.

### Validação (client-side) e mensagens de erro

O formulário não usa `required` do HTML: valida no clique e escreve em `#authErr`.

| situação | mensagem |
|---|---|
| e-mail vazio ou senha < 6 | "Informe e-mail e senha (mínimo 6 caracteres)." |
| senha nova < 6 | "A senha nova precisa de 6 caracteres ou mais." |
| "Esqueci a senha" sem e-mail no campo | "Digite seu e-mail no campo acima e clique aqui de novo." |
| credencial errada | "E-mail ou senha incorretos." |
| e-mail já cadastrado (signup) | "Esse e-mail já tem conta. Faça login." |
| e-mail não confirmado | "Confirme seu e-mail antes de entrar (veja sua caixa de entrada)." |
| rate limit de e-mail | "Estamos com muitos cadastros ao mesmo tempo agora. Espere 1 minuto e tente de novo. Se você já comprou, seus créditos estão guardados…" |
| senha fraca | "Senha muito curta (mínimo 6 caracteres)." |
| qualquer outro | "Não deu certo: <mensagem do provedor>" (vaza o inglês do Supabase) |

Confirmado ao vivo: submit vazio → "Informe e-mail e senha (mínimo 6 caracteres).";
"Esqueci a senha" sem e-mail → "Digite seu e-mail no campo acima e clique de novo";
login com conta inexistente → `POST /auth/v1/token?grant_type=password` responde **400**
`{"code":"invalid_credentials","message":"Invalid login credentials"}` e a tela mostra
"E-mail ou senha incorretos.". O botão volta a "Entrar" e o muro continua de pé.

## 2. Cadastro

Aba "Criar conta" = mesmos campos + "Seu nome". `signUp({ email, password, options: {
data: { full_name: nome }, emailRedirectTo: origin + '/app' } })`. Sem sessão imediata
(confirmação por e-mail ligada): a tela mostra "Conta criada! Confirme o e-mail que
enviamos e depois faça login.". `emailRedirectTo` é montado a partir do **origin do
navegador**, de propósito: quem se cadastra no domínio `carouselia.app` confirma no
próprio domínio, em vez de cair no `carrosseia.com.br`.

Dispara `CompleteRegistration` (Meta Pixel + `sign_up` no Google).

## 3. Recuperação de senha

`resetPasswordForEmail(email, { redirectTo: origin + '/app' })`. Mensagem de sucesso:
"Enviamos um link pra **e-mail**. Se não chegar em 2 minutos, olhe no spam e na aba
Promoções.".

O retorno é tratado pelo hash da URL, no cliente:

- `#...type=recovery` → `VEIO_RECUPERAR`: o Supabase emite `PASSWORD_RECOVERY`, o app
  chama `pedeNovaSenha()` e o muro passa a pedir **só a senha nova** ("Você entrou pelo
  link do e-mail. **Defina sua senha agora** pra não perder o acesso de novo."). Grava com
  `updateUser({ password })` e confirma "Senha trocada. É com ela que você entra da
  próxima vez.".
- `#...error_code=otp_expired` (link vencido/já usado) → "Esse link de senha venceu ou já
  foi usado. Digite seu e-mail abaixo e toque em **Esqueci a senha** pra receber outro.".

Comentário do próprio código do alvo: até 01/10 o link logava a pessoa e a senha
continuava a antiga — ninguém pedia a nova.

## 4. Sessão: onde vive, quanto dura, como renova

| item | valor observado |
|---|---|
| provedor | Supabase `https://afzzgrdphccvvbumqhjm.supabase.co/auth/v1` |
| config do cliente | `GET /api/config` devolve `supabaseUrl`, `supabaseAnonKey`, `authEnabled`, `cost` |
| storage | **`localStorage`**, chave `sb-afzzgrdphccvvbumqhjm-auth-token` |
| conteúdo | `{access_token, token_type:"bearer", expires_in:3600, expires_at, refresh_token, user, weak_password}` |
| cookies | **nenhum** (nenhum cookie de sessão, nem de CSRF) |
| validade do access | 3600 s (1 h) |
| refresh | presente desde o login; `supabase-js@2` renova sozinho (`autoRefreshToken`) |
| logout no servidor | `POST /auth/v1/logout?scope=global` → **204** |

`scope=global` significa que "Sair" revoga as sessões da conta **em todos os aparelhos**,
não só naquele navegador. Nenhuma tela avisa isso.

Estado após a sessão morrer (testado quebrando o `refresh_token` no `localStorage` e
recarregando): o Supabase não consegue renovar, apaga a chave `sb-…-auth-token`, o app
volta ao muro de login com o **subtítulo padrão de marketing** — sem uma linha dizendo
"sua sessão expirou". A pessoa não sabe se foi deslogada, se errou a senha ou se o site
quebrou.

Também existe um modo dev: `authEnabled: false` (ou sem `window.supabase`) abre o app sem
login, sem créditos — é o que roda em `/app?render=1`, usado pelo navegador headless que
só desenha os cards.

## 5. Conta, perfil e a barra logada

Cabeçalho logado (`#acct`): `Aprendizado · Meus projetos · Claude MCP · Ver Planos ·
[4] créditos · avatar com inicial`.

Menu do avatar (`#acctMenu`, 264 px, sobrepõe o conteúdo, fecha com clique fora):

1. e-mail da conta (`#acctEmail`)
2. plano (`#acctPlan`: "SEM PLANO" / nome do plano)
3. "Gerenciar plano" → `https://app.kirvano.com/purchases` (só para quem tem/tinha plano)
4. Meus projetos · Ver Planos · Aprendizado · Claude MCP
5. "Fazer upgrade →" (laranja)
6. **"Sair"** (botão outline, largura total)

**Não existe tela de conta/perfil.** Não há rota `/conta`, `/perfil` ou `/configuracoes`
nesse site: nome, foto e logo não são dados de conta, são campos do carrossel — o `@` do
perfil mora no passo 3 ("Roteiro e ajustes"), a foto de perfil (`template post`) e a logo
(`style.logo`) são upload por carrossel. O único "perfil" persistido é a linha em
`profiles` (créditos, plano, `ref_code`, `is_admin`), que nenhuma tela edita.

## 6. O que "Sair" limpa

Medido antes/depois do clique em `#logoutBtn`:

| antes | depois |
|---|---|
| `localStorage`: `cs_origem`, `sb-afzz…-auth-token`, `cs_origem_detalhe` | `cs_origem`, `cs_origem_detalhe` |
| `body.anon` = false · `#acct` visível | `body.anon` = true · `#authgate` com `.on` |
| URL `/app` | URL `/app` (não redireciona) |

Ou seja: some o token (access + refresh), somem o menu e o cabeçalho logado, o muro volta
com a copy padrão; **ficam** as chaves de atribuição de marketing (`cs_origem*`). Não há
redirect, não há tela "você saiu", não há confirmação — a sensação é de que o app voltou
sozinho para a tela de login.

## 7. O que dá para fazer sem login

| ação | sem login |
|---|---|
| ver a home/app, chips de categoria, grade de templates | sim (o gate cobre com overlay, mas a página é a mesma) |
| abrir a prévia de um template ("Usar esse template") | sim — o modal `#tplPreview` abre |
| "✨ Criar com IA" / gerar roteiro / gerar arte | **não**: o clique reabre o muro |
| meus projetos, créditos, MCP | não |
| `/planos`, `/creditos`, `/termos`, `/privacidade` | sim, públicas |

## 8. Paywall e créditos (contexto para o comparativo)

- Página `/planos`: "Carrosséis que convertem, prontos em menos de 1 minuto", comparação
  com designer (R$150/carrossel), planos a partir de R$47/mês sem fidelidade (Kirvano).
- Página `/creditos`: política em português claro — quanto custa cada ação, duração,
  o que acontece no vencimento e por que o download exige plano ativo.
- Entrada com 30 créditos; roteiro 3; capa/arte 10; criação rápida 13.
- Sem plano: capa e fotos ficam guardados 7 dias depois da última edição; texto e layout
  continuam.
- Paywall do **download** (`openTrialPay`): "Seu carrossel está **pronto** — baixe agora e
  continue criando o mês inteiro." Para quem já assinou e venceu: "Seu plano **venceu** —
  renove para baixar este carrossel… Seus projetos continuam salvos." A peça pronta
  aparece em miniatura dentro do modal, com o e-mail da conta na instrução de pagamento.
- "Já comprei e não liberou" existe porque ~70% dos chamados eram conta criada com um
  e-mail e compra feita com outro.

## 9. Defeitos do alvo que valem registro

1. Erro desconhecido mostra o texto cru do Supabase em inglês ("Não deu certo: …").
2. Sessão vencida = muro de login sem explicação.
3. "Sair" revoga a sessão global (todos os aparelhos) sem avisar.
4. `localStorage` guarda access **e** refresh token: qualquer XSS no domínio leva a sessão
   inteira, e ela sobrevive ao fechamento do navegador.

## 10. Prints (390 e 1440, em `screenshots/auth-rea/`)

| tela | arquivos |
|---|---|
| login | `01-login-1440.png`, `01-login-390.png` |
| criar conta | `02-cadastro-1440.png`, `02-cadastro-390.png` |
| recuperar senha sem e-mail | `03-recuperar-sem-email-1440.png`, `03-recuperar-sem-email-390.png` |
| home logada | `04-home-logada-1440.png`, `04-home-logada-390.png` |
| menu da conta | `05-menu-conta-1440.png`, `05-menu-conta-390.png` |
| depois de sair | `06-apos-sair-1440.png`, `06-apos-sair-390.png` |
| sessão expirada | `09-sessao-expirada-1440.png`, `09-sessao-expirada-390.png` |
| erro de credencial | `10-erro-credencial-1440.png`, `10-erro-credencial-390.png` |
| planos | `07-planos-1440.png`, `07-planos-390.png` |
| créditos | `08-creditos-1440.png`, `08-creditos-390.png` |

## 11. O que isso mudou no nosso estúdio (issue #19)

| achado do alvo | o que fizemos |
|---|---|
| identidade no cabeçalho (e-mail + inicial) e menu com **"Sair"** | `MenuConta` no estúdio, em Meus projetos e em Configurações |
| sair limpa token e cookie, sem redirect e sem confirmação | `sair()` + `router.replace("/login?saiu=1")` com faixa "Você saiu da sua conta." |
| sessão vencida = muro mudo | evento `ac:sessao-expirada` → `/login?expirado=1&de=…` com "Sua sessão expirou…" |
| erro cru do provedor em inglês | `src/lib/auth/mensagens.ts` traduz por tipo de falha e não revela se a conta existe |
| auth fora do ar desloga | refresh 502 agora **não** limpa a sessão: avisa e deixa tentar de novo |
| (não tem) tela de conta | ficamos com o menu + `/configuracoes` (marca), sem inventar perfil |

O que **não** copiamos, de propósito: access token em `localStorage` (o nosso fica em
memória e só o refresh vai para o storage) e logout global silencioso (o GoTrue do
AutoClinic não expõe `scope=global` no nosso BFF e não vamos abrir isso sem pedido).
