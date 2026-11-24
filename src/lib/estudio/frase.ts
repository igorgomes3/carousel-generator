/**
 * Sanidade de frase — o mínimo para não publicar texto cortado.
 *
 * O gerador às vezes devolve um corpo que termina no meio da frase ("O número
 * final não é o"). Num card, isso não é detalhe: vira peça entregue com erro de
 * português, e o criador não tem como saber se o modelo falhou ou se o app
 * cortou. Medido em 24/11/2026 (tema "orçamento mais barato"): capa saiu com
 * `O número final não é o`.
 *
 * A regra aqui é conservadora de propósito: só reprova o que termina em palavra
 * funcional (artigo, preposição, conjunção) ou em reticências de truncamento
 * explícito. Falso positivo custa um corpo vazio na capa; deixar passar custa
 * peça errada publicada.
 */

/** Palavras que NÃO fecham frase em português. */
const FECHAMENTO_PROIBIDO = new Set([
  "o", "a", "os", "as",
  "um", "uma", "uns", "umas",
  "de", "do", "da", "dos", "das",
  "em", "no", "na", "nos", "nas", "num", "numa",
  "por", "pelo", "pela", "pelos", "pelas",
  "para", "pra", "com", "sem", "sob", "sobre", "entre",
  "que", "e", "ou", "mas", "porém", "porque", "pois", "se", "como",
  "ao", "aos", "à", "às",
  "muito", "mais", "menos", "tão", "também", "já", "ainda",
  "seu", "sua", "seus", "suas", "meu", "minha",
  "este", "esta", "esse", "essa", "isso", "isto", "aquele", "aquela",
]);

/** Termina com pontuação de fim de frase? */
export function terminaBem(texto: string): boolean {
  return /[.!?…]["')\]]?$/.test((texto ?? "").trim());
}

/**
 * `true` quando o texto parece uma frase completa.
 *
 * Texto vazio conta como completo: corpo é opcional no card, e ausência não é
 * erro.
 */
export function fraseCompleta(texto: string | null | undefined): boolean {
  const t = (texto ?? "").trim();
  if (!t) return true;
  if (terminaBem(t)) return true;

  // Última palavra, sem pontuação pendurada.
  const ultima = t
    .split(/\s+/)
    .pop()
    ?.toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
  if (!ultima) return false;

  // Número solto no fim ("3 motivos para 2") também não fecha frase.
  if (/^\d+$/.test(ultima)) return false;

  return !FECHAMENTO_PROIBIDO.has(ultima);
}

/**
 * Devolve o texto se ele fecha, senão string vazia.
 *
 * Usado na CAPA: corpo truncado ali destrói a primeira impressão do carrossel, e
 * a capa funciona bem só com manchete.
 */
export function corpoSeFechar(texto: string | null | undefined): string {
  const t = (texto ?? "").trim();
  return fraseCompleta(t) ? t : "";
}
