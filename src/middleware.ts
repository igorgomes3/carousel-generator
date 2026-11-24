/**
 * Porta de entrada do carrossel.
 *
 * Duas decisões moram aqui:
 *
 * 1. **Nada de geração sem sessão.** A partir da W97 (decisão do Igor em
 *    23/11/2026) o login é obrigatório antes de qualquer geração de conteúdo —
 *    texto e imagem custam dinheiro e anônimo não paga. Navegação sem sessão vai
 *    para `/login?de=<caminho>`; rota de API sem sessão responde **401 JSON**,
 *    porque um `fetch` que recebe redirect de página HTML vira
 *    `Unexpected token '<'` na tela em vez de "entre de novo".
 * 2. **O middleware não é a autorização.** Ele só olha a PRESENÇA do marcador
 *    (`ac_sessao`) ou de um header `Authorization` — validar JWT aqui custaria
 *    um round-trip por asset. Quem autoriza de verdade é cada rota: valida o
 *    token no GoTrue e usa o token do usuário no PostgREST (RLS). Forjar o
 *    marcador não abre nada; só evita o redirect feio.
 */
import { NextRequest, NextResponse } from "next/server";

/** Rotas que não exigem sessão: login, criação de conta, redefinição e assets. */
const LIVRES = [
  // /login, /cadastro, /esqueci-senha, /redefinir-senha (todas as portas de conta).
  /^\/(login|cadastro|esqueci-senha|redefinir-senha)/,
  // Link público: o token é a credencial, e quem abre não tem conta.
  /^\/p\//,
  /^\/_next\//,
  /^\/favicon/,
  // /login, /refresh, /eu (responde 401 sozinho), /sair.
  /^\/api\/auth\//,
  // Proxy de imagem pública da exportação: sem credencial, sem custo.
  /^\/api\/proxy/,
  // Cron interno do autopilot. Não é público: quem chama precisa do segredo
  // `x-cron-secret`, validado na própria rota (aqui só evitaria 401 de sessão).
  /^\/api\/interno\//,
];

/** Rotas de API: 401 JSON em vez de redirect. */
function ehApi(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // `/?projeto=<id>` → `/carrossel/<id>` (§1.4, critério 3).
  //
  // Esta regra mora aqui e não em `next.config.js` porque `redirects` não
  // limpa a query string: a resposta saía `/carrossel/<id>?projeto=<id>`, um
  // endereço que carrega o nome morto para sempre no histórico do navegador.
  // Aqui o `search` é zerado de propósito e o status é 301 explícito — no Next
  // 14, `permanent: true` responde 308, não 301.
  //
  // Antes do teste de sessão: link antigo de quem está deslogado tem de
  // aterrissar na ficha certa depois do login, não em `/login` sem destino.
  if (pathname === "/" && request.nextUrl.searchParams.has("projeto")) {
    const id = request.nextUrl.searchParams.get("projeto") ?? "";
    const destino = request.nextUrl.clone();
    destino.pathname = `/carrossel/${id}`;
    destino.search = "";
    return NextResponse.redirect(destino, 301);
  }

  if (LIVRES.some((r) => r.test(pathname))) return NextResponse.next();

  const temMarcador = request.cookies.get("ac_sessao")?.value === "1";
  const temHeader = (request.headers.get("authorization") ?? "")
    .toLowerCase()
    .startsWith("bearer ");
  if (temMarcador || temHeader) return NextResponse.next();

  if (ehApi(pathname)) {
    return NextResponse.json(
      {
        erro: "Entre na sua conta para gerar. A geração usa IA e é exclusiva de quem está logado.",
        codigo: "sem_sessao",
      },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  // `de` é sempre o caminho de origem, inclusive `/` — o critério 1 da §8.1
  // pede `301`-like (`/login?de=/`) também na raiz, para quem entra por um
  // atalho e é devolvido ao lugar certo depois de entrar.
  url.search = `?de=${pathname === "/" ? "/" : encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Não roda em arquivos estáticos nem em imagens: middleware em asset é custo
  // sem função.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js)$).*)"],
};
