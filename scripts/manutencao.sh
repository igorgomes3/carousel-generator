#!/usr/bin/env bash
# Liga/desliga o modo manutenção do CONTENTX.
#
# O valor é lido pelo middleware em tempo de BUILD (runtime edge), então alternar
# exige rebuild + restart — é o preço de não consultar o banco em cada request.
#
# Uso:
#   scripts/manutencao.sh on      # fecha o host e manda para /manutencao
#   scripts/manutencao.sh off     # reabre
#   scripts/manutencao.sh status  # mostra o estado e testa as URLs
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${CAROUSEL_ENV:-$RAIZ/.env.local}"
HOST_ALVO="${MANUTENCAO_HOSTS:-app.contentx.com.br}"
SERVICO="${SERVICO:-carousel-generator}"

log() { echo "$(date -Is) [manutencao] $*"; }

definir() {
  local valor="$1"
  if grep -q '^MANUTENCAO_ATIVA=' "$ENV_FILE"; then
    sed -i "s/^MANUTENCAO_ATIVA=.*/MANUTENCAO_ATIVA=$valor/" "$ENV_FILE"
  else
    printf '\n# Modo manutenção (1 = fechado). Alternar exige rebuild: scripts/manutencao.sh on|off\nMANUTENCAO_ATIVA=%s\nMANUTENCAO_HOSTS=%s\n' "$valor" "$HOST_ALVO" >> "$ENV_FILE"
  fi
  grep -q '^MANUTENCAO_HOSTS=' "$ENV_FILE" || echo "MANUTENCAO_HOSTS=$HOST_ALVO" >> "$ENV_FILE"
}

verificar() {
  log "checando https://$HOST_ALVO/login e /manutencao"
  curl -s -o /dev/null -w "  /login → %{http_code} %{redirect_url}\n" -m 20 "https://$HOST_ALVO/login"
  curl -s -o /dev/null -w "  /manutencao → %{http_code}\n" -m 20 "https://$HOST_ALVO/manutencao"
}

case "${1:-status}" in
  on|off)
    valor=$([ "$1" = "on" ] && echo 1 || echo 0)
    definir "$valor"
    log "MANUTENCAO_ATIVA=$valor — rebuild em $RAIZ"
    cd "$RAIZ" || exit 1
    node_modules/.bin/next build >/tmp/manutencao-build.log 2>&1 || { log "BUILD FALHOU — serviço segue com a versão anterior"; tail -20 /tmp/manutencao-build.log; exit 1; }
    systemctl restart "$SERVICO" && sleep 3
    systemctl is-active "$SERVICO" >/dev/null || { log "serviço não subiu"; exit 1; }
    log "no ar: BUILD_ID=$(cat .next/BUILD_ID)"
    verificar
    ;;
  status)
    estado=$(grep -E '^MANUTENCAO_ATIVA=' "$ENV_FILE" | cut -d= -f2)
    log "MANUTENCAO_ATIVA=${estado:-<não definido>} (build no ar: $(cat "$RAIZ/.next/BUILD_ID" 2>/dev/null))"
    verificar
    ;;
  *)
    echo "uso: $0 on|off|status" >&2
    exit 2
    ;;
esac
