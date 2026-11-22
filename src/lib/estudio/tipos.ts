/**
 * Modelo do carrossel do estúdio — o mínimo que o leigo precisa ver e baixar.
 *
 * Por que não reusar o documento do editor (`DocumentSchema`): aquele formato é
 * o do motor antigo (slides com elementos soltos, tema, paleta editável). O
 * CarrosseIA trabalha com card + texto + imagem de capa, e é isso que a tela de
 * resultado precisa desenhar. Manter os dois separados evita que o editor denso
 * volte pela porta dos fundos: o estúdio fala só este contrato.
 */

export type TipoSlide = "capa" | "conteudo" | "cta";

export interface SlideCarrossel {
  tipo: TipoSlide;
  titulo: string;
  corpo: string;
  /** `data:image/...;base64,...` da capa/cena gerada por IA. */
  imagem: string | null;
}

export interface CarrosselGerado {
  id: string;
  titulo: string;
  templateId: string;
  tema: string;
  slides: SlideCarrossel[];
  criadoEm: string;
}

export function carrosselVazio(templateId: string): CarrosselGerado {
  return {
    id: crypto.randomUUID(),
    titulo: "",
    templateId,
    tema: "",
    criadoEm: new Date().toISOString(),
    slides: [
      { tipo: "capa", titulo: "", corpo: "", imagem: null },
      { tipo: "conteudo", titulo: "", corpo: "", imagem: null },
      { tipo: "cta", titulo: "Salve este post", corpo: "", imagem: null },
    ],
  };
}
