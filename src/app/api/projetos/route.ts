/**
 * `/api/projetos` — listar e criar projeto do estúdio.
 *
 * GET  → `{ projetos: ResumoProjeto[] }` do usuário logado.
 * POST → cria um projeto e devolve o objeto inteiro.
 *
 * Regra nova (W97, 23/11/2026): sem sessão não há lista nem criação. O dono não
 * é mais um UUID de cookie — é `auth.uid()` do Supabase do carrossel, e quem
 * aplica isso é a RLS da tabela (a rota passa o token do usuário ao PostgREST).
 */
import { NextRequest, NextResponse } from "next/server";

import { criarProjeto, listarProjetos } from "@/lib/estudio/armazenamento";
import { exigirSessao } from "@/lib/auth/supabase-servidor";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const portao = await exigirSessao(request);
  if (!portao.ok) return portao.resposta;

  try {
    const projetos = await listarProjetos(portao.sessao);
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
  const portao = await exigirSessao(request);
  if (!portao.ok) return portao.resposta;

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
    legenda?: unknown;
    hashtags?: unknown;
    melhorHorario?: unknown;
  };

  try {
    const resultado = await criarProjeto(portao.sessao, {
      nome: dados.nome,
      templateId: dados.templateId ?? "minimalist",
      tema: dados.tema,
      slides: dados.slides,
      arroba: dados.arroba,
      estilo: dados.estilo,
      legenda: dados.legenda,
      hashtags: dados.hashtags,
      melhorHorario: dados.melhorHorario,
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
