"use server";
import { messageRateLimit } from "@/lib/rate-limit";

import { generateCarouselSlides } from "@/lib/langchain";
import {
  planejarConteudo,
  promptDeCopy,
  type ResultadoConteudo,
} from "@/lib/conteudo";
import { headers } from "next/headers";

/**
 * O resultado que a UI recebe.
 *
 * `slides` continua sendo o que o editor consome. O resto é o material de
 * estratégia, que antes não existia: ângulo, plano, direção visual e a
 * publicação. Devolver esse material é o que transforma "gerar" em "planejar e
 * gerar" — o usuário consegue ver por que o carrossel ficou daquele jeito.
 */
export interface ResultadoGeracao {
  slides: NonNullable<Awaited<ReturnType<typeof generateCarouselSlides>>>;
  estrategia: ResultadoConteudo;
}

export async function generateCarouselSlidesAction(
  userPrompt: string,
  opcoes?: { slides?: number; usarPlanejamento?: boolean },
): Promise<ResultadoGeracao | null> {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const ip = headers().get("x-real-ip") ?? "local";
    const rl = await messageRateLimit.limit(ip);

    if (!rl.success) {
      // TODO: Handle returning errors
      return null;
    }
  }

  const numSlides = Math.min(Math.max(opcoes?.slides ?? 7, 3), 10);
  const usarPlanejamento = opcoes?.usarPlanejamento ?? true;

  // Caminho novo: planeja antes de escrever.
  if (usarPlanejamento) {
    const estrategia = await planejarConteudo({
      tema: userPrompt,
      slides: numSlides,
    });

    if (estrategia) {
      const slides = await generateCarouselSlides(
        userPrompt,
        process.env.OPENAI_API_KEY,
        promptDeCopy({ tema: userPrompt, slides: numSlides }, estrategia),
      );

      if (slides) {
        return { slides, estrategia };
      }
      // Planejou mas a copy falhou: cai no caminho direto em vez de devolver
      // nada. Um carrossel sem o material de estratégia ainda é útil.
      console.warn(
        "[conteudo] copy falhou após o planejamento; usando geração direta",
      );
    }
  }

  // Caminho antigo: uma chamada só. Mantido para quando o planejamento falha.
  const slides = await generateCarouselSlides(
    userPrompt,
    process.env.OPENAI_API_KEY,
  );
  if (!slides) return null;

  return {
    slides,
    estrategia: {
      // Sem planejamento, o material de estratégia é vazio por definição —
      // não inventamos um para preencher a tela.
      ideia: {
        publico: "",
        dor: "",
        promessa: "",
        angulo: "",
        tom: "direto",
      },
      plano: { slides: [] },
      criativo: null,
      publicacao: null,
      falhas: ["planejamento"],
    },
  };
}
