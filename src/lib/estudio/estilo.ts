/**
 * Curadoria de estilo do estúdio — fundo, destaque e par de fontes (issue #12).
 *
 * ## Por que lista fechada e não color picker
 *
 * O editor denso foi desligado de propósito (issue #10/#14). Um `<input
 * type="color">` devolve 16,7 milhões de cores para um usuário leigo, e a
 * maioria delas produz card ilegível — texto cinza em fundo cinza, destaque que
 * some. Trinta fontes têm o mesmo problema com outro nome: a pessoa não sabe
 * escolher, então escolhe a primeira.
 *
 * Aqui a curadoria é curta e cada item carrega a decisão de contraste embutida:
 *
 *   - **fundo** traz junto a cor de texto e a secundária medidas para ele —
 *     a pessoa escolhe UMA cor, não três;
 *   - **destaque** só fica disponível quando tem contraste com o fundo atual
 *     (`combina`), que é o que impede o card de sair com palavra invisível;
 *   - **fonte** vem em PAR (título + corpo): par é o que decide se o card lê
 *     bem, fonte solta não.
 *
 * Nada aqui é persistido como cor: o projeto guarda o **id** escolhido. Cor
 * hexadecimal no banco é dívida — quando a curadoria melhora, o que está salvo
 * acompanha; e id desconhecido (documento antigo, projeto de outra versão)
 * simplesmente cai no padrão do template, que é o que o item 4 da issue exige.
 */
import type { PaletteTemplate } from "@/lib/templates";

export interface FundoEstudio {
  id: string;
  nome: string;
  bg: string;
  /** Cor do texto principal, medida para este fundo. */
  text: string;
  /** Texto secundário/rodapé, com contraste menor mas ainda legível. */
  muted: string;
}

export interface DestaqueEstudio {
  id: string;
  nome: string;
  cor: string;
}

export interface ParDeFontes {
  id: string;
  nome: string;
  /** Família do título — precisa existir em `PILHAS` (`@/lib/templates`). */
  display: string;
  /** Família do corpo. */
  body: string;
}

/**
 * O que o projeto salva: ids, nunca hex.
 *
 * Todos opcionais: projeto gravado antes da issue #12 não tem nenhum dos três,
 * e é exatamente esse o caso em que o card tem que abrir com o visual de antes.
 */
export interface EstiloEscolhido {
  fundoId?: string;
  destaqueId?: string;
  fonteId?: string;
}

/** O que o card precisa para se desenhar, já resolvido. */
export interface Aparencia {
  palette: PaletteTemplate;
  fontDisplay: string;
  fontBody: string;
}

/* ------------------------------------------------------------------ */
/* Fundos                                                              */
/* ------------------------------------------------------------------ */

/**
 * Oito fundos. Três claros de papel (branco, off-white e areia) e cinco escuros,
 * porque carrossel de opinião vive no escuro e carrossel de serviço no claro —
 * não existe meio-termo útil no meio da escala que não pareça "cinza errado".
 * Texto e secundária de cada um foram medidos contra o próprio fundo.
 */
export const FUNDOS: FundoEstudio[] = [
  { id: "branco", nome: "Branco", bg: "#FFFFFF", text: "#101114", muted: "#6B7280" },
  { id: "papel", nome: "Papel", bg: "#F7F4EE", text: "#16110C", muted: "#6F675C" },
  { id: "areia", nome: "Areia", bg: "#EFE7DA", text: "#1F1A14", muted: "#7A6A57" },
  { id: "grafite", nome: "Grafite", bg: "#14161A", text: "#FFFFFF", muted: "#9AA3AE" },
  { id: "preto", nome: "Preto", bg: "#000000", text: "#FFFFFF", muted: "#A1A1AA" },
  { id: "meia-noite", nome: "Meia-noite", bg: "#0B1024", text: "#F8FAFF", muted: "#94A3B8" },
  { id: "vinho", nome: "Vinho", bg: "#1B0B12", text: "#FFF5F7", muted: "#C9A6AE" },
  { id: "floresta", nome: "Floresta", bg: "#04110F", text: "#F2FFFB", muted: "#93AEA9" },
];

