/**
 * Login do carrossel — feito no servidor do próprio carrossel.
 *
 * Fala com o GoTrue do **projeto Supabase dedicado** (`CARROSSEL_SUPABASE_URL`),
 * não mais com o auth de outro produto. Duas razões para continuar proxeando em vez
 * de o navegador chamar o GoTrue direto:
 *   - não depende de CORS do GoTrue nem expõe a URL do auth no bundle;
 *   - o access token pode ir para um cookie httpOnly, que é o que permite
 *     `<img src="/api/projetos/…">` e o download de PNG autenticarem sem header.
 *
 * O cookie `cr_sessao` é o access token. O `ac_sessao=1` continua existindo como
 * marcador que o middleware lê — forjá-lo não dá acesso a nada: cada rota valida
 * o token no GoTrue.
 *
 * A senha nunca é logada e nunca é guardada: passa e é descartada.
 */
import { NextRequest, NextResponse } from "next/server";

import { mensagemDeFalhaDeLogin } from "@/lib/auth/mensagens";
import { COOKIE_MARCADOR, COOKIE_TOKEN, chaveAnon } from "@/lib/auth/supabase-servidor";

export const dynamic = "force-dynamic";

function urlBase(): string {
  const url = process.env.CARROSSEL_SUPABASE_URL?.trim();
  if (!url) throw new Error("CARROSSEL_SUPABASE_URL não configurada.");
  return url.replace(/\/$/, "");
}

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

  let auth = urlBase();
  let chave = chaveAnon();
  const res = await fetch(`${auth}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: chave },
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

  const resposta = NextResponse.json({
    access_token: dados.access_token,
    refresh_token: dados.refresh_token,
    expira_em: dados.expires_in ?? 3600,
  });

  /**
   * `secure: false` é de propósito: o app também é servido em http na tailnet e
   * por IP interno, e um cookie `secure` simplesmente não seria gravado — o
   * sintoma seria "entre e não entre". O que protege o token é `httpOnly` (JS da
   * página não lê) e `sameSite: lax`.
   */
  resposta.cookies.set(COOKIE_TOKEN, String(dados.access_token ?? ""), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: Number(dados.expires_in ?? 3600),
    secure: false,
  });
  // Marcador do middleware: 30 dias porque é ele que evita o redirect para
  // /login; quem decide de verdade é o token acima.
  resposta.cookies.set(COOKIE_MARCADOR, "1", {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 3600,
    secure: false,
  });

  return resposta;
}
