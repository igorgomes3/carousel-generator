import type { Cores } from "@/lib/background-styles";

/**
 * Uma "cara" e um ponto de partida: fundo, cor do titulo, cor do corpo, par de
 * fontes e textura. O tema do app so tem tres cores (titulo, corpo, fundo), e
 * nao existe campo separado de acento — entao o acento de cada cara vem da
 * propria cor do titulo, que e o elemento dominante do slide.
 *
 * Quem aplica um preset entra no modo de cores personalizadas: os campos
 * abaixo continuam mostrando exatamente o que o preset escreveu, e nao um
 * estado escondido.
 */
export type Preset = {
  slug: string;
  nome: string;
  descricao: string;
  cores: Cores;
  fundo: string;
  fontes: { font1: string; font2: string };
};

export const PRESETS: Preset[] = [
  {
    slug: "clinica-limpa",
    nome: "Clínica limpa",
    descricao: "Claro, sereno, sem ruído",
    cores: { primary: "#0f3d3e", secondary: "#4b5563", background: "#ffffff" },
    fundo: "gradiente-suave",
    fontes: { font1: "DM_Serif_Display", font2: "DM_Sans" },
  },
  {
    slug: "editorial-escuro",
    nome: "Editorial escuro",
    descricao: "Escuro com luz de canto",
    cores: { primary: "#f2ede4", secondary: "#9aa7b4", background: "#0b0f14" },
    fundo: "brilho",
    fontes: { font1: "DM_Serif_Display", font2: "DM_Sans" },
  },
  {
    slug: "kraft",
    nome: "Kraft",
    descricao: "Papel impresso, tinta quente",
    cores: { primary: "#1a1613", secondary: "#5c5145", background: "#f4ecd8" },
    fundo: "papel",
    fontes: { font1: "PT_Serif", font2: "Inter" },
  },
  {
    slug: "nevoa",
    nome: "Névoa roxa",
    descricao: "Gradiente lavanda, título violeta",
    cores: { primary: "#4c3f8f", secondary: "#5f5a78", background: "#f7f5ff" },
    fundo: "gradiente-suave",
    fontes: { font1: "Syne", font2: "Inter" },
  },
  {
    slug: "impacto",
    nome: "Impacto",
    descricao: "Título pesado sobre malha fina",
    cores: { primary: "#111111", secondary: "#4a4a4a", background: "#ffffff" },
    fundo: "grade",
    fontes: { font1: "ArchivoBlack", font2: "Inter" },
  },
  {
    slug: "sereno",
    nome: "Sereno",
    descricao: "Azul calmo com brilho no topo",
    cores: { primary: "#0b3a5d", secondary: "#4a6076", background: "#f2f7fb" },
    fundo: "brilho",
    fontes: { font1: "Montserrat", font2: "Inter" },
  },
];

export function presetPorSlug(slug: string | undefined): Preset | undefined {
  return PRESETS.find((p) => p.slug === slug);
}
