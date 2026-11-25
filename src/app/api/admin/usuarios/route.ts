/**
 * `POST /api/admin/usuarios` — o administrador cria a conta direto.
 *
 * Alternativa ao convite quando o admin já tem os dados da pessoa: cria no
 * GoTrue com `email_confirm: true` (sem depender de SMTP, que no plano free é
 * limitado a 2 mensagens/hora) e devolve o id. A senha não volta na resposta.
 *
 * Por que via admin API e não `/auth/v1/signup`: signup passaria pelo cadastro
 * público, que pode estar fechado — e fechar o cadastro não pode fechar a porta
 * do administrador.
 */
import { NextRequest, NextResponse } from "next/server";

import { ehAdmin } from "@/lib/auth/admin";
import { exigirSessao, urlSupabase } from "@/lib/auth/supabase-servidor";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const portao = await exigirSessao(request);
  if (!portao.ok) return portao.resposta;
  if (!ehAdmin(portao.sessao.usuario.email)) {
    return NextResponse.json({ erro: "Apenas o administrador acessa esta área." }, { status: 403 });
  }

  const corpo = (await request.json().catch(() => null)) as
    | { email?: string; senha?: string; nome?: string }
    | null;

  const email = (corpo?.email ?? "").trim().toLowerCase();
  const senha = corpo?.senha ?? "";
  const nome = (corpo?.nome ?? "").trim().slice(0, 80);

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ erro: "Confira o e-mail digitado." }, { status: 400 });
  }
  if (senha.length < 8) {
    return NextResponse.json(
      { erro: "Use uma senha de pelo menos 8 caracteres." },
      { status: 400 },
    );
  }

  const chave = process.env.CARROSSEL_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!chave) {
    return NextResponse.json({ erro: "Serviço sem chave de administração." }, { status: 503 });
  }

  let res: Response;
  try {
    res = await fetch(`${urlSupabase()}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: chave,
        authorization: `Bearer ${chave}`,
      },
      body: JSON.stringify({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: nome ? { nome } : {},
      }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ erro: "O serviço de contas não respondeu." }, { status: 502 });
  }

  const dados = (await res.json().catch(() => ({}))) as {
    id?: string;
    email?: string;
    msg?: string;
    message?: string;
  };

  if (!res.ok) {
    const texto = `${dados.msg ?? ""} ${dados.message ?? ""}`.toLowerCase();
    if (/already|exists|registered/.test(texto)) {
      return NextResponse.json(
        { erro: "Já existe uma conta com este e-mail." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { erro: dados.msg ?? dados.message ?? "Não foi possível criar a conta." },
      { status: res.status === 422 ? 400 : 502 },
    );
  }

  return NextResponse.json(
    { usuario: { id: dados.id, email: dados.email ?? email } },
    { status: 201 },
  );
}
