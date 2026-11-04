/**
 * Geração de carrossel a partir de um briefing da fila de conteúdo.
 *
 * Rota interna: quem chama é a API do AutoClinic, no mesmo host, com o segredo
 * `CONTEUDO_INTERNO_TOKEN`. Não é rota de navegador, e por isso não usa sessão:
 * aceitar sessão aqui abriria a geração para qualquer pessoa logada consumir
 * crédito de IA sem passar pela fila.
 *
 * Devolve o documento no formato que o editor salva (`{config, slides}`), para o
 * resultado poder ser aberto, editado e publicado como qualquer outro carrossel.
 */
import { NextRequest, NextResponse } from "next/server";
import { defaultValues } from "@/lib/default-document";
import { planejarConteudo, promptDeCopy } from "@/lib/conteudo";
import { generateCarouselSlides } from "@/lib/langchain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface Briefing {
  angulo?: string;
  publico?: string;
  dor?: string;
  promessa?: string;
  cta?: string;
  tom?: string;
  gancho?: string;
}

/** Briefing vira tema em texto: é o que o pipeline sabe ler hoje. */
function temaDoBriefing(b: Briefing): string {
  const partes = [
    b.angulo ? `Ângulo: ${b.angulo}` : null,
    b.publico ? `Público: ${b.publico}` : null,
    b.dor ? `Dor: ${b.dor}` : null,
    b.promessa ? `Promessa: ${b.promessa}` : null,
    b.cta ? `CTA: ${b.cta}` : null,
    b.gancho ? `Gancho do primeiro slide: ${b.gancho}` : null,
  ].filter(Boolean);
  return partes.join(". ");
}

export async function POST(request: NextRequest) {
  const segredo = process.env.CONTEUDO_INTERNO_TOKEN ?? "";
  const recebido = request.headers.get("x-interno-token") ?? "";
  if (!segredo || recebido !== segredo) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const corpo = (await request.json().catch(() => null)) as
    | { briefing?: Briefing; titulo?: string }
    | null;
  const briefing = corpo?.briefing;
  if (!briefing || !briefing.angulo) {
    return NextResponse.json({ erro: "Briefing ausente ou sem ângulo" }, { status: 400 });
  }

  const chave = process.env.OPENAI_API_KEY;
  if (!chave) {
    return NextResponse.json(
      { erro: "OPENAI_API_KEY não configurada neste serviço" },
      { status: 500 },
    );
  }

  const tema = temaDoBriefing(briefing);
  const slides = Math.min(Math.max(6, 6), 10);

  // Cada etapa do pipeline devolve null quando o modelo hesita (JSON fora do
  // schema, resposta vazia). Uma tentativa só transforma hesitação em pauta
  // perdida; duas tentativas resolvem quase todo caso e não custam caro.
  const tentar = async <T,>(fn: () => Promise<T | null>): Promise<T | null> => {
    for (let i = 0; i < 2; i++) {
      const r = await fn();
      if (r) return r;
      if (i === 0) await new Promise((ok) => setTimeout(ok, 1500));
    }
    return null;
  };

  const estrategia = await tentar(() => planejarConteudo({ tema, slides }));
  if (!estrategia) {
    return NextResponse.json(
      { erro: "O planejamento do conteúdo falhou duas vezes (modelo não respondeu)" },
      { status: 502 },
    );
  }

  const copy = await tentar(() =>
    generateCarouselSlides(tema, chave, promptDeCopy({ tema, slides }, estrategia)),
  );
  if (!copy) {
    return NextResponse.json(
      { erro: "A copy falhou depois do planejamento" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    documento: { ...defaultValues, slides: copy },
    estrategia,
  });
}
