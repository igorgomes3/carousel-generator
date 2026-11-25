# Domínio do CONTENTX — `app.contentx.com.br`

Conexão feita em 25/11/2026. O domínio raiz **não** foi tocado: `contentx.com.br` continua
no servidor antigo (162.240.81.81) com e-mail (MX) e FTP intactos.

## Cadeia de entrega

```
https://app.contentx.com.br
  DNS: A app.contentx.com.br → 149.56.214.54  (DNS only, sem proxy Cloudflare)
  → Traefik compartilhado (websecure) → router `contentx_edge` (priority 100)
  → socat `contentx_edge` (TCP:8092) → TCP:172.18.0.1:8099
  → systemd `carousel-generator.service` (next start -p 8099)
```

- Zona Cloudflare: `contentx.com.br` (`cb6f08406c21716ebf35627e65f47eb7`), conta do
  Clécio (`98067c48b4cca61ec28877b015b1c311`, e-mail canalothor@gmail.com).
- Certificado: Let's Encrypt via `certresolver letsencryptresolver` do Traefik (HTTP-01).
  Precisa estar **DNS only** — com proxy laranja o desafio HTTP-01 pode falhar.
- O domínio antigo (`carrossel.149-56-214-54.sslip.io`) continua no ar como rollback.

## Recriar/checar

```bash
docker service inspect contentx_edge --format '{{json .Spec.Labels}}'
docker service ls | grep contentx
curl -sI https://app.contentx.com.br/login | head -1
echo | openssl s_client -connect app.contentx.com.br:443 -servername app.contentx.com.br 2>/dev/null | openssl x509 -noout -issuer -dates
```

Se o site "carregar para sempre" com `/login` respondendo no `127.0.0.1:8099`, o problema
é a rota container → host: o socat precisa apontar para `172.18.0.1:8099` e a `INPUT` do
host precisa liberar `docker_gwbridge` na porta 8099 (`/etc/iptables/rules.v4`).

## Configuração do app afetada

- `NEXT_PUBLIC_APP_URL=https://app.contentx.com.br` (exige rebuild — é embutido no bundle).
- Supabase Auth: `site_url` e `uri_allow_list` passaram a incluir `app.contentx.com.br`
  (os endereços antigos ficaram na lista para não quebrar link já enviado).

## Modo manutenção

Fecha a entrada do produto e manda para `/manutencao` (página pública, sem login).

```bash
scripts/manutencao.sh on      # fecha + rebuild + restart
scripts/manutencao.sh off     # reabre
scripts/manutencao.sh status  # mostra o estado e testa as URLs
```

- Escopo por host: `MANUTENCAO_HOSTS` (padrão `app.contentx.com.br`). O domínio
  antigo/rollback continua servindo.
- O que segue no ar durante a manutenção: a própria `/manutencao`, assets,
  `/_next/*` e os links públicos `/p/<token>`.
- APIs respondem **503 JSON** (`codigo: manutencao`) em vez de HTML.
- Ligar/desligar exige **rebuild**: o middleware lê o valor em tempo de build
  (runtime edge). É o preço de não consultar o banco a cada requisição.
