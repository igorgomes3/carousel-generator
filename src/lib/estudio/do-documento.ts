/**
 * Documento do motor antigo → slides do estúdio.
 *
 * A conversão morava dentro de `/api/gerar`. O autopilot gera pelo mesmo
 * pipeline, então a regra virou função: se cada caminho tivesse a sua cópia, um
 * dia a capa de um deles teria tipo diferente do outro e o card sairia errado.
 */
import { ajustarQuantidade } from "@/lib/estudio/cards";
import { corpoSeFechar } from "@/lib/estudio/frase";
import type { SlideCarrossel } from "@/lib/estudio/tipos";

interface Elemento {
  type?: string;
  text?: string | null;
}

interface SlideDoMotor {
  elements?: Elemento[];
}

export function lerSlide(slide: SlideDoMotor): { titulo: string; corpo: string } {
  const elementos = slide.elements ?? [];
  const porTipo = (tipo: string) =>
    elementos
      .filter((e) => e.type === tipo)
      .map((e) => (e.text ?? "").trim())
      .filter(Boolean);

  const titulo = porTipo("Title")[0] ?? porTipo("Subtitle")[0] ?? "";
  const corpo =
    porTipo("Description").join(" ") ||
    porTipo("Subtitle")
      .filter((t) => t !== titulo)
      .join(" ");
  return { titulo, corpo };
}

/**
 * Mapeia e normaliza: capa no primeiro, CTA no último, o resto conteúdo.
 *
 * Corpo de capa que não fecha frase é descartado — na capa ele é opcional, e
 * peça publicada com frase pela metade é pior que capa só com manchete.
 */
export function slidesDoDocumento(slides: SlideDoMotor[], quantidade: number): SlideCarrossel[] {
  const brutos: SlideCarrossel[] = slides.map((slide, i) => {
    const { titulo, corpo } = lerSlide(slide);
    const tipo: SlideCarrossel["tipo"] =
      i === 0 ? "capa" : i === slides.length - 1 ? "cta" : "conteudo";
    return {
      tipo,
      titulo,
      corpo: tipo === "capa" ? corpoSeFechar(corpo) : corpo,
      imagem: null,
    };
  });

  return ajustarQuantidade(brutos, quantidade);
}
