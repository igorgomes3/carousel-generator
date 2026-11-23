# Portas de conta e entrada pública do carrossel (W97, 2ª parte)

Dois assuntos que a decisão de 23/11/2026 puxou junto: o carrossel é SaaS
independente, então ele precisa (1) de portas de conta próprias — cadastro,
esqueci a senha, senha nova — e (2) de uma entrada pública que não dependa de
container de outro produto.

---

## 1. Contas: três portas, nenhuma com administrador no meio

| porta | rota | o que faz |
|---|---|---|
| entrar | `/login` | e-mail + senha (`/api/auth/login` → GoTrue do carrossel) |
| criar conta | `/cadastro` | self-serve (`/api/auth/cadastro` → `/auth/v1/signup`), **entra direto** |
| esqueceu a senha | `/esqueci-senha` | pede o link (`/api/auth/recuperar` → `/auth/v1/recover`) |
| senha nova | `/redefinir-senha` | lê o token do hash e grava (`/api/auth/redefinir` → `PUT /auth/v1/user`) |

Nenhum texto do produto cita outro sistema nosso. Gate:

```bash
grep -ri autoclinic src/    # sem resultado (exit 1)
```

### Config de auth aplicada no projeto novo

Via Management API (`PATCH /v1/projects/sjlcyghpogetolzuoziy/config/auth`):

| campo | valor | por quê |
|---|---|---|
| `mailer_autoconfirm` | `true` | "criar conta e entrar" tem que entrar; confirmação por e-mail com SMTP embutido (2/h) travaria o cadastro |
| `site_url` | `https://carrossel.149-56-214-54.sslip.io` | |
| `uri_allow_list` | a URL pública `/**` + `/redefinir-senha` + `/cadastro` + `/login` + `127.0.0.1:8129/**` + `localhost:3000/**` | **armadilha paga:** sem a URL exata na lista, o GoTrue ignora `redirect_to` e manda o link para o `site_url` — o token caía em `/login?de=/#access_token=…` em vez de `/redefinir-senha#…`. A tela de login tem uma rede de segurança que encaminha o hash `type=recovery` para `/redefinir-senha`, mas a correção real é a allow list |

### E-mail: sem SMTP próprio, e isso está medido

- `smtp_host = None` → o envio sai pelo **serviço de e-mail do próprio Supabase**.
- `rate_limit_email_sent = 2` → **2 mensagens por hora** no projeto (padrão do plano free
  com o mailer embutido). É o número que a tela de "esqueci a senha" cita.
- O que isso significa na prática: recuperação funciona para poucas pessoas por hora. Para
  uso real de SaaS, ou se configura SMTP próprio (Resend/SES/Postmark) no dashboard, ou
  sobe-se de plano. Enquanto isso, a UI diz a verdade ("limite de 2 mensagens por hora") em
  vez de prometer envio ilimitado.

### Prova do ciclo completo (`node scripts/prova-contas-w97.mjs`)

Caixa real (mail.tm) criada na hora, conta criada no projeto novo, e-mail recebido,
senha trocada pelo link:

```
PASS  POST /api/auth/cadastro cria conta e já devolve sessão — HTTP 201
PASS  a conta criada é reconhecida por /api/auth/eu — HTTP 200
PASS  cadastro com e-mail repetido → 409 explicado — HTTP 409
PASS  POST /api/auth/recuperar aceita o pedido — HTTP 200
PASS  o e-mail de redefinição CHEGOU na caixa — assunto: "Reset your password"
PASS  o link do e-mail abre a tela de senha nova — /redefinir-senha#access_token=…
PASS  a tela de redefinição gravou a senha — HTTP 200
PASS  login com a senha NOVA entra — HTTP 200
PASS  login com a senha ANTIGA é recusado — HTTP 401
9/9
```

Screenshots: `screenshots/w97/6-login-{390,1440}.png`, `6-cadastro-*`,
`6-esqueci-senha-*`, `8-redefinir-1440.png`.

### Pendência de decisão (do Igor, não minha)

O título da tela é **"Carrossel"** — genérico. O naming do SaaS (nome, domínio,
logo) é decisão dele; o texto de apoio já é neutro e independente.

---

## 2. Entrada pública: onde o domínio é roteado hoje

Medido nesta máquina, não deduzido:

