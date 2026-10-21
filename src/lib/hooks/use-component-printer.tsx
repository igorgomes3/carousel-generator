import React from "react";
import { SIZE } from "@/lib/page-size";
import { useFieldArrayValues } from "@/lib/hooks/use-field-array-values";
import { useFormContext } from "react-hook-form";
import { DocumentFormReturn } from "@/lib/document-form-types";
import { toCanvas } from "html-to-image";
import JSZip from "jszip";

// Um slide tem SIZE.width x SIZE.height em CSS (400x500). Para sair em
// 1080x1350 — o 4:5 do Instagram — usa-se esse tamanho como alvo do canvas.
const INTROSPECCAO = { width: 1080, height: 1350 };

export function useComponentPrinter() {
  const { numPages } = useFieldArrayValues("slides");
  const { watch }: DocumentFormReturn = useFormContext();

  const [isExporting, setIsExporting] = React.useState(false);
  const componentRef = React.useRef(null);

  // html-to-image: https://github.com/bubkoo/html-to-image

  // Exporta cada slide como um PNG 1080x1350 e entrega tudo num ZIP. Cada slide
  // sai solto, que e o que o Instagram pede. Vai compactado porque o navegador
  // bloqueia varios downloads disparados em sequencia.
  const handleDownloadPngs = React.useCallback(async () => {
    const atual = componentRef.current as unknown as HTMLElement | null;
    if (!atual) return;

    setIsExporting(true);

    // html-to-image precisa do elemento realmente renderizado na pagina —
    // fora da tela serve, com display:none nao.
    const palco = document.createElement("div");
    palco.style.cssText =
      "position:fixed;left:-100000px;top:0;background:#ffffff;";
    const clone = atual.cloneNode(true) as HTMLElement;
    limparParaExportacao(clone);
    insertFonts(clone);
    clone.style.cssText = "display:flex;flex-direction:column;";
    palco.appendChild(clone);
    document.body.appendChild(palco);

    try {
      const slides = Array.from(
        clone.querySelectorAll<HTMLElement>('[id^="page-base-"]'),
      );
      if (slides.length === 0) {
        console.error("[carrossel] nenhum slide encontrado para exportar");
        return;
      }

      const nomeBase = String(watch("filename") || "carousel").replace(
        /\.(zip|pdf)$/i,
        "",
      );
      const zip = new JSZip();

      // Renderiza os slides em paralelo: cada slide e independente, e o custo
      // e dominado pela espera (decodificar imagens, rasterizar), nao pela CPU.
      // Em serie, 12 slides levavam dezenas de segundos sem motivo.
      const blobs = await Promise.all(
        slides.map((slide) => renderSlideParaPng(slide)),
      );

      let dentro = 0;
      for (let i = 0; i < blobs.length; i++) {
        const blob = blobs[i];
        if (!blob) continue;
        dentro += 1;
        zip.file(`${nomeBase}-${String(dentro).padStart(2, "0")}.png`, blob);
      }

      if (dentro === 0) {
        console.error("[carrossel] nenhum slide pode ser convertido em imagem");
        return;
      }

      const conteudo = await zip.generateAsync({ type: "blob" });
      baixarArquivo(conteudo, `${nomeBase}.zip`);
    } catch (e) {
      console.error("[carrossel] falha ao exportar os PNGs:", e);
    } finally {
      palco.remove();
      setIsExporting(false);
    }
  }, [componentRef, watch]);

  return {
    componentRef,
    handleDownloadPngs,
    isExporting,
  };
}

/** Limpeza comum as duas exportacoes: tira a interface do editor do clone. */
function limparParaExportacao(clone: HTMLElement) {
  proxyImgSources(clone);
  removeSelectionStyleById(clone, "page-base-");
  removeSelectionStyleById(clone, "content-image-");
  removePaddingStyleById(clone, "carousel-item-");
  removeStyleById(clone, "slide-wrapper-", "px-2");
  removeAllById(clone, "add-slide-");
  removeAllById(clone, "add-element-");
  removeAllById(clone, "element-menubar-");
  removeAllById(clone, "slide-menubar-");
}

/** Converte um slide em PNG 1080x1350. Devolve null se a imagem nao sair. */
async function renderSlideParaPng(slide: HTMLElement): Promise<Blob | null> {
  try {
    // Nao passar uma cor fixa aqui: o html-to-image escreve a cor recebida no
    // proprio elemento raiz, sobrescrevendo o fundo do slide. Com um branco
    // fixo, todo slide saia branco no PNG — inclusive os de fundo escuro.
    const fundoDoSlide =
      getComputedStyle(slide).backgroundColor || "#ffffff";

    const canvas = await toCanvas(slide, {
      width: SIZE.width,
      height: SIZE.height,
      canvasWidth: INTROSPECCAO.width,
      canvasHeight: INTROSPECCAO.height,
      // Sem isto o html-to-image multiplica de novo pelo devicePixelRatio e o
      // PNG sai maior que o alvo.
      pixelRatio: 1,
      backgroundColor: fundoDoSlide,
    });
    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
  } catch (e) {
    console.error("[carrossel] falha ao converter um slide em PNG:", e);
    return null;
  }
}

function baixarArquivo(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function proxyImgSources(html: HTMLElement) {
  // @ts-ignore
  const images = Array.from(
    html.getElementsByTagName("img")
  ) as HTMLImageElement[];
  const url = process.env.NEXT_PUBLIC_APP_URL;

  const externalImages = images.filter(
    (image) => !image.src.startsWith("/") && !image.src.startsWith("data:")
  );

  // TODO: Make a single request with the list of images
  externalImages.forEach((image) => {
    const apiRequestURL = new URL(`${url}/api/proxy`);
    apiRequestURL.searchParams.set("url", image.src);
    // TODO: Consider using the cache of fetch
    image.src = apiRequestURL.toString();
  });
}

function removeAllById(html: HTMLElement, id: string) {
  const elements = Array.from(
    html.querySelectorAll(`[id^=${id}]`)
  ) as HTMLDivElement[];

  elements.forEach((element) => {
    element.remove();
  });
}

function removePaddingStyleById(html: HTMLElement, id: string) {
  const classNames = "pl-2 md:pl-4";
  removeStyleById(html, id, classNames);
}

function removeSelectionStyleById(html: HTMLElement, id: string) {
  const classNames = "outline-input ring-2 ring-offset-2 ring-ring";
  removeStyleById(html, id, classNames);
}

function removeStyleById(html: HTMLElement, id: string, classNames: string) {
  const elements = Array.from(
    html.querySelectorAll(`[id^=${id}]`)
  ) as HTMLDivElement[];
  elements.forEach((element) => {
    element.className = removeClassnames(element, classNames);
  });
}

function removeClassnames(element: HTMLDivElement, classNames: string): string {
  return element.className
    .split(" ")
    .filter((el) => !classNames.split(" ").includes(el))
    .join(" ");
}

function insertFonts(element: HTMLElement) {
  // Get all elements in the document
  const allElements = Array.from(
    element.getElementsByTagName(`textarea`)
  ) as HTMLTextAreaElement[];

  // Iterate through each element
  allElements.forEach(function (element) {
    let tailwindFonts = element.className
      .split(" ")
      .filter((cn) => cn.startsWith("font-"));

    // Get the computed style of the element
    tailwindFonts.forEach((font) => {
      const fontFaceValue = getComputedStyle(
        element.ownerDocument.body
      ).getPropertyValue("--" + font); // Font var name convention is starts with `--font`
      if (fontFaceValue) {
        element.style.fontFamily = fontFaceValue;
      }
    });
  });
}
