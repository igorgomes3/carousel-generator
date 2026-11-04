/**
 * Ponte do carrossel para a API do AutoClinic.
 *
 * O navegador chama `/api/ac/<caminho>` no próprio domínio do carrossel; este
 * handler repassa para a API com o token que o cliente mandou. Duas razões:
 *   - não depende de CORS da API nem de expor o host interno no bundle;
 *   - o token não entra em URL nem em log: vai no header Authorization.
 *
 * Repassa status e corpo sem interpretar: a API é a autoridade. Reescrever a
 * resposta aqui criaria dois lugares onde a regra de permissão pode divergir.
 */
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.AUTOCLINIC_API_URL ?? "http://100.87.192.48:8097";

async function repassar(request: NextRequest, caminho: string[]) {
  const destino = `${API_URL}/api/${caminho.join("/")}${request.nextUrl.search}`;

  const cabecalhos: Record<string, string> = {
    "content-type": request.headers.get("content-type") ?? "application/json",
    accept: "application/json",
  };
  const auth = request.headers.get("authorization");
  if (auth) cabecalhos.authorization = auth;

  const corpo =
    request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();

  const res = await fetch(destino, {
    method: request.method,
    headers: cabecalhos,
    body: corpo || undefined,
    cache: "no-store",
  }).catch(() => null);

  if (!res) {
    return NextResponse.json({ erro: "API do AutoClinic indisponível." }, { status: 502 });
  }

  const texto = await res.text();
  return new NextResponse(texto, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  });
}

export async function GET(request: NextRequest, ctx: { params: { caminho: string[] } }) {
  return repassar(request, ctx.params.caminho);
}
export async function POST(request: NextRequest, ctx: { params: { caminho: string[] } }) {
  return repassar(request, ctx.params.caminho);
}
export async function PATCH(request: NextRequest, ctx: { params: { caminho: string[] } }) {
  return repassar(request, ctx.params.caminho);
}
export async function PUT(request: NextRequest, ctx: { params: { caminho: string[] } }) {
  return repassar(request, ctx.params.caminho);
}
export async function DELETE(request: NextRequest, ctx: { params: { caminho: string[] } }) {
  return repassar(request, ctx.params.caminho);
}

export const dynamic = "force-dynamic";
