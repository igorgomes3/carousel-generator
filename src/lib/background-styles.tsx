import { formatHex, formatHex8, interpolate, parse, rgb } from "culori";
import type { CSSProperties } from "react";
import { RUIDO_PAPEL } from "@/lib/paper-noise";

export type Cores = {
  primary: string;
  secondary: string;
  background: string;
};

/**
 * Mistura b em a na proporcao t (0..1). Devolve hex opaco.
 *
 * Feito aqui e nao com color-mix() do CSS de proposito: a exportacao passa o
 * slide por SVG foreignObject, e um valor que o motor nao entende vira fundo
 * transparente no PNG — sem erro visivel. Calculando a cor antes de escrever
 * o CSS, o que sai na tela e o que sai no arquivo.
 */
export function tom(a: string, b: string, t: number): string {
  const c = interpolate([a, b], "oklch")(t);
  const r = rgb(c);
  return r ? formatHex(r) : a;
}

/** A mesma cor, com transparencia. */
export function veu(cor: string, alpha: number): string {
  const c = parse(cor);
  const r = c ? rgb(c) : undefined;
  return r ? formatHex8({ ...r, alpha }) : cor;
}

type EstiloFundo = {
  slug: string;
  nome: string;
  descricao: string;
};

export const ESTILOS_FUNDO: EstiloFundo[] = [
  { slug: "solido", nome: "Sólido", descricao: "Cor chapada" },
  { slug: "gradiente-suave", nome: "Gradiente", descricao: "Luz vinda do canto" },
  { slug: "brilho", nome: "Brilho", descricao: "Foco no canto superior" },
  { slug: "grade", nome: "Grade", descricao: "Malha fina" },
  { slug: "pontos", nome: "Pontos", descricao: "Retícula discreta" },
  { slug: "papel", nome: "Papel", descricao: "Textura de impresso" },
];

/** Ruido em PNG embutido: sem arquivo externo, entao a exportacao nao quebra. */
const RUIDO = `url("${RUIDO_PAPEL}")`;

/**
 * Traduz o estilo escolhido em CSS do fundo. Sempre parte da cor de fundo do
 * tema, entao trocar a paleta continua mudando o visual inteiro.
 */
export function cssDoFundo(slug: string | undefined, cores: Cores): CSSProperties {
  const { background, primary } = cores;

  switch (slug) {
    case "gradiente-suave":
      return {
        backgroundColor: background,
        backgroundImage: `linear-gradient(165deg, ${tom(background, primary, 0.1)} 0%, ${background} 58%)`,
      };

    case "brilho":
      return {
        backgroundColor: background,
        backgroundImage: `radial-gradient(120% 85% at 100% 0%, ${tom(
          background,
          primary,
          0.18,
        )} 0%, ${background} 62%)`,
      };

    case "grade":
      return {
        backgroundColor: background,
        backgroundImage: `linear-gradient(${veu(primary, 0.07)} 1px, transparent 1px), linear-gradient(90deg, ${veu(
          primary,
          0.07,
        )} 1px, transparent 1px)`,
        backgroundSize: "34px 34px, 34px 34px",
      };

    case "pontos":
      return {
        backgroundColor: background,
        backgroundImage: `radial-gradient(${veu(primary, 0.13)} 1.3px, transparent 1.3px)`,
        backgroundSize: "22px 22px",
      };

    case "papel":
      return {
        backgroundColor: background,
        backgroundImage: RUIDO,
        backgroundSize: "64px 64px",
      };

    case "solido":
    default:
      return { backgroundColor: background };
  }
}
