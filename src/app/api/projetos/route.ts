/**
 * `/api/projetos` — listar e criar projeto do estúdio.
 *
 * GET  → `{ projetos: ResumoProjeto[] }` do dono deste navegador.
 * POST → cria um projeto e devolve o objeto inteiro.
 *
 * A lista nunca cria identidade (GET sem cookie devolve lista vazia); o cookie
 * nasce no primeiro salvamento, que é quando ele passa a fazer diferença.
 */
import { NextRequest, NextResponse } from "next/server";

import { criarProjeto, listarProjetos } from "@/lib/estudio/armazenamento";
import { donoAtual, garantirDono } from "@/lib/estudio/dono";

export const dynamic = "force-dynamic";

export async function GET() {
  const dono = donoAtual();
  if (!dono) return NextResponse.json({ projetos: [] });

  try {
    const projetos = await listarProjetos(dono);
    return NextResponse.json({ projetos }, { headers: { "cache-control": "no-store" } });
  } catch (erro) {
    console.error("[projetos] falha ao listar:", erro);
    return NextResponse.json(
      { erro: "Não conseguimos abrir seus projetos agora. Tente de novo em instantes." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "Não recebemos os dados do carrossel." }, { status: 400 });
  }

  const dados = (corpo ?? {}) as {
    nome?: string;
    templateId?: string;
    tema?: string;
    slides?: unknown;
    arroba?: unknown;
    estilo?: unknown;
  };

  const dono = garantirDono();
  try {
    const resultado = await criarProjeto(dono, {
      nome: dados.nome,
      templateId: dados.templateId ?? "minimalist",
      tema: dados.tema,
      slides: dados.slides,
      arroba: dados.arroba,
      estilo: dados.estilo,
    });

    if (!resultado.ok) {
      return NextResponse.json({ erro: resultado.motivo }, { status: 400 });
    }
    return NextResponse.json({ projeto: resultado.projeto }, { status: 201 });
  } catch (erro) {
    console.error("[projetos] falha ao criar:", erro);
    return NextResponse.json(
      { erro: "Não foi possível salvar o projeto. Tente de novo." },
      { status: 500 },
    );
  }
}