/* ------------------------------------------------------------------ */
/* Destaques                                                           */
/* ------------------------------------------------------------------ */

/**
 * Oito destaques. Saturação alta de propósito: o destaque aparece em palavra
 * sublinhada, no traço do card de conteúdo e no card de CTA — em qualquer um
 * dos três ele precisa gritar contra o fundo, não conversar com ele.
 */
export const DESTAQUES: DestaqueEstudio[] = [
  { id: "laranja", nome: "Laranja", cor: "#0E7490" },
  { id: "vermelho", nome: "Vermelho", cor: "#E5342B" },
  { id: "terracota", nome: "Terracota", cor: "#C8452B" },
  { id: "ouro", nome: "Ouro", cor: "#D9A521" },
  { id: "agua", nome: "Verde-água", cor: "#2BE0C8" },
  { id: "azul", nome: "Azul", cor: "#3B82F6" },
  { id: "violeta", nome: "Violeta", cor: "#A855F7" },
  { id: "lima", nome: "Lima", cor: "#B4E33D" },
];

/* ------------------------------------------------------------------ */
/* Pares de fontes                                                     */
/* ------------------------------------------------------------------ */

/**
 * Seis pares, todos com família já carregada neste build (ver `PILHAS` em
 * `@/lib/templates`). Fonte fora da lista carregaria tarde e o PNG sairia em
 * Arial — o modo de falha mais chato do export.
 *
 * O corpo é Inter em cinco dos seis: par bom é título com personalidade e
 * corpo invisível. Roboto aparece no par "Jornal" porque Oswald + Roboto é a
 * dupla de impresso, e Oswald + Inter lê como site.
 */
export const PARES_DE_FONTES: ParDeFontes[] = [
  { id: "manchete", nome: "Manchete", display: "Anton", body: "Inter" },
  { id: "cartaz", nome: "Cartaz", display: "Archivo Black", body: "Inter" },
  { id: "condensada", nome: "Condensada", display: "Bebas Neue", body: "Inter" },
  { id: "editorial", nome: "Editorial", display: "Playfair Display", body: "Inter" },
  { id: "jornal", nome: "Jornal", display: "Oswald", body: "Roboto" },
  { id: "tecnica", nome: "Técnica", display: "Space Grotesk", body: "Inter" },
];

/* ------------------------------------------------------------------ */
/* Contraste                                                           */
/* ------------------------------------------------------------------ */

