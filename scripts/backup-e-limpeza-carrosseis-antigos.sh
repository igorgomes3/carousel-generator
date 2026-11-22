#!/usr/bin/env bash
#
# Dump e limpeza dos carrosséis do editor antigo (decisão do Igor, 22/11/2026:
# "não precisa manter os carrosséis antigos, pode apagar tudo e começar do zero
# no novo sistema").
#
# Regras que este script obedece:
#   1. SEM DUMP NÃO APAGA — o `--apagar` recusa se o dump não existir ou não
#      passar na verificação de contagem.
#   2. Só DELETE de dados. Nada de DROP TABLE, nada de migration, nada de
#      schema: reversível pelo próprio dump.
#   3. Transação única, filhos antes dos pais (`carrossel_versoes` e
#      `carrossel_artefatos` têm FK para `carrosseis`).
#   4. Mostra contagem antes e depois, e confere dentro da transação — se o
#      depois não for zero, `ROLLBACK`.
#
# Uso:
#   scripts/backup-e-limpeza-carrosseis-antigos.sh            # só o dump
#   scripts/backup-e-limpeza-carrosseis-antigos.sh --apagar   # dump + DELETE
#
set -euo pipefail

TABELAS=(carrossel_artefatos carrossel_versoes carrosseis)   # ordem do DELETE
ORIGEM_ENV="${AUTOCLINIC_ENV_FILE:-/etc/default/autoclinic-api}"

if [[ -z "${AUTOCLINIC_DATABASE_URL:-}" ]]; then
  # shellcheck disable=SC1090  # caminho do env do serviço, existe na VPS
  set -a; source "$ORIGEM_ENV"; set +a
fi
: "${AUTOCLINIC_DATABASE_URL:?AUTOCLINIC_DATABASE_URL não encontrada}"

DATA="$(date +%Y%m%d-%H%M%S)"
DESTINO="${DESTINO:-/root/backups/carrosseis-antigos-$DATA}"
mkdir -p "$DESTINO"

contar() {
  psql "$AUTOCLINIC_DATABASE_URL" -At -F'|' -c "
    select 'carrossel_artefatos', count(*) from carrossel_artefatos
    union all select 'carrossel_versoes', count(*) from carrossel_versoes
    union all select 'carrosseis', count(*) from carrosseis;"
}

echo "== contagem ANTES =="
contar | tee "$DESTINO/antes.txt"

echo
echo "== dump JSON por tabela =="
for tabela in "${TABELAS[@]}"; do
  psql "$AUTOCLINIC_DATABASE_URL" -At -c \
    "select coalesce(json_agg(t), '[]'::json) from (select * from $tabela) t" \
    > "$DESTINO/$tabela.json"
  echo "  $tabela.json  $(wc -c <"$DESTINO/$tabela.json") bytes"
done

# Pautas que apontavam para esses carrosséis (FK é ON DELETE SET NULL):
# guardadas para que o vínculo também seja reversível.
psql "$AUTOCLINIC_DATABASE_URL" -At -c "
  select coalesce(json_agg(t), '[]'::json) from (
    select * from conteudo_fila where carrossel_id in (select id from carrosseis)
  ) t" > "$DESTINO/conteudo_fila_afetada.json"
echo "  conteudo_fila_afetada.json  $(wc -c <"$DESTINO/conteudo_fila_afetada.json") bytes"

echo
echo "== dump SQL (data-only) =="
if pg_dump "$AUTOCLINIC_DATABASE_URL" --data-only --no-owner --no-privileges \
     -t carrossel_artefatos -t carrossel_versoes -t carrosseis \
     > "$DESTINO/dump.sql" 2>"$DESTINO/pg_dump.err"; then
  echo "  dump.sql  $(wc -c <"$DESTINO/dump.sql") bytes"
else
  # pg_dump do host (18.x) contra servidor 14.x pode recusar. O JSON acima já é
  # o dump canônico; o SQL é conveniência. Falha registrada, não silenciosa.
  echo "  AVISO: pg_dump falhou (ver pg_dump.err) — o JSON é o dump canônico"
  rm -f "$DESTINO/dump.sql"
fi

echo
echo "== verificação do dump =="
python3 - "$DESTINO" <<'PY'
import hashlib, json, pathlib, sys

destino = pathlib.Path(sys.argv[1])
esperado = {}
for linha in (destino / "antes.txt").read_text().splitlines():
    tabela, n = linha.split("|")
    esperado[tabela] = int(n)

falhas = []
for tabela, n in esperado.items():
    arquivo = destino / f"{tabela}.json"
    try:
        dados = json.loads(arquivo.read_text())
    except Exception as erro:  # noqa: BLE001
        falhas.append(f"{tabela}: JSON não abre ({erro})")
        continue
    if len(dados) != n:
        falhas.append(f"{tabela}: {len(dados)} linhas no arquivo, {n} no banco")
    print(f"  {tabela}: {len(dados)} linhas no JSON (banco: {n})")

manifesto = destino / "MANIFESTO.txt"
linhas = [
    f"dump: {destino}",
    f"quando: {__import__('datetime').datetime.now().isoformat(timespec='seconds')}",
    f"origem: tabelas carrosseis, carrossel_versoes, carrossel_artefatos",
    "",
]
for arquivo in sorted(destino.iterdir()):
    if arquivo.name == "MANIFESTO.txt":
        continue
    linhas.append(f"{arquivo.name}  {arquivo.stat().st_size}B  sha256={hashlib.sha256(arquivo.read_bytes()).hexdigest()}")
manifesto.write_text("\n".join(linhas) + "\n")

if falhas:
    print("\nFALHAS:", *falhas, sep="\n  ")
    sys.exit(1)
print("\n  OK: dump abre e bate com o banco.")
PY

if [[ "${1:-}" != "--apagar" ]]; then
  echo
  echo "Dump pronto em $DESTINO. Nada foi apagado (rode com --apagar para isso)."
  exit 0
fi

echo
echo "== DELETE em transação (filhos primeiro) =="
psql "$AUTOCLINIC_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
begin;
delete from carrossel_artefatos;
delete from carrossel_versoes;
delete from carrosseis;
do $$
declare
  restantes int;
begin
  select count(*) into restantes from carrossel_artefatos;
  if restantes <> 0 then raise exception 'carrossel_artefatos ainda tem % linhas', restantes; end if;
  select count(*) into restantes from carrossel_versoes;
  if restantes <> 0 then raise exception 'carrossel_versoes ainda tem % linhas', restantes; end if;
  select count(*) into restantes from carrosseis;
  if restantes <> 0 then raise exception 'carrosseis ainda tem % linhas', restantes; end if;
end $$;
commit;
SQL

echo
echo "== contagem DEPOIS =="
contar | tee "$DESTINO/depois.txt"

echo
echo "Dump preservado em $DESTINO (o DELETE é reversível a partir dele)."
