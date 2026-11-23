/**
 * `GET /api/auth/eu` — quem é o dono desta sessão.
 *
 * Substitui `/api/ac/me`, que perguntava à API antiga. Agora a resposta sai do
 * GoTrue do projeto novo: o route handler valida o token e devolve o mínimo que
 * a interface precisa (e-mail, nome, id). Papel/organização não existem mais
 * aqui — o carrossel não tem hierarquia, tem dono de projeto.
 */
import { NextRequest, NextResponse } from "next/server";

import { sessaoDoPedido } from "@/lib/auth/supabase-servidor";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sessao = await sessaoDoPedido(request).catch(() => null);
  if (!sessao) {
    return NextResponse.json({ erro: "Sessão ausente ou expirada." }, { status: 401 });
  }

  return NextResponse.json(
    {
      usuario: {
        id: sessao.usuario.id,
        email: sessao.usuario.email,
        nome: sessao.usuario.nome,
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
