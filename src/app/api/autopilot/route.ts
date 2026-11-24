/**
 * `GET|POST /api/autopilot` — a entrevista de 4 perguntas e o liga/desliga.
 *
 * A entrevista é a fonte de identidade do perfil (decisão de 24/11/2026 com o
 * critic): scraping de Instagram em IP de datacenter toma bloqueio na hora, e a
 * bio não diz objetivo de negócio. Quatro respostas francas valem mais que o
 * feed inteiro.
 *
 * `liberado` NÃO é gravável por aqui: quem libera autopilot é o administrador
 * (a coluna está fora do grant de UPDATE — ver migration). O POST devolve o
 * estado real, e a tela explica o que falta em vez de fingir que ligou.
 */
import { NextRequest, NextResponse } from "next/server";

import { exigirSessao } from "@/lib/auth/supabase-servidor";
import { ehAdmin } from "@/lib/auth/admin";
import {
  briefingCompleto,
  gravarPerfilDoUsuario,
  lerPerfilDoUsuario,
  normalizarBriefing,
  type Briefing,
} from "@/lib/autopilot/perfil";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const portao = await exigirSessao(request);
  if (!portao.ok) return portao.resposta;

  const perfil = await lerPerfilDoUsuario(portao.sessao);
  return NextResponse.json(
    {
      perfil,
      pronto: Boolean(perfil && briefingCompleto(perfil.briefing)),
      // Quem pode liberar é o administrador; a tela usa isto para não prometer
      // um botão que a API vai recusar.
      podeLiberar: ehAdmin(portao.sessao.usuario.email),
    },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const portao = await exigirSessao(request);
  if (!portao.ok) return portao.resposta;

  const corpo = (await request.json().catch(() => null)) as
    | { briefing?: Partial<Briefing>; ativo?: boolean }
    | null;
  if (!corpo) return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });

  const briefing = corpo.briefing ? normalizarBriefing(corpo.briefing) : undefined;
  if (briefing && !briefingCompleto(briefing)) {
    return NextResponse.json(
      { erro: "Nicho, público e oferta são obrigatórios: sem eles o post do dia vira genérico." },
      { status: 400 },
    );
  }

  const resultado = await gravarPerfilDoUsuario(portao.sessao, {
    briefing,
    ativo: corpo.ativo,
    igHandle: briefing?.instagram ?? undefined,
  });

  if (!resultado.ok) {
    return NextResponse.json({ erro: resultado.erro ?? "Não foi possível salvar." }, { status: 502 });
  }

  return NextResponse.json(
    { perfil: resultado.perfil, pronto: briefingCompleto(resultado.perfil?.briefing ?? normalizarBriefing({})) },
    { headers: { "cache-control": "no-store" } },
  );
}
