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
  if (request.cookies.get("ac_sessao")?.value !== "1") {
    return NextResponse.json({ erro: "Sessão expirada. Entre de novo." }, { status: 401 });
  }

  const corpo = (await request.json().catch(() => null)) as
    | { tema?: string; templateId?: string; slides?: number }
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

  const gerado = await gerarDocumentoCompleto(tema, chave, quantidade).catch(() => null);

  /**
   * Plano B obrigatório: o pipeline de 6 etapas é ótimo quando o modelo coopera,
   * mas o passo 2 (plano) exige um `ideia` por slide que o modelo às vezes não
   * devolve — e aí a geração inteira morre com "abortado: etapa 'plano' falhou".
   * Nesse caso cai para a chamada direta (`generateCarouselSlides`), que é o
   * caminho curto que o próprio repo já usava. Melhor um carrossel bom do que
   * uma tela de erro para o leigo.
   */
  let slidesOriginais: { elements?: Elemento[] }[] | null = gerado
    ? (gerado.documento.slides as { elements?: Elemento[] }[])
    : null;

  if (!slidesOriginais) {
    const direto = await generateCarouselSlides(tema, chave).catch(() => null);
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

  return NextResponse.json({ carrossel });
}
