/**
 * `POST /api/auth/cadastro` — criar conta (self-serve) no Supabase do carrossel.
 *
 * Regra do produto (W97): ninguém depende de administrador para existir. O
 * projeto está com `mailer_autoconfirm = true`, então o GoTrue devolve sessão
 * imediatamente e a pessoa já entra — sem e-mail de confirmação, que com o SMTP
 * embutido levaria minutos e bateria no limite de envio.
 *
 * Quando o autoconfirm estiver desligado (alguém mudou no dashboard), o GoTrue
 * responde `200` com usuário e **sem** `access_token`: nesse caso a resposta diz
 * a verdade ("confirme o e-mail") em vez de fingir um login que não aconteceu.
 */
import { NextRequest, NextResponse } from "next/server";

import { COOKIE_MARCADOR, COOKIE_TOKEN, chaveAnon, urlSupabase } from "@/lib/auth/supabase-servidor";
import { lerConfigProduto } from "@/lib/produto/config";
import { consumirConvite, conviteDisponivel } from "@/lib/produto/convites";

export const dynamic = "force-dynamic";

/**
 * `GET /api/auth/cadastro` — a porta está aberta?
 *
 * Público de propósito: a tela de cadastro precisa saber, ANTES de a pessoa
 * digitar a senha, se o cadastro está fechado ou exige convite. Não devolve nada
 * sensível — só os dois interruptores.
 */
export async function GET() {
  const cfg = await lerConfigProduto();
  return NextResponse.json(
    { cadastroAberto: cfg.cadastroAberto, exigirConvite: cfg.exigirConvite },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  let corpo: { email?: string; senha?: string; codigo?: string };
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
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ erro: "Confira o e-mail: parece que falta algo nele." }, { status: 400 });
  }
  if (senha.length < 6) {
    return NextResponse.json({ erro: "A senha precisa ter 6 caracteres ou mais." }, { status: 400 });
  }

  /**
   * Porta de entrada (25/11/2026): o administrador pode FECHAR o cadastro e/ou
   * exigir convite. Sem esta checagem a tela fecharia e a API continuaria
   * criando conta — o tipo de porta que só existe na UI.
   *
   * `cadastro_aberto = false` sem código é recusa direta; com código válido,
   * vira exceção legítima (é assim que o admin convida alguém com a porta
   * fechada).
   */
  const cfg = await lerConfigProduto();
  const codigo = (corpo.codigo ?? "").trim().toUpperCase();
  const exigeCodigo = cfg.exigirConvite || !cfg.cadastroAberto;

  if (!cfg.cadastroAberto && !codigo) {
    return NextResponse.json(
      {
        erro: "O cadastro está fechado. Peça um convite a quem administra o Carrossel.",
        codigo: "cadastro_fechado",
      },
      { status: 403 },
    );
  }

  if (exigeCodigo) {
    if (!codigo) {
      return NextResponse.json(
        { erro: "Este cadastro exige um código de convite.", codigo: "convite_obrigatorio" },
        { status: 403 },
      );
    }
    const disponivel = await conviteDisponivel(codigo);
    if (!disponivel) {
      return NextResponse.json(
        { erro: "Código de convite inválido, usado ou expirado.", codigo: "convite_invalido" },
        { status: 403 },
      );
    }
  }

  let res: Response;
  try {
    res = await fetch(`${urlSupabase()}/auth/v1/signup`, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: chaveAnon() },
      body: JSON.stringify({ email, password: senha }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { erro: "Não foi possível falar com o serviço de contas. Tente de novo em instantes." },
      { status: 502 },
    );
  }

  const dados = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    user?: { id?: string };
    msg?: string;
    message?: string;
    error_code?: string;
  };

  if (!res.ok) {
    const texto = `${dados.msg ?? ""} ${dados.message ?? ""} ${dados.error_code ?? ""}`.toLowerCase();
    // Conta já existente é o caso comum de quem clica duas vezes ou esqueceu que
    // já tinha entrado. A frase manda para o caminho certo, sem culpar a pessoa.
    if (/already registered|user already exists|email_exists/.test(texto)) {
      return NextResponse.json(
        { erro: "Este e-mail já tem conta. Use “Entrar” ou redefina a senha.", codigo: "conta_existe" },
        { status: 409 },
      );
    }
    if (/rate limit|too many requests|over_email_send/.test(texto)) {
      return NextResponse.json(
        { erro: "Muitas tentativas seguidas. Espere um minuto e tente de novo." },
        { status: 429 },
      );
    }
    if (/weak password|password/.test(texto)) {
      return NextResponse.json(
        { erro: "A senha precisa ter 6 caracteres ou mais." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { erro: "Não foi possível criar a conta agora. Tente de novo em instantes." },
      { status: 502 },
    );
  }

  // Conta criada: consome o convite para ele não servir duas vezes. Vale nos
  // dois caminhos (com sessão imediata ou aguardando confirmação de e-mail).
  if (codigo) {
    const novoId = dados.user?.id;
    if (novoId) await consumirConvite(codigo, novoId);
  }

  if (!dados.access_token || !dados.refresh_token) {
    // Conta criada, sessão não: o projeto está exigindo confirmação por e-mail.
    return NextResponse.json(
      {
        criada: true,
        precisa_confirmar: true,
        aviso:
          "Conta criada. Falta confirmar o e-mail: abra o link que enviamos para a sua caixa de entrada.",
      },
      { status: 201 },
    );
  }

  const resposta = NextResponse.json(
    {
      criada: true,
      access_token: dados.access_token,
      refresh_token: dados.refresh_token,
      expira_em: dados.expires_in ?? 3600,
    },
    { status: 201 },
  );

  resposta.cookies.set(COOKIE_TOKEN, String(dados.access_token), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: Number(dados.expires_in ?? 3600),
    secure: false,
  });
  resposta.cookies.set(COOKIE_MARCADOR, "1", {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 3600,
    secure: false,
  });

  return resposta;
}
