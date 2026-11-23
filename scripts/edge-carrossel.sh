#!/usr/bin/env bash
#
# Entrada pública do carrossel — edge próprio (W97).
#
# O domínio `carrossel.149-56-214-54.sslip.io` chega no Traefik compartilhado deste
# host (portas 80/443, ACME HTTP-01) e o Traefik escolhe o router pela regra
# `Host(...)`. Até 23/11/2026 existia só o socat `ac_edge_carrossel`, criado junto
# dos serviços `ac_edge_*` de outro produto — derrubar aquele conjunto tirava o
# carrossel do ar mesmo com banco e login próprios.
#
# Este script mantém o NOSSO edge: mesmo socat, nomes nossos, `priority=100`
# contra `priority=10` do antigo, para o desempate ser do Traefik e não da sorte.
# Idempotente: `docker service update` quando já existe.
#
# Uso:  scripts/edge-carrossel.sh            (cria ou atualiza)
#       scripts/edge-carrossel.sh --status   (só mostra o estado)
#       scripts/edge-carrossel.sh --remove   (rollback: volta a ser servido pelo antigo)
#
set -euo pipefail

SERVICO="carrossel_edge"
DOMINIO="carrossel.149-56-214-54.sslip.io"
REDE="network_swarm_public"
DESTINO="100.87.192.48:8099"
IMAGEM="alpine/socat:latest"
PRIORIDADE="100"

ROTULO=(
  --label traefik.enable=true
  --label "traefik.docker.network=${REDE}"
  --label "traefik.http.routers.${SERVICO}.rule=Host(\`${DOMINIO}\`)"
  --label "traefik.http.routers.${SERVICO}.entrypoints=websecure"
  --label "traefik.http.routers.${SERVICO}.priority=${PRIORIDADE}"
  --label "traefik.http.routers.${SERVICO}.tls.certresolver=letsencryptresolver"
  --label "traefik.http.services.${SERVICO}.loadbalancer.server.port=8092"
)

case "${1:-}" in
  --status)
    docker service ps "$SERVICO" --format '{{.Name}} {{.CurrentState}}' | head -3
    curl -s -o /dev/null -w "dominio: %{http_code}\n" "https://${DOMINIO}/login"
    exit 0
    ;;
  --remove)
    docker service rm "$SERVICO"
    echo "removido: o domínio volta a ser servido pelo router antigo (priority 10)"
    exit 0
    ;;
esac

if docker service inspect "$SERVICO" >/dev/null 2>&1; then
  # `--label-add` sobrescreve as chaves existentes; mantém o serviço, troca a config.
  for l in "${ROTULO[@]}"; do
    [ "$l" = "--label" ] && continue
    docker service update --label-add "$l" "$SERVICO" >/dev/null
  done
  echo "atualizado: ${SERVICO}"
else
  docker service create --name "$SERVICO" --network "$REDE" "${ROTULO[@]}" \
    "$IMAGEM" -d -d "TCP-LISTEN:8092,fork,reuseaddr" "TCP:${DESTINO}"
  echo "criado: ${SERVICO}"
fi

for i in $(seq 1 20); do
  estado=$(docker service ps "$SERVICO" --format '{{.CurrentState}}' | head -1)
  case "$estado" in
    Running*) break ;;
  esac
  sleep 1
done
docker service ps "$SERVICO" --format '{{.Name}} {{.CurrentState}}' | head -2
# Prova: o domínio responde e o access log do Traefik diz QUAL router atendeu.
curl -s -o /dev/null -w "dominio: %{http_code}\n" "https://${DOMINIO}/login"
TRAEFIK=$(docker ps --format '{{.Names}}' | grep -i traefik_traefik | head -1 || true)
if [ -n "${TRAEFIK}" ]; then
  docker exec "$TRAEFIK" sh -c 'tail -n 60 /var/log/traefik/access-log' 2>/dev/null \
    | grep "GET /login" | tail -1 || true
fi
