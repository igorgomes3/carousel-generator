/**
 * Geração completa: planeja, escreve, confere e veste o carrossel.
 *
 * Por que existe um lugar só: o editor (server action) e a fila de conteúdo (rota
 * interna) chamavam o pipeline cada um do seu jeito, e as duas versões divergiam.
 * Aqui o caminho é um só, e as garantias valem para os dois:
 *
 *   1. o plano define a função de cada slide, e o elemento de cada slide deriva
 *      da função — não do humor do modelo;
 *   2. a copy é conferida: slide sem corpo de texto é recusado e o modelo é
 *      chamado de novo com a lista de problemas;
 *   3. o documento sai vestido (paleta, fundo, tipografia), não no template.
 */
import { defaultValues } from "@/lib/default-document";
import { designAutomatico } from "@/lib/design-automatico";
import { lintCarrossel } from "@/lib/lint-carrossel";
import { planejarConteudo, promptDeCopy, resolverFormato, type ResultadoConteudo } from "@/lib/conteudo";
import { generateCarouselSlides } from "@/lib/langchain";

/**
 * Força o gancho escolhido na capa do carrossel.
 *
 * Por que em código e não no prompt: o gancho é decidido na etapa 1 e escolhido
 * por filtro determinístico. A etapa de copy recebe ordem de não mexer nele, mas
 * o modelo mexe — num teste real a capa saiu com 35 palavras em volta de um gancho
 * de 11. Instrução em prompt é pedido; reparo em código é garantia. O que o
 * usuário aprova na tela é o mesmo texto que o filtro escolheu.
 *
 * Divide em título + subtítulo: barra ("a / b") ou quebra de frase ("a. b").
 * Sem segunda parte, mantém o subtítulo que veio, cortado em 6 palavras.
 */
export function aplicarGanchoNaCapa<
  T extends { elements?: { type?: string; text?: string }[] },
>(slides: T[], gancho: string): T[] {
  const limpo = gancho.replace(/\s+/g, " ").trim();
  if (!limpo || !slides.length) return slides;

  const partes = limpo.split(/\s+\/\s+|\s+—\s+|(?<=[.!?])\s+/).filter(Boolean);
  const titulo = (partes[0] ?? limpo).trim();
  const subtituloPedaco = partes.length > 1 ? partes.slice(1).join(" ").trim() : "";

  const [capa, ...resto] = slides;
  if (!capa) return slides;

  const elementos = capa.elements ?? [];
  const posTitulo = elementos.findIndex((e) => e.type === "Title");
  const posSubtitulo = elementos.findIndex((e) => e.type === "Subtitle");
  const atualSubtitulo = posSubtitulo >= 0 ? (elementos[posSubtitulo]?.text ?? "") : "";

  const palavras = (t: string) => t.split(/\s+/).filter(Boolean);
  const subtitulo =
    subtituloPedaco ||
    palavras(atualSubtitulo).slice(0, 6).join(" ") ||
    // Último recurso: segunda metade do próprio gancho, para a capa não ficar
    // com um elemento só (o linter exige dois).
    palavras(titulo).slice(Math.ceil(palavras(titulo).length / 2)).join(" ");

  const novos = [...elementos];
  if (posTitulo >= 0) {
    novos[posTitulo] = { ...novos[posTitulo], text: titulo };
  } else {
    novos.unshift({ type: "Title", text: titulo });
  }
  if (posSubtitulo >= 0) {
    novos[posSubtitulo] = { ...novos[posSubtitulo], text: subtitulo };
  } else {
    novos.splice(1, 0, { type: "Subtitle", text: subtitulo });
  }

  return [{ ...capa, elements: novos }, ...resto];
}

export interface DocumentoGerado {
  documento: typeof defaultValues;
  estrategia: ResultadoConteudo;
  /** Nome humano do formato que o carrossel seguiu (ex.: "Lista numerada"). */
  formato: string;
  /** Tentativas de copy usadas: 1 normal, 2 quando a primeira veio vazia. */
  tentativas: number;
  /** Erros de lint que sobraram depois da segunda tentativa, se houver. */
  problemas: string[];
  /** Avisos: não bloqueiam, mas quem publica precisa ver. */
  avisos: string[];
}

const SLIDES_PADRAO = 7;

async function tentar<T>(fn: () => Promise<T | null>, vezes = 2): Promise<T | null> {
  for (let i = 0; i < vezes; i++) {
    const r = await fn();
    if (r) return r;
    if (i < vezes - 1) await new Promise((ok) => setTimeout(ok, 1200));
  }
  return null;
}

export async function gerarDocumentoCompleto(
  tema: string,
  apiKey: string,
  slides = SLIDES_PADRAO,
  /** Nicho e formato escolhidos na tela (ids de `lib/estudio/formatos`). */
  escolha: { nicho?: string; formato?: string } = {},
): Promise<DocumentoGerado | null> {
  const quantidade = Math.min(Math.max(slides, 5), 10);

  const estrategia = await tentar(() =>
    planejarConteudo({ tema, slides: quantidade, ...escolha }),
  );
  if (!estrategia) return null;

  const briefing = { tema, slides: quantidade, ...escolha };
  const prompt = promptDeCopy(briefing, estrategia);

  let copy = await tentar(() => generateCarouselSlides(tema, apiKey, prompt));
  if (!copy) return null;

  let lint = lintCarrossel(copy, { min: 5, max: 10 });
  let problemas = lint.erros;
  let tentativas = 1;

  // Segunda tentativa com a lista de defeitos na mão. O modelo conserta bem
  // quando sabe o que está errado; sem isso ele repete o mesmo formato.
  if (problemas.length) {
    tentativas = 2;
    const correcao = `${prompt}

CORRIJA ESTES PROBLEMAS DA TENTATIVA ANTERIOR
${problemas.map((p) => `- ${p}`).join("\n")}

Regra que não pode falhar: todo slide tem título E um corpo de texto com pelo menos 12 palavras.`;
    const segunda = await tentar(() => generateCarouselSlides(tema, apiKey, correcao), 2);
    if (segunda) {
      const lintSegunda = lintCarrossel(segunda, { min: 5, max: 10 });
      // Fica com a melhor das duas: menos erros vence. Empate fica na primeira,
      // porque a primeira já vinha do plano original.
      if (lintSegunda.erros.length < problemas.length) {
        copy = segunda;
        lint = lintSegunda;
        problemas = lintSegunda.erros;
      }
    }
  }

  /**
   * Reparo determinístico da capa: o gancho que o filtro escolheu é o que vai
   * para o slide 1. Feito depois da segunda tentativa, porque o modelo infla a
   * capa mesmo quando o prompt proíbe — e capa longa é o defeito que o Igor viu
   * no teste dele.
   */
  copy = aplicarGanchoNaCapa(copy, estrategia.ideia.gancho);
  // O lint reportado tem de descrever o que vai ser publicado, não a versão
  // anterior ao reparo.
  lint = lintCarrossel(copy, { min: 5, max: 10 });
  problemas = lint.erros;

  const design = designAutomatico(estrategia.ideia.tom, estrategia.criativo);
  const formato = resolverFormato(briefing);

  return {
    documento: { ...defaultValues, config: design.config, slides: copy },
    estrategia,
    formato: formato?.nome ?? "",
    tentativas,
    problemas,
    avisos: lint.avisos,
  };
}
