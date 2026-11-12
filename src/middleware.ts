/**
 * Porta de entrada do carrossel.
 *
 * O middleware só verifica a PRESENÇA do marcador de sessão — cookie não é
 * verificável aqui sem a chave, e forjar o cookie não dá acesso a dado nenhum:
 * a API responde 401 em cada chamada e a tela cai no login. O que este arquivo
 * evita é só o caso feio: abrir o editor vazio para quem não tem sessão.
 */
import { NextRequest, NextResponse } from "next/server";

/** Rotas que não exigem sessão: login, link público e assets do Next. */
const LIVRES = [
  /^\/login/,
  /^\/p\//,
  /^\/_next\//,
  /^\/favicon/,
  /^\/api\/auth\//,
  /^\/api\/ac\//,
  /^\/api\/proxy/,
  // Geração da fila de conteúdo: rota interna, autenticada por segredo próprio
  // (x-interno-token). Se dependesse de sessão, o cron não conseguiria chamar.
  /^\/api\/conteudo\//,
];

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

  const temCookie = request.cookies.get("ac_sessao")?.value === "1";
  if (temCookie) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  // `de` é sempre o caminho de origem, inclusive `/` — o critério 1 da §8.1
  // pede `301`-like (`/login?de=/`) também na raiz, para quem entra por um
  // atalho e é devolvido ao lugar certo depois de entrar. Antes a raiz ia sem
  // `de` e a pessoa caía na tela inicial errada depois do login.
  url.search = `?de=${pathname === "/" ? "/" : encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Não roda em arquivos estáticos nem em imagens: middleware em asset é custo
  // sem função.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js)$).*)"],
};
