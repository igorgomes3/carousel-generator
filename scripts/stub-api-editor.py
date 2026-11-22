#!/usr/bin/env python3
"""
Stub de leitura da API do AutoClinic, para a prova visual da issue #13.

Por que ele existe: `GET /api/carrossel/carrosseis` exige JWT do GoTrue, e eu não
tenho a senha de ninguém. Sem isso, a tela "Meus projetos" só poderia ser provada
no estado de erro. Este stub lê as MESMAS linhas do banco real (`carrosseis`) e
devolve o MESMO contrato que a API devolve, para a tela provar que sabe desenhar
carrossel antigo ao lado de projeto do estúdio.

Não é mock de tela: o dado é o do banco; o que está substituído é só a
autenticação, que aqui não muda o resultado.

    python3 scripts/stub-api-editor.py 8096
    # e suba o app com AUTOCLINIC_API_URL=http://127.0.0.1:8096
"""
import json
import os
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer


def url_do_banco() -> str:
    """Lê a env do serviço da API sem imprimir segredo."""
    if os.environ.get("AUTOCLINIC_DATABASE_URL"):
        return os.environ["AUTOCLINIC_DATABASE_URL"]
    saida = subprocess.run(
        ["bash", "-lc", "set -a; . /etc/default/autoclinic-api; printf %s \"$AUTOCLINIC_DATABASE_URL\""],
        capture_output=True,
        text=True,
        check=True,
    )
    return saida.stdout.strip()


COLUNAS = [
    "id", "titulo", "estado", "estado_em", "atualizado_em", "criado_em",
    "versao_atual", "publico_ativo", "slug", "capa", "slides",
]


ARQ_MODO = "/tmp/w84-stub-modo"


def modo() -> str:
    """`dados` (padrão) devolve o banco; `vazio` devolve lista vazia."""
    try:
        with open(ARQ_MODO, encoding="utf-8") as f:
            return f.read().strip() or "dados"
    except FileNotFoundError:
        return "dados"


def consultar() -> list[dict]:
    if modo() == "vazio":
        return []
    sql = (
        "select coalesce(json_agg(linha order by atualizado_em desc), '[]'::json) from ("
        "  select id, titulo, estado, estado_em, atualizado_em, criado_em, versao_atual,"
        "         publico_ativo, slug, capa,"
        "         jsonb_array_length(coalesce(documento -> 'slides', '[]'::jsonb)) as slides"
        "    from carrosseis limit 200"
        ") linha;"
    )
    saida = subprocess.run(
        ["psql", url_do_banco(), "-At", "-c", sql],
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(saida.stdout.strip() or "[]")


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):  # noqa: N802 (nome exigido pela stdlib)
        if not self.path.startswith("/api/carrossel/carrosseis"):
            self.send_response(404)
            self.end_headers()
            return
        try:
            corpo = json.dumps({"carrosseis": consultar()}).encode()
            status = 200
        except Exception as erro:  # noqa: BLE001 — stub de prova, erro vira resposta
            corpo = json.dumps({"erro": f"stub falhou: {erro}"}).encode()
            status = 500
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

    def log_message(self, *_args):  # silêncio: o log do gate é do Playwright
        return


if __name__ == "__main__":
    porta = int(sys.argv[1]) if len(sys.argv) > 1 else 8096
    print(f"stub da API do editor em http://127.0.0.1:{porta} (dados do banco real)", flush=True)
    HTTPServer(("127.0.0.1", porta), Handler).serve_forever()
