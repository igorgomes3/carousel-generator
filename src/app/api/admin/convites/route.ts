/**
 * `POST /api/admin/convites` — gera um código de uso único.
 *
 * Só administrador. O código é a credencial de entrada enquanto o cadastro está
 * fechado, então ele nasce longo e aleatório (`lib/produto/convites.ts`), com
 * expiração explícita e sem poder ser reutilizado.
 */
import { NextRequest, NextResponse } from "next/server";

import { ehAdmin } from "@/lib/auth/admin";
import { exigirSessao } from "@/lib/auth/supabase-servidor";
import { criarConvite } from "@/lib/produto/convites";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const portao = await exigirSessao(request);
  if (!portao.ok) return portao.resposta;
  if (!ehAdmin(portao.sessao.usuario.email)) {
    return NextResponse.json({ erro: "Apenas o administrador acessa esta área." }, { status: 403 });
  }

  const corpo = (await request.json().catch(() => null)) as
    | { dias?: number; nota?: string }
    | null;

  const resultado = await criarConvite({
    por: portao.sessao.usuario.email,
    dias: Number(corpo?.dias ?? 7),
    nota: corpo?.nota ?? null,
  });

  if (!resultado.ok) {
    return NextResponse.json({ erro: resultado.erro ?? "Não foi possível criar." }, { status: 502 });
  }

  return NextResponse.json({ convite: resultado.convite }, { status: 201 });
}
