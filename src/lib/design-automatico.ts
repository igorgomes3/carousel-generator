/**
 * Design automático: o carrossel nasce com cara de carrossel, não com o template.
 *
 * O problema que isto resolve: o gerador devolvia texto e o documento saía sempre
 * com a mesma configuração de fábrica (branco, preto, serifa). O usuário tinha
 * que escolher paleta, fonte e fundo em cada carrossel, o que na prática
 * significa que ninguém escolhia e tudo saía igual.
 *
 * A regra aqui é decidir por tom e por direção visual, com poucas opções e
 * sempre uma escolha válida. Sem preferência declarada, cai num padrão que
 * funciona no feed: fundo claro, tipografia serifada de título, sans de corpo.
 */
import { defaultValues } from "@/lib/default-document";
import type { Criativo, Tom } from "@/lib/conteudo";

type Config = typeof defaultValues.config;

/** Paletas disponíveis no editor. Nome tem de bater com `pallettes.tsx`. */
const PALETAS: Record<Tom, { pallette: string; primary: string; secondary: string; background: string }> = {
  direto: { pallette: "black", primary: "#0d0d0d", secondary: "#4b4b4b", background: "#ffffff" },
  didatico: { pallette: "slate", primary: "#0f172a", secondary: "#475569", background: "#f8fafc" },
  provocativo: { pallette: "red", primary: "#7f1d1d", secondary: "#dc2626", background: "#fff7f7" },
  acolhedor: { pallette: "beige", primary: "#3f3325", secondary: "#8a7357", background: "#fbf7f1" },
};

/**
 * Fundo por direção visual. Os slugs têm de existir em `background-styles.tsx`:
 * slug inventado cai no default e o design "escolhido" não aparece.
 *
 * Não existe foto gerada por IA aqui de propósito: o gateway do projeto não tem
 * provedor de imagem com credencial (verificado: 400 "No credentials for
 * provider: agnes"). Fundo procedural é o que dá para entregar sem depender de
 * chave que não temos, e já muda a cara do carrossel.
 */
const FUNDO_POR_IMAGEM: Record<string, string> = {
  nenhuma: "gradiente-suave",
  foto_pessoa: "gradiente-suave",
  textura: "papel",
  formas_geometricas: "grade",
};

export interface DesignEscolhido {
  config: Config;
  /** Por que esta combinação, para a tela poder explicar a escolha. */
  motivo: string;
}

/**
 * Devolve a configuração visual do documento.
 *
 * `criativo` pode vir nulo (a etapa 4 falha sem derrubar o pipeline), e nesse
 * caso o tom decide sozinho. Nunca lança: design não pode ser motivo de falha de
 * geração.
 */
export function designAutomatico(tom: Tom, criativo: Criativo | null): DesignEscolhido {
  const paleta = PALETAS[tom] ?? PALETAS.direto;
  const estiloFundo = FUNDO_POR_IMAGEM[criativo?.imagem ?? "nenhuma"] ?? "solido";

  // Ritmo impactante pede mais contraste entre slides; contido pede uniformidade.
  const contraste = criativo?.ritmo === "impactante" ? 0.18 : 0.06;
  const escurecer = (hex: string, fator: number) => {
    const n = parseInt(hex.replace("#", ""), 16);
    const r = Math.max(0, Math.round(((n >> 16) & 255) * (1 - fator)));
    const g = Math.max(0, Math.round(((n >> 8) & 255) * (1 - fator)));
    const b = Math.max(0, Math.round((n & 255) * (1 - fator)));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  };

  return {
    config: {
      ...defaultValues.config,
      theme: {
        ...defaultValues.config.theme,
        isCustom: true,
        pallette: paleta.pallette,
        primary: paleta.primary,
        secondary: escurecer(paleta.secondary, contraste),
        background: paleta.background,
        backgroundStyle: estiloFundo,
      },
    },
    motivo: `tom ${tom} · paleta ${paleta.pallette} · fundo ${estiloFundo}${
      criativo?.ritmo ? ` · ritmo ${criativo.ritmo}` : ""
    }`,
  };
}

/**
 * Verifica se a copy gerada tem substância.
 *
 * Serve para recusar carrossel de títulos soltos antes de mostrar na tela. Não
 * tenta consertar: conserto silencioso produz documento que parece completo e
 * não é. Quem conserta é o modelo, chamado de novo com a lista de problemas.
 */
export function problemasDaCopy(slides: { elements: { type: string; text?: string }[] }[]): string[] {
  const problemas: string[] = [];
  if (slides.length < 5) problemas.push(`apenas ${slides.length} slides (mínimo 5)`);

  slides.forEach((s, i) => {
    const titulos = s.elements.filter((e) => e.type === "Title");
    const descricoes = s.elements.filter((e) => e.type === "Description");
    const subtitulos = s.elements.filter((e) => e.type === "Subtitle");
    if (s.elements.length < 2) {
      problemas.push(`slide ${i + 1} tem ${s.elements.length} elemento(s)`);
      return;
    }
    if (titulos.length > 1) problemas.push(`slide ${i + 1} tem mais de um título`);
    const corpo = [...descricoes, ...subtitulos]
      .map((e) => (e.text ?? "").trim())
      .join(" ");
    if (corpo.length < 20) {
      problemas.push(`slide ${i + 1} sem corpo de texto (${corpo.length} caracteres)`);
    }
  });

  return problemas;
}