```
$ docker ps                      → traefik_traefik.1…, ac_edge_carrossel.1…
$ docker inspect ac_edge_carrossel.1… 
cmd  = TCP-LISTEN:8092,fork,reuseaddr TCP:100.87.192.48:8099
net  = network_swarm_public
$ docker service inspect ac_edge_carrossel --format '{{json .Spec.Labels}}'
{"traefik.enable":"true",
 "traefik.http.routers.ac_edge_carrossel.rule":"Host(`carrossel.149-56-214-54.sslip.io`)",
 "traefik.http.routers.ac_edge_carrossel.entrypoints":"websecure",
 "traefik.http.routers.ac_edge_carrossel.priority":"10",
 "traefik.http.routers.ac_edge_carrossel.tls.certresolver":"letsencryptresolver",
 "traefik.http.services.ac_edge_carrossel.loadbalancer.server.port":"8092"}
```

Ou seja: **a porta 80/443 é do Traefik compartilhado** (serviço `traefik_traefik`, provider
swarm, certresolver `letsencryptresolver`, HTTP-01), e o carrossel entrava por um socat
chamado `ac_edge_carrossel` que pertence ao conjunto de serviços `ac_edge` — junto de
`ac_edge_api` e `ac_edge_painel`. Derrubar aquele conjunto tirava o carrossel do ar mesmo
com banco e login próprios.

### Decisão: (b) com escopo honesto — edge próprio, Traefik compartilhado

Criado **`carrossel_edge`** (swarm service nosso, `alpine/socat`, mesma topologia:
`TCP-LISTEN:8092 → 100.87.192.48:8099`), com labels próprios e **`priority=100`**:

```
docker service create --name carrossel_edge --network network_swarm_public \
  --label traefik.enable=true \
  --label traefik.docker.network=network_swarm_public \
  --label 'traefik.http.routers.carrossel_edge.rule=Host(`carrossel.149-56-214-54.sslip.io`)' \
  --label traefik.http.routers.carrossel_edge.entrypoints=websecure \
  --label traefik.http.routers.carrossel_edge.priority=100 \
  --label traefik.http.routers.carrossel_edge.tls.certresolver=letsencryptresolver \
  --label traefik.http.services.carrossel_edge.loadbalancer.server.port=8092 \
  alpine/socat:latest -d -d TCP-LISTEN:8092,fork,reuseaddr TCP:100.87.192.48:8099
```

Por que priority e não "remover o antigo": dois routers com a mesma regra sem prioridade
ficam em ordem indefinida. Com `100` contra `10`, o nosso vence sempre — e o socat antigo
continua no lugar dele, sem eu tocar em recurso de outro produto.

**Por que não Caddy/nginx com TLS próprio:** `:80` e `:443` estão publicados pelo Traefik
compartilhado (`docker-proxy` nas duas portas). Um terminator próprio só subiria em porta
alternativa (`:8443`), e o Let's Encrypt HTTP-01/TLS-ALPN não teria como validar. O Traefik é
infra de hospedagem deste host (serve `crmapi`, `portainer`, `router9` também), não o app do
AutoClinic — então a dependência que restou é de **hospedagem**, e está declarada abaixo.

### Prova de que não depende mais do container do AutoClinic

1. Roteador que atende (access log do Traefik, campo do router):

```
"GET /login HTTP/2.0" 200 … "carrossel_edge@swarm" "http://10.0.1.71:8092"      ← nosso
"GET /api/projetos …"  200 … "ac_edge_carrossel@swarm" "http://10.0.1.14:8092"  ← antigo, antes
```

2. **Derrubando o socat antigo** (`docker service scale ac_edge_carrossel=0`, reversível),
   o carrossel continuou respondendo e o log aponta o nosso router:

```
ac_edge_carrossel 0/0
login:200 raiz:307   login:200 raiz:307   login:200 raiz:307
"GET /login" 200 … "carrossel_edge@swarm" "http://10.0.1.71:8092" 6ms
"GET /login" 200 … "carrossel_edge@swarm" "http://10.0.1.71:8092" 7ms
```

Depois: `docker service scale ac_edge_carrossel=1` → `1/1`, `login final:200`. Nada foi
removido; o serviço antigo ficou como estava (agora ocioso para este domínio).

### Rollback

```bash
docker service rm carrossel_edge     # volta a ser atendido por ac_edge_carrossel (priority 10)
```

### O que continua sendo dependência (declarada, não escondida)

- **Traefik compartilhado** deste host (portas 80/443, ACME, certificado). É hospedagem; se
  ele cair, caem todos os domínios do servidor, não só o carrossel.
- **Overlay `network_swarm_public`** (onde o router encontra o socat).
- **`ac_edge_carrossel` continua existindo** e ocioso. Removê-lo é decisão do Igor (recurso de
  outro conjunto de serviços); o carrossel não precisa mais dele.
- O destino do socat é `100.87.192.48:8099` (systemd `carousel-generator`, neste host). Um
  segundo salto: se o serviço systemd parar, o socat não tem o que servir — isso é o próprio
  app, não outro produto.
