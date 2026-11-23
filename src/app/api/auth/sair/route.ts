/**
 * `POST /api/auth/sair` — mata a sessão no servidor, não só no navegador.
 *
 * Por que existe: o access token vive num cookie httpOnly (`cr_sessao`), então
 * JS da página **não consegue** apagá-lo. Antes, `sair()` limpava o marcador e o
 * refresh do localStorage e o cookie de token continuava válido por até 1h — num
 * computador emprestado, a aba fechada não era garantia de nada.
 *
 * Aqui os dois cookies são expirados (Max-Age 0). O refresh token em
 * localStorage continua sendo apagado pelo cliente; este hop é o que fecha a
 * porta por onde um `<img>` ou um `fetch` sem header ainda entraria.
 */
import { NextResponse } from "next/server";

import { COOKIE_MARCADOR, COOKIE_TOKEN } from "@/lib/auth/supabase-servidor";

export const dynamic = "force-dynamic";

export async function POST() {
  const resposta = NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  for (const nome of [COOKIE_TOKEN, COOKIE_MARCADOR]) {
    resposta.cookies.set(nome, "", {
      httpOnly: nome === COOKIE_TOKEN,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      secure: false,
    });
  }
  return resposta;
}
