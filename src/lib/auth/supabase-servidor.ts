/**
 * O auth do carrossel, do lado do servidor.
 *
 * Antes deste arquivo o carrossel não tinha identidade própria: o login era o
 * GoTrue de outro produto e os dados vinham da API dele (`/api/ac/*` → `:8097`).
 * A decisão do Igor em 23/11/2026 foi cortar
 * os dois: projeto Supabase dedicado (`sjlcyghpogetolzuoziy`) e login
 * **obrigatório** antes de qualquer geração, porque geração de texto e de
 * imagem custa dinheiro e anônimo não paga.
 *
 * Duas portas, e a diferença entre elas importa:
 *
 *   - `usuarioDoPedido` valida o access token no GoTrue do projeto novo. É a
 *     única prova de identidade — cookie de marcador não vale nada aqui.
 *   - `comoServico` fala com o PostgREST com `service_role`, que **ignora RLS**.
 *     Só para o que é público por desenho (`/p/<token>`) e para a migração.
 *     Tudo que é do usuário usa `comoUsuario`: aí quem barra é o banco.
 */
import { NextRequest, NextResponse } from "next/server";

/** Access token da sessão. httpOnly: JS da página não lê. */
export const COOKIE_TOKEN = "cr_sessao";
/**
 * Marcador que o middleware usa só para decidir entre redirect e 401 JSON.
 *
 * Continua sendo `ac_sessao` de propósito: é o nome que os gates de Playwright
 * (`tests/visual/*`) injetam e renomear quebraria a suíte inteira sem ganho.
 * Forjar este cookie não dá acesso a nada — cada rota valida o token.
 */
export const COOKIE_MARCADOR = "ac_sessao";

export interface UsuarioCarrossel {
  id: string;
  email: string;
  nome: string;
}

export interface Sessao {
  usuario: UsuarioCarrossel;
  /** Access token cru: é ele que o PostgREST usa para aplicar RLS. */
  token: string;
}

/**
 * URL base do projeto Supabase do carrossel (GoTrue e PostgREST vivem sob ela).
 *
 * Exportada porque os route handlers de auth precisam montar chamadas ao GoTrue
 * (`/auth/v1/...`) e não devem duplicar leitura de env: um `.env` trocado passa a
 * quebrar em um lugar só.
 */
export function urlSupabase(): string {
  const url = process.env.CARROSSEL_SUPABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "CARROSSEL_SUPABASE_URL não configurada: o carrossel não tem auth nem banco sem ela.",
    );
  }
  return url.replace(/\/$/, "");
}

export function chaveAnon(): string {
  const chave = process.env.CARROSSEL_SUPABASE_ANON_KEY?.trim();
  if (!chave) throw new Error("CARROSSEL_SUPABASE_ANON_KEY não configurada.");
  return chave;
}

function chaveServico(): string {
  const chave = process.env.CARROSSEL_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!chave) throw new Error("CARROSSEL_SUPABASE_SERVICE_ROLE_KEY não configurada.");
  return chave;
}

function nomeDe(email: string, metadados: unknown): string {
  const meta = (metadados ?? {}) as { nome?: string; name?: string };
  return (meta.nome ?? meta.name ?? email.split("@")[0] ?? "").trim();
}

/** Valida um access token no GoTrue do projeto novo. `null` = não vale. */
export async function usuarioDoToken(token: string): Promise<UsuarioCarrossel | null> {
  if (!token) return null;
  const res = await fetch(`${urlSupabase()}/auth/v1/user`, {
    headers: { apikey: chaveAnon(), authorization: `Bearer ${token}` },
    cache: "no-store",
  }).catch(() => null);
  if (!res || !res.ok) return null;

  const dados = (await res.json().catch(() => null)) as
    | { id?: string; email?: string; user_metadata?: unknown }
    | null;
  if (!dados?.id || !dados.email) return null;
  return {
    id: dados.id,
    email: dados.email,
    nome: nomeDe(dados.email, dados.user_metadata),
  };
}

/**
 * Sessão do pedido: header `Authorization` primeiro (chamadas de API), cookie
 * depois (navegação, `<img>`, download de PNG). Sem os dois, o card salvo
 * abriria com as imagens quebradas — `<img>` não manda header.
 */
