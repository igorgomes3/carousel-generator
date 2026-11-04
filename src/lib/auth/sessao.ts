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

export interface UsuarioCarrossel {
  id: string;
  email: string;
  nome: string;
  papel: "owner" | "admin" | "operador";
  organization_id: string | null;
  deve_trocar_senha: boolean;
}

let accessToken: string | null = null;
let usuario: UsuarioCarrossel | null = null;
let renovando: Promise<boolean> | null = null;

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
    throw new Error(dados.erro ?? "Não foi possível entrar.");
  }
  aplicarSessao(dados.access_token, dados.refresh_token);
  await carregarUsuario();
}

function aplicarSessao(access: string, refresh: string) {
  accessToken = access;
  localStorage.setItem(CHAVE_REFRESH, refresh);
  guardarCookie(COOKIE_SESSAO, "1", 30);
}

export async function renovar(): Promise<boolean> {
  if (renovando) return renovando;
  const refresh = localStorage.getItem(CHAVE_REFRESH);
  if (!refresh) return false;

  renovando = (async () => {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (!res.ok) return false;
      const dados = (await res.json()) as { access_token?: string; refresh_token?: string };
      if (!dados.access_token) return false;
      aplicarSessao(dados.access_token, dados.refresh_token ?? refresh);
      return true;
    } catch {
      return false;
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
    const ok = await renovar();
    if (ok) res = await fetch(`/api/ac${caminho}`, montar(accessToken));
  }

  if (res.status === 401) {
    sair();
    if (typeof window !== "undefined") window.dispatchEvent(new Event("ac:sessao-expirada"));
  }

  return res;
}

export async function apiJson<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(caminho, init);
  const corpo = (await res.json().catch(() => ({}))) as { erro?: string };
  if (!res.ok) throw new Error(corpo.erro ?? `HTTP ${res.status}`);
  return corpo as T;
}

/** Garante sessão válida antes de renderizar tela privada. */
export async function garantirSessao(): Promise<boolean> {
  if (usuario) return true;
  const renovou = await renovar();
  if (!renovou) return false;
  return Boolean(await carregarUsuario());
}
