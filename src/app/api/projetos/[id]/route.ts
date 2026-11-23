/**
 * `/api/projetos/<id>` — abrir, salvar por cima e apagar UM projeto.
 *
 * GET    → projeto inteiro (cards, textos, imagens, template, datas).
 * PATCH  → salva por cima; aceita `nome` (renomear), `slides` (conteúdo),
 *          `tema` e `templateId`. Devolve o projeto já com o novo `salvoEm`.
 * DELETE → apaga o projeto e as imagens dele.
 *
 * Projeto de outro dono responde **404**, não 403: 403 confirmaria que o id
 * existe, e o id não é informação de quem está de fora. Quem garante isso é a
 * RLS da tabela `projetos` — a leitura passa com o token do usuário e volta
 * vazia.
 */
import { NextRequest, NextResponse } from "next/server";

import { apagarProjeto, idValido, lerProjeto, salvarProjeto } from "@/lib/estudio/armazenamento";
import { exigirSessao } from "@/lib/auth/supabase-servidor";

export const dynamic = "force-dynamic";

const NAO_ENCONTRADO = "Este projeto não existe mais. Ele pode ter sido apagado.";

export async function GET(request: NextRequest, ctx: { params: { id: string } }) {
  const portao = await exigirSessao(request);
  if (!portao.ok) return portao.resposta;

  if (!idValido(ctx.params.id)) {
    return NextResponse.json({ erro: NAO_ENCONTRADO }, { status: 404 });
  }

  try {
    const projeto = await lerProjeto(portao.sessao, ctx.params.id);
    if (!projeto) return NextResponse.json({ erro: NAO_ENCONTRADO }, { status: 404 });
    return NextResponse.json({ projeto }, { headers: { "cache-control": "no-store" } });
  } catch (erro) {
    console.error("[projetos] falha ao abrir:", erro);
    return NextResponse.json(
      { erro: "Não conseguimos abrir este projeto agora. Tente de novo." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, ctx: { params: { id: string } }) {
  const portao = await exigirSessao(request);
  if (!portao.ok) return portao.resposta;

  if (!idValido(ctx.params.id)) {
    return NextResponse.json({ erro: NAO_ENCONTRADO }, { status: 404 });
  }

  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "Não recebemos os dados do projeto." }, { status: 400 });
  }

  const dados = (corpo ?? {}) as {
    nome?: unknown;
    templateId?: unknown;
    tema?: unknown;
    slides?: unknown;
    arroba?: unknown;
    estilo?: unknown;
  };

  try {
    const resultado = await salvarProjeto(portao.sessao, ctx.params.id, dados);
    if (!resultado.ok) {
      const status = resultado.motivo === "nao_encontrado" ? 404 : 400;
      return NextResponse.json(
        { erro: resultado.motivo === "nao_encontrado" ? NAO_ENCONTRADO : resultado.motivo },
        { status },
      );
    }
    return NextResponse.json({ projeto: resultado.projeto });
  } catch (erro) {
    console.error("[projetos] falha ao salvar:", erro);
    return NextResponse.json(
      { erro: "Não foi possível salvar as alterações. Tente de novo." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, ctx: { params: { id: string } }) {
  const portao = await exigirSessao(request);
  if (!portao.ok) return portao.resposta;

  if (!idValido(ctx.params.id)) {
    return NextResponse.json({ erro: NAO_ENCONTRADO }, { status: 404 });
  }

  try {
    const apagou = await apagarProjeto(portao.sessao, ctx.params.id);
    if (!apagou) return NextResponse.json({ erro: NAO_ENCONTRADO }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("[projetos] falha ao apagar:", erro);
    return NextResponse.json(
      { erro: "Não foi possível apagar o projeto. Tente de novo." },
      { status: 500 },
    );
  }
}
