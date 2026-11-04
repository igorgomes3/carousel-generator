/**
 * Login do carrossel — feito no servidor do próprio carrossel.
 *
 * Por que proxy em vez de o navegador chamar o GoTrue direto: assim o carrossel
 * não depende de CORS do GoTrue nem de expor a URL do GoTrue no bundle. O
 * navegador fala só com a própria origem; este route handler fala com o auth.
 *
 * A senha nunca é logada e nunca é guardada: passa e é descartada.
 */
import { NextRequest, NextResponse } from "next/server";

const AUTH_URL =
  process.env.AUTOCLINIC_AUTH_URL ?? "https://autoclinic.149-56-214-54.sslip.io";

export async function POST(request: NextRequest) {
  let corpo: { email?: string; senha?: string };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }

  const email = (corpo.email ?? "").trim().toLowerCase();
  const senha = corpo.senha ?? "";
  if (!email || !senha) {
    return NextResponse.json({ erro: "Informe e-mail e senha." }, { status: 400 });
  }

  const res = await fetch(`${AUTH_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: senha }),
    cache: "no-store",
  }).catch(() => null);

  if (!res) {
    return NextResponse.json(
      { erro: "Não foi possível falar com o serviço de login." },
      { status: 502 },
    );
  }

  const dados = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Mensagem única para credencial errada: dizer "e-mail não existe" entrega
    // a quem tenta adivinhar quais contas são reais.
    const status = res.status === 400 || res.status === 401 ? 401 : res.status;
    return NextResponse.json(
      {
        erro:
          status === 401
            ? "E-mail ou senha incorretos."
            : (dados?.msg ?? dados?.error_description ?? "Falha no login."),
      },
      { status },
    );
  }

  return NextResponse.json({
    access_token: dados.access_token,
    refresh_token: dados.refresh_token,
    expira_em: dados.expires_in ?? 3600,
  });
}
