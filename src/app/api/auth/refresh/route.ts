/**
 * Renovação de sessão do carrossel (server-side, mesmo motivo do login).
 *
 * A diferença entre "sua sessão acabou" e "o auth está fora do ar" só existe
 * neste hop: só ele sabe se o 401 veio do GoTrue (refresh token revogado ou
 * vencido — a pessoa TEM que entrar de novo) ou se a chamada nem chegou (502 —
 * a sessão continua válida, o problema é de infraestrutura).
 *
 * Por que importa: até a issue #19 as duas situações viravam `false` no cliente,
 * e uma queda de dez segundos do auth deslogava a pessoa no meio de um
 * carrossel. Agora o corpo diz qual é qual:
 *
 *   - `401` + `codigo: "sessao_invalida"` → limpar a sessão e mandar ao login;
 *   - `502` + `codigo: "auth_indisponivel"` → NÃO limpar nada; avisar e deixar a
 *     pessoa tentar de novo.
 */
import { NextRequest, NextResponse } from "next/server";

const AUTH_URL =
  process.env.AUTOCLINIC_AUTH_URL ?? "https://autoclinic.149-56-214-54.sslip.io";

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

  const res = await fetch(`${AUTH_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
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

  return NextResponse.json({
    access_token: dados.access_token,
    refresh_token: dados.refresh_token ?? refresh,
    expira_em: dados.expires_in ?? 3600,
  });
}
