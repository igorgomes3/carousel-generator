import useWindowDimensions from "@/lib/hooks/use-window-dimensions";
import { SIZE } from "@/lib/page-size";

/**
 * Escala do slide no palco.
 *
 * Existe como hook porque duas peças precisam do MESMO número: o slide (para
 * desenhar) e a linha de status (para escrever "Ajustar 89%"). Duas cópias da
 * fórmula divergem no dia em que alguém mexe numa só, e aí a tela mente sobre o
 * que está mostrando.
 *
 * Proporções da direção A: no desktop o slide ocupa ~28% da largura da janela
 * (348 px em 1280 no mockup aprovado), no mobile ~72%. Abaixo disso o slide
 * encosta no padding do palco.
 */
export function useEscalaSlide() {
  const { width } = useWindowDimensions();
  const windowWidth = width || 0;
  const mdWindowWidthPx = 770;
  const screenToSlideMinRatio = windowWidth > mdWindowWidthPx ? 3.6 : 1.4;
  const escala = windowWidth
    ? Math.min(1, windowWidth / screenToSlideMinRatio / SIZE.width)
    : 1;

  return { escala, windowWidth, larguraPronta: Boolean(windowWidth) };
}
