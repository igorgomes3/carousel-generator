/**
 * Encaixe de texto no card — a regra ÚNICA de "quanto texto cabe" (W98).
 *
 * ## O problema que este arquivo resolve
 *
 * O card sempre foi desenhado com tamanho de fonte fixo por bloco (26, 34, 72,
 * 92, 116 px) e `overflow: hidden` para "o que passar, corta". Na prática isso
 * produzia dois defeitos que a pessoa via no PNG:
 *
 *   1. **corte silencioso**: num card de conteúdo com corpo longo, 55% do texto
 *      desaparecia sem reticências e sem aviso (medido: capa com 402
 *      caracteres, `scrollHeight` 314 × `clientHeight` 140);
 *   2. **letra cortada no meio da linha**: quando a última linha passava do
 *      `maxHeight` por poucos pixels, o `overflow: hidden` fatiada a linha
 *      horizontalmente (medido: capa, 4 linhas a 97 px, 24 px cortados).
 *
 * ## A regra
 *
 * Todo bloco de texto tem **teto de linhas** e **piso de tamanho**. O tamanho da
 * fonte cai em passos até o bloco caber no teto; se nem no piso ele couber, o
 * texto é cortado com reticências na última linha do teto. `overflow: hidden`
 * continua existindo como rede de segurança, mas deixa de ser o mecanismo.
 *
 * Os números vivem AQUI, não espalhados no componente, porque existem dois
 * desenhos do mesmo card em produção — a prévia (escalada por `transform`) e o
 * palco de export (tamanho real, que vira PNG) — e eles precisam concordar. Como
 * os dois são o MESMO componente medindo o MESMO texto em 1080 px, a regra
 * aplicada é necessariamente a mesma; este módulo só garante que os limites
 * também sejam.
 *
 * ## Por que o piso é 28 px
 *
 * 28 px em 1080 de largura é o menor corpo que o PNG aceita sem virar letra
 * miúda no celular (a referência é o export, não a tela). Manchete tem piso mais
 * alto — 44 px — porque manchete do mesmo tamanho do corpo deixa de ser
 * manchete.
 *
 * Nada aqui importa React, DOM ou `fs`: são números e funções puras, provados em
 * `encaixe.test.ts`.
 */

/** Um bloco de texto: quantas linhas cabem e até onde o tamanho pode cair. */
export interface RegraDeTexto {
  /** Teto de linhas do bloco. Passou disso, o texto é cortado. */
  tetoLinhas: number;
  /** Menor tamanho de fonte aceito, em px de arte (1080 de largura). */
  minimo: number;
  /** Tamanho de partida, em px. */
  base: number;
  /** Multiplicador de altura de linha (`lineHeight` do CSS). */
  lineHeight: number;
  /**
   * Teto de altura em px, quando o layout tem um limite próprio (o espaço que
   * a coluna reserva para o bloco). O efetivo é `min(tetoLinhas × linha, tetoPx)`.
   */
  tetoPx?: number;
}

/** Regras por tipo de card e por bloco. */
export const ENCAIXE = {
  capa: {
    /** Manchete é o herói da capa: 4 linhas é o máximo que ainda lê como título. */
    manchete: { tetoLinhas: 4, minimo: 44, base: 116, lineHeight: 1, tetoPx: 640 },
    /** Corpo da capa é legenda do título, não texto de card: 5 linhas. */
    corpo: { tetoLinhas: 5, minimo: 28, base: 34, lineHeight: 1.32, tetoPx: 225 },
  },
  conteudo: {
    manchete: { tetoLinhas: 3, minimo: 44, base: 72, lineHeight: 1.06, tetoPx: 380 },
    corpo: { tetoLinhas: 6, minimo: 28, base: 38, lineHeight: 1.42, tetoPx: 324 },
  },
  cta: {
    manchete: { tetoLinhas: 3, minimo: 44, base: 92, lineHeight: 1.02, tetoPx: 420 },
    corpo: { tetoLinhas: 6, minimo: 28, base: 40, lineHeight: 1.35, tetoPx: 400 },
  },
} as const satisfies Record<string, Record<string, RegraDeTexto>>;

/** Teto de linhas de um bloco, já validado contra o piso de 28 px do export. */
export function tetoLegivel(regra: RegraDeTexto): number {
  if (regra.minimo < 28) throw new Error("piso de fonte abaixo de 28 px no export 1080");
  if (regra.tetoLinhas < 1) throw new Error("teto de linhas precisa ser >= 1");
  return regra.tetoLinhas;
}

/**
 * Altura de uma linha no tamanho dado.
 *
 * `lineHeight` é multiplicador, então a conta é `tamanho × lineHeight`. O
 * arredondamento é para CIMA de propósito: o navegador usa o valor fracionário
 * (32 px × 1.35 = 43,2 px por linha), e arredondar para baixo criava teto de
 * 258 px para um conteúdo de 259,2 px — 1 px de corte na última linha, que é
 * exatamente o defeito que este módulo existe para matar. Para cima, o teto
 * nunca fica abaixo do conteúdo.
 */
export function alturaDaLinha(tamanho: number, lineHeight: number): number {
  return Math.ceil(tamanho * lineHeight);
}

/** Altura do bloco inteiro no teto de linhas. */
export function alturaDoTeto(regra: RegraDeTexto, tamanho: number): number {
  return alturaDaLinha(tamanho, regra.lineHeight) * regra.tetoLinhas;
}

/**
 * Candidatos de tamanho, do maior para o menor, terminando no piso.
 *
 * Passo de 6%: uma redução fina o bastante para o texto nunca sair visivelmente
 * menor do que precisava (o primeiro tamanho que cabe vence), e grossa o
 * bastante para caber em ~15 iterações de medição — medir 30 tamanhos por bloco
 * em 7 cards travaria o editor no primeiro caractere digitado.
 */
export function tamanhosCandidatos(regra: RegraDeTexto, passo = 0.94): number[] {
  const tamanhos: number[] = [];
  let t = Math.round(regra.base);
  while (t > regra.minimo) {
    tamanhos.push(t);
    const proximo = Math.round(t * passo);
    t = proximo === t ? t - 1 : proximo;
  }
  tamanhos.push(regra.minimo);
  return tamanhos;
}

/**
 * O bloco cabe nesta combinação de linhas/tamanho?
 *
 * Duas condições: não passa do teto de linhas e não passa do teto de altura que
 * o layout reservou (quando existe). A segunda é o que impede o card de conteúdo
 * de empurrar o rodapé.
 */
export function cabeNoTeto(linhas: number, tamanho: number, regra: RegraDeTexto): boolean {
  if (linhas > tetoLegivel(regra)) return false;
  if (regra.tetoPx === undefined) return true;
  return linhas * alturaDaLinha(tamanho, regra.lineHeight) <= regra.tetoPx;
}

/**
 * Corte com reticências no limite de palavras.
 *
 * Cortar no meio da palavra ("encaixar nele sem med…") parece defeito; cortar
 * na palavra inteira anterior parece decisão. Quando nem uma palavra cabe, cai
 * para corte por caractere, porque aí o card já é caso perdido e o importante é
 * não estourar.
 */
export function cortarComReticencias(texto: string, palavrasQueCabem: number): string {
  const palavras = texto.trim().split(/\s+/);
  if (palavrasQueCabem >= palavras.length) return texto;
  if (palavrasQueCabem <= 0) return `${texto.trim().slice(0, 1)}…`;
  return `${palavras.slice(0, palavrasQueCabem).join(" ")}…`;
}
