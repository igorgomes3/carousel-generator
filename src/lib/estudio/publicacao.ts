/**
 * Publicação do carrossel: legenda, hashtags e a hora sugerida.
 *
 * Por que isso é um arquivo e não três campos soltos na tela: o pipeline de 6
 * etapas já escreve a legenda (`gerarPublicacao` em `lib/conteudo.ts`), mas o
 * resultado ficava só na resposta de `/api/gerar` e morria antes de virar
 * projeto salvo. Aqui ficam a regra de reserva (quando a etapa falha) e o texto
 * que vai para a área de transferência.
 *
 * Reserva não é enfeite: o pipeline pode abortar a etapa de publicação (ela é
 * enriquecimento, não bloqueia) e um carrossel pronto sem legenda obriga o
 * criador a escrever do zero — que é exatamente o trabalho que ele veio evitar.
 */
import type { Formato } from "@/lib/estudio/formatos";
import type { SlideCarrossel } from "@/lib/estudio/tipos";

/** Instagram corta a legenda em 2.200 caracteres; acima disso é texto perdido. */
export const LIMITE_LEGENDA = 2200;
export const LIMITE_HASHTAG = 30;

export interface PublicacaoDoCarrossel {
  legenda?: string;
  hashtags?: string[];
  melhorHorario?: string;
}

/**
 * Normaliza hashtag: sem acento, um `#` só no começo, minúscula.
 *
 * Acento sai porque `#estética` e `#estetica` viram tags DIFERENTES para o
 * Instagram, e ninguém digita as duas: o mesmo assunto se divide em duas buscas.
 * Sem acento, o resultado é sempre encontrável por quem digita com ou sem.
 */
export function normalizarHashtag(bruta: string): string | null {
  const limpa = bruta
    .trim()
    .toLowerCase()
    // `NFD` separa a letra do acento; `\p{Mn}` remove os acentos soltos.
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .replace(/^#+/, "")
    .replace(/[^\p{L}\p{N}_]/gu, "");
  if (limpa.length < 2 || limpa.length > 40) return null;
  return `#${limpa}`;
}

export function normalizarHashtags(brutas: unknown): string[] {
  if (!Array.isArray(brutas)) return [];
  const vistas = new Set<string>();
  for (const b of brutas) {
    if (typeof b !== "string") continue;
    const h = normalizarHashtag(b);
    if (h && !vistas.has(h)) vistas.add(h);
    if (vistas.size >= LIMITE_HASHTAG) break;
  }
  return Array.from(vistas);
}

export function normalizarLegenda(bruta: unknown): string {
  if (typeof bruta !== "string") return "";
  // Quebra de linha é parte da legenda do Instagram; espaço duplo não é.
  return bruta.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, LIMITE_LEGENDA);
}

/**
 * Legenda de reserva: monta a partir dos próprios cards.
 *
 * Não tenta ser criativa — tenta ser verdadeira. O gancho da capa vira a
 * primeira linha (é o que o Instagram mostra antes do "mais"), o corpo dos cards
 * de conteúdo vira o parágrafo e o CTA fecha com a pergunta que o carrossel
 * levanta. Nada aqui inventa fato que não esteja no carrossel.
 */
export function legendaDeReserva(slides: SlideCarrossel[]): string {
  const capa = slides[0];
  const conteudo = slides.filter((s) => s.tipo === "conteudo");
  const cta = slides.find((s) => s.tipo === "cta");

  const gancho = (capa?.titulo ?? "").trim();
  const subtitulo = (capa?.corpo ?? "").trim();
  const corpo = conteudo
    .slice(0, 3)
    .map((s) => `• ${s.titulo.trim()}`)
    .filter((l) => l.length > 3)
    .join("\n");
  const fecho = (cta?.titulo ?? "").trim();

  return [gancho, subtitulo, corpo, fecho].filter(Boolean).join("\n\n").slice(0, LIMITE_LEGENDA);
}

/**
 * Hashtags de reserva: do nicho quando existe, do formato quando não.
 *
 * `formato.hashtags` é o vocabulário medido do nicho (ver
 * `docs/conteudo/FORMATOS-CARROSSEL.md`); quando o formato não traz nada, sobra
 * um conjunto pequeno e honesto do próprio tema do produto. Nunca inventamos
 * tag gigante (#viral #fyp) porque ela só suja o post.
 */
export function hashtagsDeReserva(formato?: Formato | null): string[] {
  const doNicho = normalizarHashtags(
    (formato as unknown as { hashtags?: string[] } | undefined)?.hashtags ?? [],
  );
  const base = ["#carrossel", "#conteudodigital", "#instagram"];
  return (doNicho.length >= 3 ? doNicho : [...doNicho, ...base]).slice(0, 12);
}

/**
 * Texto pronto para colar no Instagram: legenda, linha em branco, hashtags.
 *
 * As hashtags ficam no FIM e separadas — no meio da legenda elas quebram a
 * leitura, e no fim o Instagram ainda as usa como sinal.
 */
export function textoParaColar(legenda: string, hashtags: string[]): string {
  const limpa = (legenda ?? "").trim();
  const tags = (hashtags ?? []).join(" ");
  return [limpa, tags].filter(Boolean).join("\n\n");
}