function canalParaLinear(valor: number): number {
  const c = valor / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Hex de 3 ou 6 dígitos → {r,g,b}; cor inválida vira null (nunca chuta preto). */
export function lerHex(hex: string): { r: number; g: number; b: number } | null {
  const limpo = hex.trim().replace(/^#/, "");
  const expandido =
    limpo.length === 3
      ? limpo
          .split("")
          .map((c) => c + c)
          .join("")
      : limpo;
  if (!/^[0-9a-f]{6}$/i.test(expandido)) return null;
  return {
    r: parseInt(expandido.slice(0, 2), 16),
    g: parseInt(expandido.slice(2, 4), 16),
    b: parseInt(expandido.slice(4, 6), 16),
  };
}

/** Luminância relativa (WCAG 2.1), 0 = preto, 1 = branco. */
export function luminancia(hex: string): number {
  const rgb = lerHex(hex);
  if (!rgb) return 0;
  return (
    0.2126 * canalParaLinear(rgb.r) +
    0.7152 * canalParaLinear(rgb.g) +
    0.0722 * canalParaLinear(rgb.b)
  );
}

/** Razão de contraste WCAG entre duas cores (1 = idênticas, 21 = preto×branco). */
export function contraste(a: string, b: string): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  const claro = Math.max(la, lb);
  const escuro = Math.min(la, lb);
  return (claro + 0.05) / (escuro + 0.05);
}

/**
 * Piso de contraste do destaque contra o fundo.
 *
 * 1.8 não é o 4.5 do WCAG para texto pequeno: aqui o destaque desenha palavra
 * de manchete (72–116 px, onde 3:1 já sobra) e traço de 10 px. O que o piso
 * impede é o caso degenerado — laranja sobre vermelho, lima sobre areia — em que
 * a cor simplesmente não aparece. Combinado com `corLegivelSobre` no card de CTA,
 * fecha as duas maneiras de o destaque virar invisível.
 */
export const CONTRASTE_MINIMO_DESTAQUE = 1.8;

export function combina(fundo: FundoEstudio, destaque: DestaqueEstudio): boolean {
  return contraste(fundo.bg, destaque.cor) >= CONTRASTE_MINIMO_DESTAQUE;
}

/**
 * Texto legível sobre uma cor chapada — usado no card de CTA, que pinta o fundo
 * inteiro com o destaque. Branco sobre verde-água dá 1,6:1; sem esta função o
 * último card do carrossel sairia ilegível em metade das paletas.
 */
export function corLegivelSobre(hex: string): string {
  return luminancia(hex) > 0.45 ? "#0B0B0C" : "#FFFFFF";
}

/* ------------------------------------------------------------------ */
/* Resolução                                                           */
/* ------------------------------------------------------------------ */

export function fundoPorId(id: string | null | undefined): FundoEstudio | null {
  if (!id) return null;
  return FUNDOS.find((f) => f.id === id) ?? null;
}

export function destaquePorId(id: string | null | undefined): DestaqueEstudio | null {
  if (!id) return null;
  return DESTAQUES.find((d) => d.id === id) ?? null;
}

export function parDeFontesPorId(id: string | null | undefined): ParDeFontes | null {
  if (!id) return null;
  return PARES_DE_FONTES.find((p) => p.id === id) ?? null;
}

/**
 * Valida o que veio do cliente/do disco. Id desconhecido é DESCARTADO, não
 * substituído por um padrão: o padrão é "não escolheu", e é o que faz o projeto
 * antigo abrir com o visual do template dele.
 */
export function normalizarEstilo(entrada: unknown): EstiloEscolhido {
  if (!entrada || typeof entrada !== "object") return {};
  const bruto = entrada as Record<string, unknown>;
  const saida: EstiloEscolhido = {};
  const fundo = typeof bruto.fundoId === "string" ? fundoPorId(bruto.fundoId) : null;
  const destaque = typeof bruto.destaqueId === "string" ? destaquePorId(bruto.destaqueId) : null;
  const fonte = typeof bruto.fonteId === "string" ? parDeFontesPorId(bruto.fonteId) : null;
  if (fundo) saida.fundoId = fundo.id;
  if (destaque) saida.destaqueId = destaque.id;
  if (fonte) saida.fonteId = fonte.id;
  return saida;
}

export function estiloVazio(estilo: EstiloEscolhido | null | undefined): boolean {
  return !estilo || (!estilo.fundoId && !estilo.destaqueId && !estilo.fonteId);
}

/**
 * Aparência final do card: template + o que a pessoa escolheu.
 *
 * Sem escolha → o template, byte por byte igual ao que existia antes da issue
 * #12. Com escolha parcial → só o pedaço escolhido muda (fundo define bg/text/
 * muted; destaque sozinho mantém o fundo do template).
 */
export function resolverAparencia(
  template: { palette: PaletteTemplate; fontDisplay: string; fontBody: string },
  estilo?: EstiloEscolhido | null,
): Aparencia {
  const fundo = fundoPorId(estilo?.fundoId);
  const destaque = destaquePorId(estilo?.destaqueId);
  const fonte = parDeFontesPorId(estilo?.fonteId);

  const palette: PaletteTemplate = {
    bg: fundo?.bg ?? template.palette.bg,
    text: fundo?.text ?? template.palette.text,
    muted: fundo?.muted ?? template.palette.muted,
    accent: destaque?.cor ?? template.palette.accent,
  };

  return {
    palette,
    fontDisplay: fonte?.display ?? template.fontDisplay,
    fontBody: fonte?.body ?? template.fontBody,
  };
}
