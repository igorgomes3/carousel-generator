import OpenAI from "openai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  MultiSlideSchema,
  UnstyledMultiSlideSchema,
} from "@/lib/validation/slide-schema"; // TODO: Keep only the slides for some prompt
import { UnstyledDocumentSchema } from "@/lib/validation/document-schema";
import {
  UnstyledTitleSchema,
  UnstyledDescriptionSchema,
  UnstyledSubtitleSchema,
} from "@/lib/validation/text-schema";

const carouselFunctionSchema = {
  name: "carouselCreator",
  description: "Creates a carousel with multiple slides for a given topic.",
  parameters: zodToJsonSchema(UnstyledDocumentSchema, {
    definitions: {
      UnstyledTitleSchema,
      UnstyledSubtitleSchema,
      UnstyledDescriptionSchema,
    },
  }),
};

export async function generateCarouselSlides(
  topicPrompt: string,
  apiKey: string,
  /** Quando presente, a copy segue o plano em vez de improvisar. */
  promptPlanejado?: string,
): Promise<z.infer<typeof MultiSlideSchema> | null> {
  const model = startModelClient(apiKey);

  // O prompt antigo pedia emoji em todo texto e não tinha planejamento — o
  // resultado saía cru. Quando o planejamento existe, ele manda: o modelo
  // recebe o ângulo e a função de cada slide em vez de "faça um carrossel".
  const instrucoes = promptPlanejado
    ? promptPlanejado
    : `
      Create a Carousel of slides following these rules

      Arguments Schema Instructions:
       - Respect the argument schema and only use the allowed values for element type, which are 'Title', 'Subtitle' and 'Description'.
       - Each slide can use the multiple elements and they can be of different type or not.
       - Respect the 'maxLength' value which is the maximum number of characters in a given field. Write less than 70% of that number.

      Guidelines:
       - Create 8-15 slides.
       - Each slide has 2-3 different elements.
       - Adapt, reorganize and rephrase the content to fit the slides format.
       - SEM emoji. Nenhum.
       - Don't add slide numbers.
       - Description element text should be short.
       - Write in the same language as the topic.
      `;

  const completion = await model.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: instrucoes,
      },
      { role: "user", content: topicPrompt },
    ],
    // API moderna de ferramentas. A antiga (functions/function_call) e ignorada
    // por boa parte dos provedores compativeis com OpenAI: eles respondem com
    // texto puro, finish_reason "stop" e nenhuma chamada.
    tools: [
      {
        type: "function",
        function: {
          name: carouselFunctionSchema.name,
          description: carouselFunctionSchema.description,
          parameters: carouselFunctionSchema.parameters as Record<string, unknown>,
        },
      },
    ],
    tool_choice: {
      type: "function",
      function: { name: carouselFunctionSchema.name },
    },
  });

  const chamada = completion.choices[0]?.message?.tool_calls?.[0];
  if (!chamada || chamada.type !== "function") {
    console.error(
      "[carrossel] o modelo nao chamou a ferramenta. finish_reason:",
      completion.choices[0]?.finish_reason,
    );
    return null;
  }

  let jsonParsed: unknown;
  try {
    jsonParsed = JSON.parse(chamada.function.arguments || "");
  } catch (e) {
    console.error("[carrossel] argumentos da ferramenta nao sao JSON valido:", e);
    return null;
  }

  const unstyledDocumentParseResult = UnstyledDocumentSchema.safeParse(jsonParsed);
  if (unstyledDocumentParseResult.success) {
    return MultiSlideSchema.parse(unstyledDocumentParseResult.data.slides);
  } else {
    console.log("Error in carousel generation schema");
    console.error(unstyledDocumentParseResult.error);
    console.log(jsonParsed);
    return null;
  }
}

/**
 * O gerador roteia pelo endpoint compativel com OpenAI configurado em
 * OPENAI_BASE_URL. Sem essa variavel o SDK usa api.openai.com — o
 * comportamento original do projeto.
 */
function startModelClient(api_key: string) {
  return new OpenAI({
    apiKey: api_key,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
    maxRetries: 1,
  });
}
