"use client";

/**
 * Um bloco de texto do card que SABE se está cabendo (W98).
 *
 * ## Por que não é CSS puro
 *
 * `-webkit-line-clamp` resolve o corte, mas não a redução: ele corta em 3 linhas
 * a 92 px com o texto do tamanho que veio, sem tentar caber primeiro. A regra do
 * produto é "reduz até caber, e só corta quando não cabe nem no mínimo" — isso
 * exige medir o texto renderizado, com a fonte de verdade. Medir é o que impede
 * o palpite por contagem de caracteres, que já errou aqui: `corpoDaManchete()`
 * só olhava o comprimento da MANCHETE e o corpo do card saía cortado em 55%.
 *
 * ## Como mede sem sujar a tela
 *
 * Clona o próprio nó (com os estilos inline já aplicados), joga o clone fora do
 * fluxo e invisível no mesmo pai, e mede as caixas de linha do `Range` sobre o
 * texto. O clone sai do DOM no mesmo efeito: nada disso aparece em tela nem
 * entra no PNG (o `html-to-image` serializa o nó original, não o medidor).
 *
 * ## Por que a prévia e o PNG concordam
 *
 * Prévia e palco de export são o MESMO componente, ambos desenhados em 1080 px
 * de largura (a prévia só é escalada por `transform`). Como a decisão vem da
 * medição no tamanho real, os dois chegam ao mesmo tamanho de fonte. A única
 * coisa que o export precisa fazer é esperar a fonte carregar e o layout
 * assentar antes de rasterizar — ver `exportar.ts`.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import {
  alturaDaLinha,
  cabeNoTeto,
  tamanhosCandidatos,
  type RegraDeTexto,
} from "@/lib/estudio/encaixe";

/** Propriedades de texto copiadas do nó real para o medidor (nome CSS, kebab-case). */
const PROPS_TEXTO = [
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "font-variant",
  "letter-spacing",
  "word-spacing",
  "text-transform",
  "text-align",
  "word-break",
  "overflow-wrap",
] as const;

interface Props {
  /** Texto com a marcação do alvo (`**ênfase**`, `((U:...))`) — é o que se vê. */
  texto: string;
  /** O mesmo texto sem marcação: é sobre ele que o corte por palavras acontece. */
  textoPuro: string;
  regra: RegraDeTexto;
  /** Tamanho de partida quando o layout resolve antes (manchete de capa). */
  base?: number;
  /** Desenha o texto (o card passa `comDestaque`). */
  renderizar: (texto: string) => ReactNode;
  /** Estilo do bloco, sem `fontSize`/`lineHeight` — esses vêm da medição. */
  estilo: CSSProperties;
  /** Marca de inspeção: `manchete`, `corpo`. O gate mede por ela. */
  bloco: string;
}

interface Ajuste {
  tamanho: number;
  linhas: number;
  texto: string;
  cortado: boolean;
}

/** Linhas efetivamente pintadas: topos distintos das caixas do `Range`. */
function linhasDe(node: HTMLElement): number {
  const range = document.createRange();
  range.selectNodeContents(node);
  const topos = new Set<number>();
  for (const r of Array.from(range.getClientRects())) {
    if (r.height > 0 && r.width > 0) topos.add(Math.round(r.top));
  }
  return topos.size;
}

/**
 * Cria o medidor invisível: clone do nó, fora do fluxo, largura fixa, pendurado
 * no `body` — NUNCA dentro do card.
 *
 * Medir dentro do card custa caro e já custou um bug: a prévia desenha o card em
 * 1080 px e escala por `transform`. `Range.getClientRects()` devolve retângulos
 * JÁ transformados, então o medidor da prévia contava linhas em 0,28× e errava
 * (6 linhas reais contadas como 5 num card de capa com corpo longo). No `body`
 * não há transform, o clone mede em pixels de arte — que é o espaço em que a
 * regra foi escrita e o espaço em que o PNG é rasterizado.
 */
function criarMedidor(el: HTMLElement, textoPuro: string): HTMLElement {
  const medidor = el.cloneNode(true) as HTMLElement;
  medidor.removeAttribute("data-bloco");
  medidor.removeAttribute("data-ajuste");
  /**
   * O medidor recebe o texto ORIGINAL, nunca o que está na tela.
   *
   * Sem isto a medição não é idempotente: o nó real já mostra o texto cortado
   * da rodada anterior, a nova medição conta menos linhas, o componente devolve
   * o texto inteiro e volta a estourar — o bloco oscilava entre 5 e 6 linhas a
   * cada remediação (a fonte carregando dispara três). Medindo sempre a partir
   * do original, medir duas vezes dá o mesmo resultado que medir uma.
   */
  medidor.textContent = textoPuro;
  const computado = getComputedStyle(el);
  for (const prop of PROPS_TEXTO) medidor.style.setProperty(prop, computado.getPropertyValue(prop));
  Object.assign(medidor.style, {
    position: "absolute",
    left: "0px",
    top: "0px",
    width: `${el.clientWidth}px`,
    visibility: "hidden",
    pointerEvents: "none",
    maxHeight: "none",
    height: "auto",
    overflow: "visible",
    display: "block",
    transform: "none",
    webkitLineClamp: "unset",
  } as CSSProperties);
  document.body.appendChild(medidor);
  return medidor;
}