export async function sessaoDoPedido(request: NextRequest): Promise<Sessao | null> {
  const cabecalho = request.headers.get("authorization") ?? "";
  const doHeader = cabecalho.toLowerCase().startsWith("bearer ")
    ? cabecalho.slice(7).trim()
    : "";
  const doCookie = request.cookies.get(COOKIE_TOKEN)?.value ?? "";

  for (const token of [doHeader, doCookie]) {
    if (!token) continue;
    const usuario = await usuarioDoToken(token);
    if (usuario) return { usuario, token };
  }
  return null;
}

/**
 * Portão das rotas que gastam dinheiro.
 *
 * Devolve a sessão ou a resposta pronta: 401 em JSON para API (o cliente mostra
 * o motivo), 503 quando o auth nem está configurado — que é falha nossa, não
 * sessão inválida, e misturar as duas faria a pessoa tentar senha à toa.
 */
export async function exigirSessao(
  request: NextRequest,
): Promise<{ ok: true; sessao: Sessao } | { ok: false; resposta: NextResponse }> {
  let sessao: Sessao | null = null;
  try {
    sessao = await sessaoDoPedido(request);
  } catch (erro) {
    console.error("[auth] falha ao validar sessão:", erro);
    return {
      ok: false,
      resposta: NextResponse.json(
        { erro: "O login está mal configurado neste serviço. Avise quem opera." },
        { status: 503 },
      ),
    };
  }

  if (!sessao) {
    return {
      ok: false,
      resposta: NextResponse.json(
        {
          erro: "Entre na sua conta para gerar. A geração usa IA e é exclusiva de quem está logado.",
          codigo: "sem_sessao",
        },
        { status: 401 },
      ),
    };
  }
  return { ok: true, sessao };
}

/* ------------------------------------------------------------------ */
/* PostgREST                                                          */
/* ------------------------------------------------------------------ */

function cabecalhosPostgrest(chave: string, token?: string): Record<string, string> {
  return {
    apikey: chave,
    // Com `service_role` o Authorization é a própria chave; com usuário é o JWT
    // dele — é isso que faz `auth.uid()` existir e a RLS valer.
    authorization: `Bearer ${token ?? chave}`,
    "content-type": "application/json",
  };
}

export interface RespostaRest<T> {
  ok: boolean;
  status: number;
  dados: T | null;
  erro: string | null;
}

/** PostgREST com o token do usuário: RLS ligada. */
export async function comoUsuario<T>(
  sessao: Sessao,
  caminho: string,
  init: RequestInit = {},
): Promise<RespostaRest<T>> {
  return restar<T>(caminho, init, cabecalhosPostgrest(chaveAnon(), sessao.token));
}

/** PostgREST com `service_role`: RLS desligada. Só para leitura pública e migração. */
export async function comoServico<T>(
  caminho: string,
  init: RequestInit = {},
): Promise<RespostaRest<T>> {
  return restar<T>(caminho, init, cabecalhosPostgrest(chaveServico()));
}

async function restar<T>(
  caminho: string,
  init: RequestInit,
  cabecalhos: Record<string, string>,
): Promise<RespostaRest<T>> {
  const res = await fetch(`${urlSupabase()}/rest/v1/${caminho.replace(/^\//, "")}`, {
    ...init,
    headers: { ...cabecalhos, ...((init.headers as Record<string, string>) ?? {}) },
    cache: "no-store",
  }).catch(() => null);

  if (!res) {
    return { ok: false, status: 502, dados: null, erro: "Banco de dados não respondeu." };
  }

  const texto = await res.text().catch(() => "");
  let dados: unknown = null;
  if (texto) {
    try {
      dados = JSON.parse(texto);
    } catch {
      dados = null;
    }
  }

  if (!res.ok) {
    const detalhe =
      (dados as { message?: string; hint?: string } | null)?.message ?? texto.slice(0, 200);
    return { ok: false, status: res.status, dados: null, erro: detalhe || `HTTP ${res.status}` };
  }

  return { ok: true, status: res.status, dados: (dados as T) ?? null, erro: null };
}
