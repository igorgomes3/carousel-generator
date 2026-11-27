/**
 * `POST /api/auth/recuperar` — manda o link de redefinição de senha por e-mail.
 *
 * Fala com o GoTrue do carrossel (`/auth/v1/recover`), o mesmo endpoint que o
 * `supabase.auth.resetPasswordForEmail` usa. O link leva ao nosso
 * `/redefinir-senha`, que é liberado no middleware e lê o token do hash.
 *
 * Duas verdades que o produto precisa dizer em vez de esconder:
 *
 * - **Não existe e-mail instantâneo.** Sem SMTP próprio no projeto, o envio sai
 *   pelo serviço do Supabase, limitado a **2 mensagens por hora** por padrão. A
 *   resposta inclui esse limite para a tela poder avisar antes de a pessoa
 *   tentar três vezes e travar.
 * - **Não confirmamos se o e-mail existe.** A resposta é a mesma para conta e
 *   para e-mail desconhecido — senão a tela vira um oráculo de "quem tem conta
 *   aqui". Só 429 (limite) e 5xx mudam a frase, porque aí a pessoa tem o que
 *   fazer.
 */
import { NextRequest, NextResponse } from "next/server";

import { chaveAnon, urlSupabase } from "@/lib/auth/supabase-servidor";

export const dynamic = "force-dynamic";

/**
 * Endereço base para o link do e-mail.
 *
 * Ordem: `NEXT_PUBLIC_APP_URL` (fonte única do domínio do produto) primeiro; só
 * caímos no host do pedido quando ele não existe. Antes a ordem era o contrário e
 * o `x-forwarded-proto` ausente virava `http://…` — o `redirect_to` saía fora da
 * lista permitida do GoTrue, o link caía no `site_url` (raiz) e a pessoa aterrissava
 * no login em vez de `/redefinir-senha` (bug relatado em 27/11/2026).
 *
 * `https` é forçado fora de localhost: o produto é servido por TLS e um link
 * `http://` nunca está na allowlist.
 */
function origem(request: NextRequest): string {
  const doEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.host;

  const ehLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  const protocolo = ehLocal
    ? (request.headers.get("x-forwarded-proto") ?? "http")
    : "https";
  const doPedido = host ? `${protocolo}://${host}` : "";

  // Se o host do pedido for o mesmo do APP_URL, o APP_URL manda (evita
  // divergência de porta/protocolo em proxy).
  if (doEnv) {
    const alvo = doEnv.replace(/\/$/, "");
    try {
      if (new URL(alvo).host === host) return alvo;
    } catch {
      /* APP_URL inválida: segue com o host do pedido */
    }
    if (!doPedido) return alvo;
  }
  return doPedido || request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  let corpo: { email?: string };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }

  const email = (corpo.email ?? "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ erro: "Informe o e-mail da sua conta." }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${urlSupabase()}/auth/v1/recover`, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: chaveAnon() },
      body: JSON.stringify({ email, redirect_to: `${origem(request)}/redefinir-senha` }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { erro: "Não foi possível falar com o serviço de e-mail. Tente de novo em instantes." },
      { status: 502 },
    );
  }

  // O GoTrue responde 200 mesmo para e-mail inexistente — de propósito. Guardamos
  // o status para o relatório, não para a tela.
  if (res.status === 429) {
    return NextResponse.json(
      {
        erro: "O limite de e-mails por hora foi atingido. Tente de novo mais tarde ou redefina a senha pelo suporte.",
        codigo: "limite_email",
      },
      { status: 429 },
    );
  }

  if (!res.ok) {
    const detalhe = await res.text().catch(() => "");
    console.error(`[auth] /recover respondeu ${res.status}: ${detalhe.slice(0, 200)}`);
    return NextResponse.json(
      { erro: "Não foi possível enviar o e-mail agora. Tente de novo em instantes." },
      { status: 502 },
    );
  }

  return NextResponse.json(
    {
      enviado: true,
      aviso:
        "Se este e-mail tiver conta, o link de redefinição chega em instantes (confira também o spam).",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
