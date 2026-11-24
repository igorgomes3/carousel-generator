#!/usr/bin/env bash
# Job diário do autopilot — disparado pelo timer do sistema.
#
# Uma geração por chamada (ver comentário da rota): o loop aqui insiste até o
# endpoint dizer que não sobrou ninguém, sem nunca rodar dois pipelines ao mesmo
# tempo. O host tem 3,7 GB e divide RAM com Traefik/n8n/Supabase de outros
# produtos — paralelismo aqui derruba o host, não acelera nada.
#
# Códigos de saída: 0 = rodou (com ou sem perfis elegíveis), 1 = nada rodou por
# erro de configuração (segredo ausente), 2 = endpoint respondeu erro.
set -uo pipefail

BASE="${CAROUSEL_URL:-http://127.0.0.1:8099}"
ENV_FILE="${CAROUSEL_ENV:-/root/projects/carousel-generator-eval/.env.local}"
LOG_TAG="autopilot-tick"

log() { echo "$(date -Is) [$LOG_TAG] $*"; }

if [ ! -f "$ENV_FILE" ]; then
  log "env não encontrado: $ENV_FILE"
  exit 1
fi

SECRET="$(grep -E '^AUTOPILOT_CRON_SECRET=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"')"
if [ -z "${SECRET:-}" ]; then
  log "AUTOPILOT_CRON_SECRET ausente no env"
  exit 1
fi

total=0
for i in $(seq 1 15); do
  resposta="$(curl -sS -m 300 -X POST "$BASE/api/interno/autopilot/tick" \
    -H "x-cron-secret: $SECRET" -H 'content-type: application/json' 2>&1)"

  log "iteracao=$i resposta=$resposta"

  restam="$(printf '%s' "$resposta" | python3 -c '
import json,sys
try:
    d=json.load(sys.stdin)
except Exception:
    print("erro"); raise SystemExit
if d.get("erro"):
    print("erro"); raise SystemExit
print(int(d.get("restantes", 0)))
' 2>/dev/null || echo erro)"

  case "$restam" in
    erro) exit 2 ;;
    0) break ;;
    *) total=$((total + 1)) ;;
  esac
done

log "fim total_iteracoes=$total"
exit 0
