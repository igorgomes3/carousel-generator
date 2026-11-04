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
import { planejarConteudo, promptDeCopy, type ResultadoConteudo } from "@/lib/conteudo";
import { generateCarouselSlides } from "@/lib/langchain";

export interface DocumentoGerado {
  documento: typeof defaultValues;
  estrategia: ResultadoConteudo;
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
): Promise<DocumentoGerado | null> {
  const quantidade = Math.min(Math.max(slides, 5), 10);

  const estrategia = await tentar(() => planejarConteudo({ tema, slides: quantidade }));
  if (!estrategia) return null;

  const briefing = { tema, slides: quantidade };
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

  const design = designAutomatico(estrategia.ideia.tom, estrategia.criativo);

  return {
    documento: { ...defaultValues, config: design.config, slides: copy },
    estrategia,
    tentativas,
    problemas,
    avisos: lint.avisos,
  };
}