export function BlocoTexto({ texto, textoPuro, regra, base, renderizar, estilo, bloco }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [ajuste, setAjuste] = useState<Ajuste>({
    tamanho: base ?? regra.base,
    linhas: 0,
    texto,
    cortado: false,
  });
  /**
   * Contador de "fontes prontas". Sem isto, a primeira medição acontece com a
   * fonte de fallback e a decisão sai errada — e no PNG, que rasteriza a fonte
   * de verdade, o texto apareceria diferente do que a tela mostrou.
   *
   * `document.fonts.ready` sozinho NÃO basta, e o defeito apareceu aqui: se a
   * fonte ainda não foi pedida no momento em que a promessa é consultada, ela
   * resolve na hora (não há nada pendente), o efeito mede com o fallback e nunca
   * mais remede. Medido: capa com 402 caracteres saía com 5 linhas contadas no
   * fallback e 6 linhas reais na fonte do card — o bloco era cortado em 5 linhas
   * de altura, exatamente o defeito que este componente existe para matar.
   * Por isso três gatilhos: `ready`, o evento `loadingdone` (fonte que chega
   * depois) e dois frames (layout assentado).
   */
  const [fontesProntas, setFontesProntas] = useState(0);

  useEffect(() => {
    const fontes = typeof document === "undefined" ? undefined : document.fonts;
    if (!fontes) return;
    let vivo = true;
    const remedir = () => {
      if (vivo) setFontesProntas((v) => v + 1);
    };
    void fontes.ready.then(remedir);
    fontes.addEventListener("loadingdone", remedir);
    const frame = requestAnimationFrame(() => requestAnimationFrame(remedir));
    return () => {
      vivo = false;
      fontes.removeEventListener("loadingdone", remedir);
      cancelAnimationFrame(frame);
    };
  }, []);

  /** Regra efetiva: `base` pode vir do layout (manchete de capa), o resto é fixo. */
  const regraEfetiva = useMemo<RegraDeTexto>(
    () => (base === undefined ? regra : { ...regra, base }),
    [regra, base],
  );
  const candidatos = useMemo(() => tamanhosCandidatos(regraEfetiva), [regraEfetiva]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const medidor = criarMedidor(el, textoPuro);
    const aplicar = (tamanho: number) => {
      medidor.style.setProperty("font-size", `${tamanho}px`);
      medidor.style.setProperty("line-height", String(regraEfetiva.lineHeight));
    };

    try {
      let tamanho: number | null = null;
      for (const candidato of candidatos) {
        aplicar(candidato);
        if (cabeNoTeto(linhasDe(medidor), candidato, regraEfetiva)) {
          tamanho = candidato;
          break;
        }
      }

      let textoFinal = texto;
      let cortado = false;
      if (tamanho === null) {
        /**
         * Nem no piso de fonte coube: corta com reticências na última linha do
         * teto. A busca é por PALAVRA, e cada candidato é medido de verdade —
         * busca binária por contagem de caracteres já errou aqui (estimou 302
         * caracteres cabendo em 6 linhas quando o limite era 5): o passo é
         * decrementar até medir que coube, e o laço só termina com medição
         * favorável. Custa uma dezena de reflows, e só no caso de corte.
         */
        tamanho = regraEfetiva.minimo;
        aplicar(tamanho);
        const palavras = textoPuro.trim().split(/\s+/);
        cortado = true;
        while (palavras.length > 1) {
          medidor.textContent = `${palavras.join(" ")}…`;
          if (linhasDe(medidor) <= regraEfetiva.tetoLinhas) break;
          palavras.pop();
        }
        textoFinal = `${palavras.join(" ")}…`;
        medidor.textContent = textoFinal;
      }

      // Contagem final sobre o texto que VAI ser desenhado — não sobre um
      // candidato intermediário da busca. Era a diferença entre "5 linhas" no
      // relatório e 6 linhas na tela.
      const tamanhoFinal: number = tamanho;
      aplicar(tamanhoFinal);
      const linhas = linhasDe(medidor);
      setAjuste((atual) =>
        atual.tamanho === tamanhoFinal && atual.texto === textoFinal && atual.linhas === linhas
          ? atual
          : { tamanho: tamanhoFinal, linhas, texto: textoFinal, cortado },
      );
    } finally {
      medidor.remove();
    }
  }, [texto, textoPuro, regraEfetiva, candidatos, fontesProntas]);

  const tetoPx = useMemo(() => {
    const porLinha = alturaDaLinha(ajuste.tamanho, regraEfetiva.lineHeight) * regraEfetiva.tetoLinhas;
    return regraEfetiva.tetoPx === undefined ? porLinha : Math.min(porLinha, regraEfetiva.tetoPx);
  }, [ajuste.tamanho, regraEfetiva]);

  const renderizarFinal = useCallback(
    (t: string) => renderizar(t),
    [renderizar],
  );

  return (
    <div
      ref={ref}
      data-bloco={bloco}
      data-bloco-tamanho={ajuste.tamanho}
      data-bloco-linhas={ajuste.linhas}
      data-bloco-cortado={ajuste.cortado}
      style={{
        ...estilo,
        fontSize: ajuste.tamanho,
        lineHeight: regra.lineHeight,
        // Rede de segurança, não mecanismo: com a regra aplicada o conteúdo cabe,
        // e o `maxHeight` sai do teto de linhas (nunca de um número solto que
        // cortava a linha no meio).
        maxHeight: tetoPx,
        overflow: "hidden",
      }}
    >
      {renderizarFinal(ajuste.texto)}
    </div>
  );
}
