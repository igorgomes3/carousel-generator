/**
 * Geometria do card — 3:4 de arte, 4:5 de janela segura (issue #12).
 *
 * ## Por que dois retângulos e não um
 *
 * O Instagram aceita 4:5 (1080×1350) no feed e no perfil, e é o formato que a
 * grade corta. O alvo (o produto de referência) desenha em 3:4 (1080×1440) porque sobra
 * altura: a foto respira em cima e embaixo. Os dois juntos dão o desenho certo:
 *
 *   - **arte** = 1080×1440 — o que a pessoa vê e compõe no editor;
 *   - **janela segura** = 1080×1350, centrada — onde TODO texto tem que caber;
 *   - **PNG** = 1080×1350 — a janela, recortada da arte.
 *
 * A faixa de 45 px no topo e no pé é sangria: foto e gradiente podem invadir,
 * texto nunca. Sem essa regra, o rodapé do card ficaria a 3 px da borda do PNG
 * — e o print de quem posta sairia com o texto colado no corte.
 *
 * Os três números vivem aqui, não espalhados nos componentes: o palco de export
 * (`estudio.tsx`), o card (`cartao.tsx`) e o rasterizador (`exportar.ts`)
 * precisam concordar, e concordar por importação é a única forma que não desvia.
 */

/** Arte: 3:4, o tamanho em que o card é desenhado e editado. */
export const ART_W = 1080;
export const ART_H = 1440;

/** Janela segura: 4:5, o que a grade do perfil mostra e o PNG entrega. */
export const SAFE_W = 1080;
export const SAFE_H = 1350;

/** Sangria vertical de cada lado (45 px). Derivada, nunca escrita à mão. */
export const BLEED_Y = (ART_H - SAFE_H) / 2;

/** Retângulo da área segura dentro da arte. */
export const SAFE_AREA = {
  x: 0,
  y: BLEED_Y,
  width: SAFE_W,
  height: SAFE_H,
} as const;

/** Tamanho do PNG exportado (4:5). */
export const EXPORT_W = SAFE_W;
export const EXPORT_H = SAFE_H;

/**
 * Converte uma coordenada medida na janela segura para a mesma coordenada na
 * arte. É o que permite manter os layouts que já existiam (80 px do topo,
 * 48 px do pé) sem reescrever cada número: o layout foi pensado no card de
 * 1350, e o card agora tem 90 px a mais.
 */
export function dentroDaJanela(y: number): number {
  return BLEED_Y + y;
}

/** O mesmo para distâncias a partir do pé da arte. */
export function doPeDaJanela(distancia: number): number {
  return BLEED_Y + distancia;
}

/**
 * Um trecho vertical está inteiro dentro da janela segura?
 *
 * Existe para o teste e para quem quiser medir layout sem abrir navegador: a
 * regra do produto ("texto não entra na sangria") vira uma função com resposta
 * sim/não, em vez de um comentário que ninguém confere.
 */
export function dentroDaAreaSegura(y: number, altura: number): boolean {
  return y >= SAFE_AREA.y && y + altura <= SAFE_AREA.y + SAFE_AREA.height;
}
