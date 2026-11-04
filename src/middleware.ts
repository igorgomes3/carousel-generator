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
const LIVRES = [/^\/login/, /^\/p\//, /^\/_next\//, /^\/favicon/, /^\/api\/auth\//, /^\/api\/ac\//, /^\/api\/proxy/];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (LIVRES.some((r) => r.test(pathname))) return NextResponse.next();

  const temCookie = request.cookies.get("ac_sessao")?.value === "1";
  if (temCookie) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname === "/" ? "" : `?de=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Não roda em arquivos estáticos nem em imagens: middleware em asset é custo
  // sem função.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js)$).*)"],
};
