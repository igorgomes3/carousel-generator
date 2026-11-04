/**
 * Renovação de sessão do carrossel (server-side, mesmo motivo do login).
 */
import { NextRequest, NextResponse } from "next/server";

const AUTH_URL =
  process.env.AUTOCLINIC_AUTH_URL ?? "https://autoclinic.149-56-214-54.sslip.io";

export async function POST(request: NextRequest) {
  let corpo: { refresh_token?: string };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }

  const refresh = corpo.refresh_token ?? "";
  if (!refresh) return NextResponse.json({ erro: "Sessão ausente." }, { status: 401 });

  const res = await fetch(`${AUTH_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
    cache: "no-store",
  }).catch(() => null);

  if (!res) return NextResponse.json({ erro: "Auth indisponível." }, { status: 502 });

  const dados = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json({ erro: "Sessão expirada." }, { status: 401 });

  return NextResponse.json({
    access_token: dados.access_token,
    refresh_token: dados.refresh_token ?? refresh,
    expira_em: dados.expires_in ?? 3600,
  });
}
