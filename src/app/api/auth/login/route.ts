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

import { mensagemDeFalhaDeLogin } from "@/lib/auth/mensagens";

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
    // Uma frase por tipo de falha, sempre em português (ver
    // `src/lib/auth/mensagens.ts`): credencial errada não pode se distinguir de
    // conta inexistente, e-mail não confirmado precisa dizer o próximo passo, e
    // 5xx do auth não é culpa de quem digitou.
    const falha = mensagemDeFalhaDeLogin(res.status, dados);
    return NextResponse.json({ erro: falha.erro }, { status: falha.status });
  }

  return NextResponse.json({
    access_token: dados.access_token,
    refresh_token: dados.refresh_token,
    expira_em: dados.expires_in ?? 3600,
  });
}
