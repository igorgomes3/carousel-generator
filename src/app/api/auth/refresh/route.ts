/**
 * Renovação de sessão do carrossel (server-side, mesmo motivo do login).
 *
 * A diferença entre "sua sessão acabou" e "o auth está fora do ar" só existe
 * neste hop: só ele sabe se o 401 veio do GoTrue (refresh token revogado ou
 * vencido — a pessoa TEM que entrar de novo) ou se a chamada nem chegou (502 —
 * a sessão continua válida, o problema é de infraestrutura).
 *
 * O GoTrue agora é o do projeto Supabase dedicado do carrossel. Além de devolver
 * os tokens no corpo, este handler **rotaciona o cookie `cr_sessao`**: sem isso
 * o cookie continuaria com o access token velho e as imagens dos cards (que
 * autenticam por cookie) quebrariam de hora em hora.
 */
import { NextRequest, NextResponse } from "next/server";

import { COOKIE_TOKEN, chaveAnon } from "@/lib/auth/supabase-servidor";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let corpo: { refresh_token?: string };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido", codigo: "pedido_invalido" }, { status: 400 });
  }

  const refresh = corpo.refresh_token ?? "";
  if (!refresh) {
    return NextResponse.json(
      { erro: "Sessão ausente.", codigo: "sessao_invalida" },
      { status: 401 },
    );
  }

  const url = process.env.CARROSSEL_SUPABASE_URL?.trim().replace(/\/$/, "");
  if (!url) {
    return NextResponse.json(
      { erro: "O serviço de login está mal configurado.", codigo: "auth_indisponivel" },
      { status: 502 },
    );
  }

  const res = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: chaveAnon() },
    body: JSON.stringify({ refresh_token: refresh }),
    cache: "no-store",
  }).catch(() => null);

  // Nem chegou: o refresh token pode estar perfeito. Não é motivo para deslogar.
  if (!res) {
    return NextResponse.json(
      { erro: "O serviço de login não respondeu.", codigo: "auth_indisponivel" },
      { status: 502 },
    );
  }

  if (res.status === 400 || res.status === 401) {
    return NextResponse.json(
      { erro: "Sua sessão expirou.", codigo: "sessao_invalida" },
      { status: 401 },
    );
  }

  if (!res.ok) {
    // 5xx do auth: mesma regra do "nem chegou" — não derruba a sessão.
    return NextResponse.json(
      { erro: "O serviço de login está indisponível.", codigo: "auth_indisponivel" },
      { status: 502 },
    );
  }

  const dados = await res.json().catch(() => ({}));
  if (!dados?.access_token) {
    return NextResponse.json(
      { erro: "O serviço de login respondeu sem sessão.", codigo: "auth_indisponivel" },
      { status: 502 },
    );
  }

  const resposta = NextResponse.json({
    access_token: dados.access_token,
    refresh_token: dados.refresh_token ?? refresh,
    expira_em: dados.expires_in ?? 3600,
  });

  resposta.cookies.set(COOKIE_TOKEN, String(dados.access_token), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: Number(dados.expires_in ?? 3600),
    secure: false,
  });

  return resposta;
}
