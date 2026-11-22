/**
 * Normalizador do documento salvo — a rede de segurança de quem abre carrossel
 * antigo.
 *
 * Por que existe: o documento vem do banco com a forma do dia em que foi salvo.
 * Os schemas Zod são rígidos de propósito (é o que impede o editor de gravar
 * lixo), mas usar o schema rígido para LER dado antigo é o defeito: um campo
 * renomeado, uma paleta que saiu do produto ou uma cor em `oklch()` fazem o
 * `safeParse` falhar, e o carrossel inteiro é descartado — o usuário abre a peça
 * dele e encontra o documento em branco. Isso é perda de trabalho silenciosa.
 *
 * A regra aqui: abrir nunca falha e nunca joga conteúdo fora.
 *   - campo inválido do config → cai no padrão, campo por campo;
 *   - slide ou elemento de formato antigo → perde só o campo quebrado, o texto
 *     válido do mesmo slide continua na tela;
 *   - documento irreconhecível (null, string, array) → documento padrão.
 *
 * Paletas: `config.theme.pallette` era o nome da paleta daisyUI (`black`,
 * `olivia`…). O produto não oferece mais paleta (issue #8), mas o campo continua
 * no documento e no schema — é ele que faz um carrossel salvo com tema
 * referenciado abrir sem tocar no texto. As cores de verdade sempre estiveram
 * gravadas em `primary`/`secondary`/`background`, então remover o catálogo de
 * paletas não muda um pixel de carrossel salvo.
 */
import type { z } from "zod";

import { defaultValues } from "@/lib/default-document";
import { DocumentSchema } from "@/lib/validation/document-schema";
import { CommonSlideSchema, ElementSchema } from "@/lib/validation/slide-schema";
import { ImageSchema } from "@/lib/validation/image-schema";
import { fonteConhecida } from "@/lib/fonts-map";

export type DocumentoSalvo = z.infer<typeof DocumentSchema>;

const TEMA_PADRAO = defaultValues.config.theme;
const HEX = /^#[0-9a-fA-F]{6}$/;

function objeto(valor: unknown): Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};
}

function texto(valor: unknown, padrao: string): string {
  return typeof valor === "string" ? valor : padrao;
}

function cor(valor: unknown, padrao: string): string {
  // Cor que não é hex de 6 dígitos não tem como ser pintada pelo editor:
  // `oklch(...)` e `rgba(...)` caem no padrão em vez de virar `undefined`.
  return typeof valor === "string" && HEX.test(valor) ? valor : padrao;
}

function booleano(valor: unknown, padrao: boolean): boolean {
  return typeof valor === "boolean" ? valor : padrao;
}

/**
 * Elemento que não passa no schema: tenta salvar o TEXTO dele.
 *
 * O elemento carrega o texto do usuário; os campos de estilo decorativos (cor
 * escrita à mão em `red`, fonte aposentada, `style` com valor fora do enum) não
 * valem perder o título. Tira o que está inválido, tenta de novo, e só desiste
 * (devolve `null`) quando não sobra nem texto.
 */
function salvarElemento(bruto: unknown): DocumentoSalvo["slides"][0]["elements"][0] | null {
  const direto = ElementSchema.safeParse(bruto);
  if (direto.success) return direto.data;

  const elemento = objeto(bruto);
  if (typeof elemento.text !== "string") return null;

  const minimalista = {
    type: elemento.type,
    text: elemento.text,
    ...(fonteConhecida(elemento.fontFamily) ? { fontFamily: elemento.fontFamily } : {}),
    ...(typeof elemento.color === "string" && HEX.test(elemento.color)
      ? { color: elemento.color }
      : {}),
  };

  const segunda = ElementSchema.safeParse(minimalista);
  return segunda.success ? segunda.data : null;
}

/**
 * Slides: preserva o que der para preservar.
 *
 * O elemento é validado um por um porque é nele que mora o texto do usuário. Um
 * `color: "red"` escrito à mão num documento antigo não pode custar o título do
 * carrossel: cai só o campo, não o slide.
 */
