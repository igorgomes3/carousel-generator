/**
 * Geração do carrossel do estúdio: tema → texto → cards prontos para baixar.
 *
 * Reusa o pipeline de 6 etapas (`gerarDocumentoCompleto`), que é o ativo real que
 * já tínhamos: ideia → plano → copy → revisão. O que muda é a saída: em vez do
 * documento do editor antigo, devolve os cards do contrato do estúdio
 * (`SlideCarrossel`), que é o que a tela de resultado desenha e exporta.
 *
 * Sem Google News, sem fila de sinais: a entrada é o tema que a pessoa digitou.
 */
import { NextRequest, NextResponse } from "next/server";
import { gerarDocumentoCompleto } from "@/lib/gerar-documento";
import { exigirSessao } from "@/lib/auth/supabase-servidor";
import { promptDeEmergencia, resolverFormato } from "@/lib/conteudo";
import { generateCarouselSlides } from "@/lib/langchain";
import { templatePorId } from "@/lib/templates";
import { ajustarQuantidade, limitarQuantidade } from "@/lib/estudio/cards";
import type { CarrosselGerado, SlideCarrossel } from "@/lib/estudio/tipos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface Elemento {
  type?: string;
  text?: string;
}

/** Extrai título/corpo de um slide do pipeline antigo, sem depender do layout. */
function lerSlide(slide: { elements?: Elemento[] }): { titulo: string; corpo: string } {
  const elementos = slide.elements ?? [];
  const porTipo = (tipo: string) =>
    elementos.filter((e) => e.type === tipo).map((e) => (e.text ?? "").trim()).filter(Boolean);

  const titulo = porTipo("Title")[0] ?? porTipo("Subtitle")[0] ?? "";
  const corpo =
    porTipo("Description").join(" ") || porTipo("Subtitle").filter((t) => t !== titulo).join(" ");
  return { titulo, corpo };
}

export async function POST(request: NextRequest) {
  // Portão de custo (W97): geração de texto só com sessão válida no GoTrue do
  // carrossel. Antes bastava o cookie marcador — forjável, e este é o endpoint
  // que gasta token de LLM.
  const portao = await exigirSessao(request);
  if (!portao.ok) return portao.resposta;

  const corpo = (await request.json().catch(() => null)) as
    | { tema?: string; templateId?: string; slides?: number; nicho?: string; formato?: string }
    | null;

  const tema = (corpo?.tema ?? "").trim();
  if (tema.length < 3) {
    return NextResponse.json({ erro: "Escreva o tema do carrossel." }, { status: 400 });
  }

  const template = templatePorId(corpo?.templateId);
  // 3 a 10 (issue #11). Antes era 5..10 e o padrão 7 vivia aqui solto; agora a
  // regra é a mesma do seletor da tela — um lugar só (`lib/estudio/cards`).
  const quantidade = limitarQuantidade(corpo?.slides);

  const chave = process.env.OPENAI_API_KEY;
  if (!chave) {
    return NextResponse.json(
      { erro: "A geração de texto não está configurada neste serviço." },
      { status: 500 },
    );
  }

  const gerado = await gerarDocumentoCompleto(tema, chave, quantidade, {
    nicho: corpo?.nicho,
    formato: corpo?.formato,
  }).catch(() => null);

  /**
   * Plano B obrigatório: o pipeline de 6 etapas é ótimo quando o modelo coopera,
   * mas o passo 2 (plano) exige um `ideia` por slide que o modelo às vezes não
   * devolve — e aí a geração inteira morre com "abortado: etapa 'plano' falhou".
   * Nesse caso cai para a chamada direta (`generateCarouselSlides`), que é o
   * caminho curto que o próprio repo já usava. Melhor um carrossel bom do que
   * uma tela de erro para o leigo.
   *
   * O plano B agora recebe o prompt de emergência (formato + regras do gancho),
   * e não a instrução genérica: era exatamente aí que o slide 1 saía sem gancho.
   */
  let slidesOriginais: { elements?: Elemento[] }[] | null = gerado
    ? (gerado.documento.slides as { elements?: Elemento[] }[])
    : null;

  if (!slidesOriginais) {
    const emergencia = promptDeEmergencia({
      tema,
      slides: quantidade,
      nicho: corpo?.nicho,
      formato: corpo?.formato,
    });
    const direto = await generateCarouselSlides(tema, chave, emergencia).catch(() => null);
    if (!direto) {
      return NextResponse.json(
        { erro: "A IA não conseguiu escrever o carrossel agora. Tente de novo." },
        { status: 502 },
      );
    }
    slidesOriginais = direto as { elements?: Elemento[] }[];
  }

  const brutos: SlideCarrossel[] = slidesOriginais.map((slide, i) => {
    const { titulo, corpo } = lerSlide(slide);
    const tipo: SlideCarrossel["tipo"] =
      i === 0 ? "capa" : i === slidesOriginais!.length - 1 ? "cta" : "conteudo";
    return { tipo, titulo, corpo, imagem: null };
  });

  // A rota devolve EXATAMENTE o número pedido: o pipeline escreve quantos
  // slides o modelo quiser, e o seletor do passo 2 promete um número.
  const slides = ajustarQuantidade(brutos, quantidade);

  const carrossel: CarrosselGerado = {
    id: crypto.randomUUID(),
    titulo: slides[0]?.titulo || tema,
    templateId: template.id,
    tema,
    slides,
    criadoEm: new Date().toISOString(),
  };

  // O formato vai na resposta para a tela poder dizer qual estrutura foi usada —
  // sem isso o usuário não sabe se a escolha dele foi respeitada.
  const formato =
    gerado?.formato ??
    resolverFormato({ tema, slides: quantidade, nicho: corpo?.nicho, formato: corpo?.formato })?.nome ??
    "";

  return NextResponse.json({ carrossel, formato });
}
