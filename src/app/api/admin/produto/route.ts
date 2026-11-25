/**
 * `GET|PUT /api/admin/produto` — interruptores de entrada do produto.
 *
 * Só administrador. `cadastro_aberto` fecha a porta de quem não foi convidado;
 * `exigir_convite` mantém a porta aberta só para quem tem código. Os dois são
 * checados em `/api/auth/cadastro`, não apenas na tela.
 */
import { NextRequest, NextResponse } from "next/server";

import { ehAdmin } from "@/lib/auth/admin";
import { exigirSessao } from "@/lib/auth/supabase-servidor";
import { lerConfigProduto, salvarConfigProduto } from "@/lib/produto/config";
import { listarConvites } from "@/lib/produto/convites";

export const dynamic = "force-dynamic";

async function exigirAdmin(request: NextRequest) {
  const portao = await exigirSessao(request);
  if (!portao.ok) return { ok: false as const, resposta: portao.resposta };
  if (!ehAdmin(portao.sessao.usuario.email)) {
    return {
      ok: false as const,
      resposta: NextResponse.json({ erro: "Apenas o administrador acessa esta área." }, { status: 403 }),
    };
  }
  return { ok: true as const, sessao: portao.sessao };
}

export async function GET(request: NextRequest) {
  const portao = await exigirAdmin(request);
  if (!portao.ok) return portao.resposta;

  const [config, convites] = await Promise.all([lerConfigProduto(), listarConvites()]);
  return NextResponse.json(
    { config, convites },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function PUT(request: NextRequest) {
  const portao = await exigirAdmin(request);
  if (!portao.ok) return portao.resposta;

  const corpo = (await request.json().catch(() => null)) as
    | { cadastroAberto?: unknown; exigirConvite?: unknown }
    | null;
  if (!corpo) return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });

  const resultado = await salvarConfigProduto(
    {
      cadastroAberto: typeof corpo.cadastroAberto === "boolean" ? corpo.cadastroAberto : undefined,
      exigirConvite: typeof corpo.exigirConvite === "boolean" ? corpo.exigirConvite : undefined,
    },
    portao.sessao.usuario.email,
  );

  if (!resultado.ok) {
    return NextResponse.json(
      { erro: `Não foi possível salvar: ${resultado.erro}` },
      { status: 502 },
    );
  }

  const config = await lerConfigProduto();
  return NextResponse.json({ ok: true, config }, { headers: { "cache-control": "no-store" } });
}