function normalizarSlides(bruto: unknown): DocumentoSalvo["slides"] {
  if (!Array.isArray(bruto) || bruto.length === 0) return defaultValues.slides;

  const slides = bruto.map((item) => {
    const direto = CommonSlideSchema.safeParse(item);
    if (direto.success) return direto.data;

    const slide = objeto(item);
    const elementos = Array.isArray(slide.elements) ? slide.elements : [];
    const validos = elementos
      .map((elemento) => salvarElemento(elemento))
      .flatMap((e) => (e ? [e] : []));
    const fundo = ImageSchema.safeParse(slide.backgroundImage);

    return {
      elements: validos,
      backgroundImage: fundo.success ? fundo.data : defaultValues.slides[0].backgroundImage,
    };
  });

  return slides.length > 0 ? slides : defaultValues.slides;
}

function normalizarConfig(bruto: unknown): DocumentoSalvo["config"] {
  const config = objeto(bruto);
  const padrao = defaultValues.config;

  const tema = objeto(config.theme);
  const fontes = objeto(config.fonts);
  const marca = objeto(config.brand);
  const numeracao = objeto(config.pageNumber);

  const mapaFontes = objeto(fontes.elementFonts);
  const fontesPorElemento = {
    Title: fonteConhecida(mapaFontes.Title) ?? padrao.fonts.elementFonts.Title,
    Subtitle: fonteConhecida(mapaFontes.Subtitle) ?? padrao.fonts.elementFonts.Subtitle,
    Description: fonteConhecida(mapaFontes.Description) ?? padrao.fonts.elementFonts.Description,
  };

  const fundo = ImageSchema.safeParse(tema.backgroundImage);

  return {
    brand: {
      avatar: (() => {
        const avatar = ImageSchema.safeParse(marca.avatar);
        return avatar.success ? avatar.data : padrao.brand.avatar;
      })(),
      name: texto(marca.name, padrao.brand.name),
      handle: texto(marca.handle, padrao.brand.handle),
    },
    theme: {
      primary: cor(tema.primary, TEMA_PADRAO.primary),
      secondary: cor(tema.secondary, TEMA_PADRAO.secondary),
      background: cor(tema.background, TEMA_PADRAO.background),
      isCustom: booleano(tema.isCustom, false),
      // Campo legado: guardado, nunca lido para decidir cor. Fica para o
      // documento não mudar de forma ao ser salvo de novo pelo editor.
      pallette: texto(tema.pallette, TEMA_PADRAO.pallette),
      backgroundStyle: texto(tema.backgroundStyle, TEMA_PADRAO.backgroundStyle),
      ...(fundo.success ? { backgroundImage: fundo.data } : {}),
    },
    fonts: {
      elementFonts: fontesPorElemento,
      font1: fonteConhecida(fontes.font1) ?? padrao.fonts.font1,
      font2: fonteConhecida(fontes.font2) ?? padrao.fonts.font2,
    },
    pageNumber: {
      showNumbers: booleano(numeracao.showNumbers, padrao.pageNumber.showNumbers),
    },
  };
}

/**
 * Recebe o que veio do banco (ou do localStorage antigo) e devolve um documento
 * que o editor consegue desenhar. Nunca lança.
 */
export function normalizarDocumento(bruto: unknown): DocumentoSalvo {
  try {
    const documento = objeto(bruto);
    const candidato = {
      slides: normalizarSlides(documento.slides),
      config: normalizarConfig(documento.config),
      filename: texto(documento.filename, defaultValues.filename),
    };

    const validado = DocumentSchema.safeParse(candidato);
    if (validado.success) return validado.data;

    // Não deveria acontecer: o candidato já nasce no formato do schema. Se
    // acontecer, o documento padrão é melhor que uma tela de erro.
    console.error("[compat] documento normalizado não validou", validado.error.issues);
    return normalizarDocumento(undefined);
  } catch (erro) {
    console.error("[compat] falha ao normalizar documento", erro);
    return {
      slides: defaultValues.slides,
      config: normalizarConfig(undefined),
      filename: defaultValues.filename,
    };
  }
}
