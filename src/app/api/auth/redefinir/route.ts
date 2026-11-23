/**
 * `POST /api/auth/redefinir` — grava a senha nova a partir do link do e-mail.
 *
 * O link do GoTrue chega em `/redefinir-senha#access_token=…&type=recovery`: o
 * token vem no **hash** (nunca vai para o servidor em log de acesso). A página
 * lê o hash no navegador e manda o token aqui; este handler chama
 * `PUT /auth/v1/user` com esse token curto e a senha nova.
 *
 * Por que no servidor e não direto do navegador: a senha sai da nossa origem por
 * um único hop nosso, e o `apikey` do projeto não precisa aparecer no bundle
 * (o `anon` é público, mas não há motivo para servir dois caminhos de escrita).
 */
import { NextRequest, NextResponse } from "next/server";

import { chaveAnon, urlSupabase } from "@/lib/auth/supabase-servidor";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let corpo: { access_token?: string; senha?: string };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }

  const token = (corpo.access_token ?? "").trim();
  const senha = corpo.senha ?? "";
  if (!token) {
    return NextResponse.json(
      { erro: "O link de redefinição não é válido. Peça um novo.", codigo: "token_ausente" },
      { status: 400 },
    );
  }
  if (senha.length < 6) {
    return NextResponse.json({ erro: "A senha precisa ter 6 caracteres ou mais." }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${urlSupabase()}/auth/v1/user`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        apikey: chaveAnon(),
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ password: senha }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { erro: "Não foi possível falar com o serviço de login. Tente de novo em instantes." },
      { status: 502 },
    );
  }

  if (res.status === 401 || res.status === 403) {
    return NextResponse.json(
      { erro: "Este link expirou. Peça um novo em “Esqueceu a senha?”.", codigo: "token_invalido" },
      { status: 401 },
    );
  }

  if (!res.ok) {
    const detalhe = await res.text().catch(() => "");
    console.error(`[auth] PUT /user respondeu ${res.status}: ${detalhe.slice(0, 200)}`);
    return NextResponse.json(
      { erro: "Não foi possível salvar a senha nova agora. Tente de novo." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
