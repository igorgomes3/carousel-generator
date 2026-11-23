"use client";

/**
 * Sessão do carrossel no navegador.
 *
 * Modelo: access token em memória (nunca em localStorage — XSS lê localStorage),
 * refresh token em localStorage + cookie `ac_sessao` só com um marcador de
 * "tem sessão", que o middleware usa para redirecionar sem poder validar nada.
 * A validação de verdade é sempre do servidor: o middleware só evita renderizar
 * tela vazia para quem não tem sessão nenhuma.
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
  papel: "owner" | "admin" | "operador";
  organization_id: string | null;
  deve_trocar_senha: boolean;
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

function aplicarSessao(access: string, refresh: string) {
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

export function sair(): void {
  accessToken = null;
  usuario = null;
  localStorage.removeItem(CHAVE_REFRESH);
  apagarCookie(COOKIE_SESSAO);
}

export function usuarioAtual(): UsuarioCarrossel | null {
  return usuario;
}

export async function carregarUsuario(): Promise<UsuarioCarrossel | null> {
  const dados = await apiJson<{ usuario: UsuarioCarrossel }>("/me").catch(() => null);
  usuario = dados?.usuario ?? null;
  return usuario;
}

/**
 * Chamada autenticada. Em 401 tenta renovar uma vez e repete — sessão de 1h cai
 * no meio do trabalho e a pessoa não deveria perder o que estava montando.
 */
export async function apiFetch(caminho: string, init: RequestInit = {}): Promise<Response> {
  const montar = (token: string | null) =>
    ({
      ...init,
      headers: {
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...(init.headers ?? {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    }) as RequestInit;

  if (!accessToken) await renovar();

  let res = await fetch(`/api/ac${caminho}`, montar(accessToken));

  if (res.status === 401) {
    const resultado = await renovar();
    if (resultado === "ok") res = await fetch(`/api/ac${caminho}`, montar(accessToken));
    // Auth fora do ar: avisa sem apagar nada. A sessão continua válida e a
    // próxima tentativa pode funcionar.
    else if (resultado === "indisponivel") avisar(EVENTO_AUTH_INDISPONIVEL);
  }

  if (res.status === 401) {
    sair();
    avisar(EVENTO_SESSAO_EXPIRADA);
  }

  return res;
}

export async function apiJson<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(caminho, init);
  const corpo = (await res.json().catch(() => ({}))) as { erro?: string };
  if (!res.ok) throw new Error(corpo.erro ?? `HTTP ${res.status}`);
  return corpo as T;
}

/**
 * Leitura autenticada que **não derruba a sessão** quando a API responde 401.
 *
 * Por que existe: `apiFetch` chama `sair()` em 401 de propósito — numa tela cujo
 * conteúdo É a API, sessão inválida tem que mandar para o login. Mas telas que
 * juntam fontes diferentes (o "Meus projetos" lê nosso store E a API do
 * AutoClinic) não podem deslogar a pessoa só porque a fonte secundária
 * respondeu 401: o efeito colateral medido foi o cookie `ac_sessao` sumir e o
 * POST do próprio store virar 405 (redirect para `/login`). Aqui o 401 volta
 * como resposta, e quem chamou decide o que mostrar.
 */
export async function apiJsonLeitura<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const montar = (token: string | null) =>
    ({
      ...init,
      headers: {
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...(init.headers ?? {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    }) as RequestInit;

  if (!accessToken) await renovar();

  let res = await fetch(`/api/ac${caminho}`, montar(accessToken));
  if (res.status === 401) {
    const resultado = await renovar();
    if (resultado === "ok") res = await fetch(`/api/ac${caminho}`, montar(accessToken));
  }

  const corpo = (await res.json().catch(() => ({}))) as { erro?: string };
  if (!res.ok) throw new Error(corpo.erro ?? `HTTP ${res.status}`);
  return corpo as T;
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
