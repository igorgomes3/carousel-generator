"use client";

/**
 * Sessão do carrossel no navegador.
 *
 * Modelo: access token em memória + refresh token em `localStorage`. O
 * **cookie httpOnly `cr_sessao`** (posto pelo `/api/auth/login`) é o que
 * autentica as requisições que não passam por `fetch` do nosso JS — `<img>` dos
 * cards e o download de PNG — e é ele que autoriza as rotas de geração no
 * servidor. O `ac_sessao=1` continua sendo só o marcador que o middleware lê
 * para escolher entre redirect e 401 JSON.
 *
 * Por que access em memória e não em localStorage: XSS lê localStorage. O
 * refresh token fica lá porque ele sozinho não abre a API (precisa do hop do
 * servidor em `/api/auth/refresh`) e porque perder a sessão a cada F5 num
 * produto de trabalho é pior que o risco residual.
 *
 * O auth é o **Supabase do próprio carrossel** (projeto dedicado, W97). O
 * O sistema anterior saiu do caminho: a variável de auth antiga não é mais lida aqui.
 */
const CHAVE_REFRESH = "ac_refresh";
const COOKIE_SESSAO = "ac_sessao";

/** Disparado quando a sessão não existe mais do lado do servidor. */
export const EVENTO_SESSAO_EXPIRADA = "ac:sessao-expirada";
/** Disparado quando o auth não respondeu — a sessão continua válida. */
export const EVENTO_AUTH_INDISPONIVEL = "ac:auth-indisponivel";

function avisar(evento: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(evento));
}

export interface UsuarioCarrossel {
  id: string;
  email: string;
  nome: string;
}

/**
 * Resultado de uma tentativa de renovação.
 *
 * - `ok`: access token novo em mãos.
 * - `sessao-invalida`: o auth recusou o refresh (vencido/revogado). Só aqui a
 *   sessão local deve ser apagada.
 * - `indisponivel`: o auth não respondeu (rede, 5xx, 502 do nosso BFF). A sessão
 *   continua válida; a tela avisa e a pessoa tenta de novo.
 */
export type ResultadoRenovacao = "ok" | "sessao-invalida" | "indisponivel";

let accessToken: string | null = null;
let usuario: UsuarioCarrossel | null = null;
let renovando: Promise<ResultadoRenovacao> | null = null;

function guardarCookie(nome: string, valor: string, dias: number) {
  const expira = new Date(Date.now() + dias * 86_400_000).toUTCString();
  document.cookie = `${nome}=${valor}; path=/; expires=${expira}; samesite=lax`;
}

function apagarCookie(nome: string) {
  document.cookie = `${nome}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax`;
}

export function temSessao(): boolean {
  return Boolean(accessToken || localStorage.getItem(CHAVE_REFRESH));
}

export async function entrar(email: string, senha: string): Promise<void> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, senha }),
  });
  const dados = (await res.json().catch(() => ({}))) as {
    erro?: string;
    access_token?: string;
    refresh_token?: string;
  };
  if (!res.ok || !dados.access_token || !dados.refresh_token) {
    // A frase já vem pronta em português do route handler (`mensagens.ts`); o
    // fallback cobre o caso de o servidor responder algo que não é JSON.
    throw new Error(dados.erro ?? "Não foi possível entrar. Tente de novo em instantes.");
  }
  aplicarSessao(dados.access_token, dados.refresh_token);
  await carregarUsuario();
}

export function aplicarSessao(access: string, refresh: string) {
  accessToken = access;
  localStorage.setItem(CHAVE_REFRESH, refresh);
  guardarCookie(COOKIE_SESSAO, "1", 30);
}

export async function renovar(): Promise<ResultadoRenovacao> {
  if (renovando) return renovando;
  const refresh = localStorage.getItem(CHAVE_REFRESH);
  if (!refresh) return "sessao-invalida";

  renovando = (async (): Promise<ResultadoRenovacao> => {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });

      // 400/401 = o auth recusou o refresh (vencido, revogado, sessão trocada em
      // outro aparelho). Único caso que apaga a sessão local.
      if (res.status === 400 || res.status === 401) return "sessao-invalida";
      // 5xx/502/429 = o hop até o auth está com problema. O refresh token pode
      // estar perfeito: derrubar a sessão aqui é perder o trabalho de alguém por
      // causa de uma queda de dez segundos.
      if (!res.ok) return "indisponivel";

      const dados = (await res.json().catch(() => ({}))) as {
        access_token?: string;
        refresh_token?: string;
      };
      if (!dados.access_token) return "indisponivel";
      aplicarSessao(dados.access_token, dados.refresh_token ?? refresh);
      return "ok";
    } catch {
      // TypeError de fetch = rede fora. Sessão fica.
      return "indisponivel";
    } finally {
      renovando = null;
    }
  })();

  return renovando;
}

/**
 * Sair no navegador. Os cookies `cr_sessao`/`ac_sessao` são httpOnly (ou postos
 * pelo servidor com outro maxAge), então apagá-los daqui é best-effort: o
 * servidor também os expira em `/api/auth/sair` quando existe. O que garante que
 * a sessão morreu é o refresh token sair do localStorage + o cookie de token
 * ser sobrescrito na próxima entrada.
 */
export function sair(): void {
  accessToken = null;
  usuario = null;
  localStorage.removeItem(CHAVE_REFRESH);
  apagarCookie(COOKIE_SESSAO);
  // O cookie `cr_sessao` é httpOnly: JS não apaga. Só o servidor fecha essa
  // porta — sem esta chamada o token continuaria valendo por até 1h.
  void fetch("/api/auth/sair", { method: "POST", keepalive: true }).catch(() => {});
}

export function usuarioAtual(): UsuarioCarrossel | null {
  return usuario;
}

export async function carregarUsuario(): Promise<UsuarioCarrossel | null> {
  const dados = await fetch("/api/auth/eu", {
    headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {},
    cache: "no-store",
  })
    .then(async (res) => (res.ok ? ((await res.json()) as { usuario?: UsuarioCarrossel }) : null))
    .catch(() => null);
  usuario = dados?.usuario ?? null;
  return usuario;
}

/** Garante sessão válida antes de renderizar tela privada. */
export async function garantirSessao(): Promise<boolean> {
  if (usuario) return true;
  const resultado = await renovar();
  if (resultado !== "ok") return false;
  return Boolean(await carregarUsuario());
}

/**
 * Para onde voltar depois do login: só caminho interno.
 *
 * `?de=` vem da URL, então é entrada de terceiro. Sem esta trava, um link
 * `/login?de=//site-falso` mandaria a pessoa recém-autenticada para fora do
 * produto — o truque clássico de phishing com a tela de login de verdade.
 */
export function destinoSeguro(de: string | null | undefined): string {
  if (!de) return "/";
  if (!de.startsWith("/")) return "/";
  if (de.startsWith("//")) return "/";
  return de;
}

/** Avisa as telas que a sessão morreu (usado quando uma rota responde 401). */
export function avisarSessaoExpirada(): void {
  sair();
  avisar(EVENTO_SESSAO_EXPIRADA);
}

export function avisarAuthIndisponivel(): void {
  avisar(EVENTO_AUTH_INDISPONIVEL);
}
