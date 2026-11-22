type FontInfo = {
  name: string;
  className: string;
};

type FontMap = {
  [fontFamilyName: string]: FontInfo;
};

export const fontsMap: FontMap = {
  DM_Sans: {
    className: "font-dm-sans",
    name: "DM Sans",
  },
  DM_Serif_Display: {
    className: "font-dm-serif-display",
    name: "DM Serif Display",
  },
  GeistSans: {
    className: "font-geist-sans",
    name: "Geist Sans",
  },
  Montserrat: {
    className: "font-montserrat",
    name: "Montserrat",
  },
  PT_Serif: {
    className: "font-pt-serif",
    name: "PT Serif",
  },
  Roboto: {
    className: "font-roboto",
    name: "Roboto",
  },
  Roboto_Condensed: {
    className: "font-roboto-condensed",
    name: "Roboto Condensed",
  },
  Ultra: {
    className: "font-ultra",
    name: "Ultra",
  },
  Inter: {
    className: "font-inter",
    name: "Inter",
  },
  Syne: {
    className: "font-syne",
    name: "Syne",
  },
  ArchivoBlack: {
    className: "font-archivo-black",
    name: "Archivo Black",
  },
};

/**
 * Nome de fonte que existe neste build, ou `null`.
 *
 * Existe porque documento salvo carrega o nome da fonte em texto: se o mapa
 * perder uma entrada (fonte aposentada, carrossel importado de outro produto), o
 * acesso direto a `fontsMap[id].className` estoura com `Cannot read properties of
 * undefined` e o editor inteiro cai. Fonte desconhecida vira `null` e quem chama
 * decide o padrão.
 */
export function fonteConhecida(fontId: unknown): string | null {
  return typeof fontId === "string" && Object.prototype.hasOwnProperty.call(fontsMap, fontId)
    ? fontId
    : null;
}

/**
 * Classe da fonte. Fonte desconhecida devolve string vazia: o slide é desenhado
 * com a fonte herdada, que é feio mas abre — melhor que a tela em branco.
 */
export function fontIdToClassName(fontId: string) {
  const conhecida = fonteConhecida(fontId);
  return conhecida ? fontsMap[conhecida].className : "";
}
