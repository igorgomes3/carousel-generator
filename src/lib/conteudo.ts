/**
 * O pipeline de conteúdo: 6 etapas, não um prompt único.
 *
 * Por que não um prompt só: um modelo chamado de uma vez para "gerar um
 * carrossel" produz texto genérico, porque ele tenta decidir assunto,
 * estrutura, copy e revisão ao mesmo tempo. Separar em etapas dá a cada uma um
 * trabalho estreito — e é isso que faz a saída parecer trabalhada em vez de
 * crua.
 *
 * As etapas (batem com o que a proposta vendida chama de Content engine):
 *   1. Ideia       — qual é o ângulo, para quem, qual a promessa
 *   2. Planejamento — estrutura slide a slide, antes de escrever
 *   3. Copy        — o texto de cada slide, a partir do plano
 *   4. Criativo    — direção visual (paleta, ritmo, tipo de imagem)
 *   5. Revisão     — corta excesso, corrige tom, corrige acento
 *   6. Publicação  — legenda, hashtags, ordem
 *
 * As etapas 1 e 2 são baratas e evitam o retrabalho caro da 3: refazer o
 * planejamento custa uma chamada; refazer 10 slides custa dez.
 */

import OpenAI from "openai";
import { z } from "zod";

export type Tom = "direto" | "didatico" | "provocativo" | "acolhedor";
export type FuncaoSlide = "gancho" | "contexto" | "desenvolvimento" | "virada" | "cta";
export type ElementoSugerido =
  | "titulo"
  | "titulo+subtitulo"
  | "titulo+descricao"
  | "subtitulo+descricao";

/** Etapa 1 — o ângulo. Sem isso a copy vira lista de obviedades. */
export const IdeiaSchema = z.object({
  publico: z.string().describe("Quem lê este carrossel, em uma frase concreta"),
  dor: z.string().describe("A dor específica que este conteúdo toca"),
  promessa: z
    .string()
    .describe("O que o leitor leva embora, em uma frase. Não é o produto, é o ganho"),
  angulo: z
    .string()
    .describe("O recorte que torna este conteúdo diferente do óbvio sobre o tema"),
  // O modelo erra este campo com frequência: em vez de escolher do enum, ele
  // escreve uma justificativa ("Direto, de colega para colega..."). Rejeitar a
  // etapa por causa disso derruba o pipeline inteiro por um detalhe de
  // formatação — então o valor é normalizado: procura a palavra-chave dentro
  // do que veio, e cai num default razoável se não achar.
  tom: z
    .string()
    .transform((v): Tom => {
      const s = v.toLowerCase();
      if (s.includes("provoc")) return "provocativo";
      if (s.includes("acolhed")) return "acolhedor";
      if (s.includes("didat") || s.includes("educ")) return "didatico";
      return "direto";
    })
    .describe("Registro da escrita: direto, didatico, provocativo ou acolhedor"),
});

/** Etapa 2 — o esqueleto. Decide o que cada slide faz antes de escrever. */
export const PlanoSchema = z.object({
  slides: z
    .array(
      z.object({
        // O modelo frequentemente omite `posicao`. Ela é derivável do índice —
        // exigir do modelo um número que já sabemos é criar um ponto de falha
        // de graça. O índice manda; o campo só é aceito se vier.
        posicao: z.number().int().min(1).optional(),
        funcao: z
          .string()
          .transform((v): FuncaoSlide => {
            const s = v.toLowerCase();
            if (s.includes("ganch") || s.includes("abert") || s.includes("hook")) return "gancho";
            if (s.includes("cta") || s.includes("chamada") || s.includes("acao")) return "cta";
            if (s.includes("virad") || s.includes("insight") || s.includes("revela")) return "virada";
            if (s.includes("context") || s.includes("problema") || s.includes("dado")) return "contexto";
            return "desenvolvimento";
          })
          .describe("O trabalho deste slide no arco"),
        ideia: z.string().describe("A ideia única deste slide, em uma frase"),
        // Também normalizado e OPCIONAL: o modelo às vezes usa outro nome
        // ("elementos", "elementos_sugeridos") ou omite. Sem default isto vira
        // mais um ponto de falha de graça — o campo é sugestão, não contrato.
        elemento_sugerido: z
          .string()
          .optional()
          .transform((v): ElementoSugerido => {
            const s = String(v ?? "").toLowerCase();
            const temSub = s.includes("sub");
            const temDesc = s.includes("descri");
            if (temSub && temDesc) return "subtitulo+descricao";
            if (temSub) return "titulo+subtitulo";
            if (temDesc) return "titulo+descricao";
            return "titulo";
          })
          .describe("Qual combinação de elementos cabe melhor"),
      }),
    )
    .min(3)
    .max(12)
    // Numera pelo índice, sempre. Isso também conserta o caso em que o modelo
    // numera 0-based ou pula números.
    .transform((slides) => slides.map((s, i) => ({ ...s, posicao: i + 1 }))),
});

/** Etapa 4 — direção visual. Ligada ao briefing, não solta. */
export const CriativoSchema = z.object({
  paleta_sugerida: z.string().describe("Nome de uma paleta disponível ou 'livre'"),
  ritmo: z
    .enum(["contido", "equilibrado", "impactante"])
    .describe("Quanta variação visual entre slides"),
  imagem: z
    .enum(["nenhuma", "foto_pessoa", "textura", "formas_geometricas"])
    .describe("Que tipo de imagem sustenta este conteúdo"),
  justificativa: z.string().describe("Por que esta direção serve a este público"),
});

/** Etapa 6 — o que acompanha o carrossel na publicação. */
export const PublicacaoSchema = z.object({
  legenda: z.string().describe("Legenda do post, até 400 caracteres, sem emoji excessivo"),
  hashtags: z.array(z.string()).min(3).max(12),
  melhor_horario: z.string().describe("Janela sugerida e o motivo em uma frase"),
});

export type Ideia = z.infer<typeof IdeiaSchema>;
export type Plano = z.infer<typeof PlanoSchema>;
export type Criativo = z.infer<typeof CriativoSchema>;
export type Publicacao = z.infer<typeof PublicacaoSchema>;

export interface Briefing {
  /** O que o usuário escreveu. Pode ser uma frase solta. */
  tema: string;
  /** Quantos slides ele quer. O plano se adapta. */
  slides: number;
  /** Nicho/público, se ele informou. Vazio = a IA decide na etapa 1. */
  publico?: string;
  /** Tom desejado, se ele informou. */
  tom?: string;
}

function cliente(): OpenAI {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
    maxRetries: 1,
  });
}

const MODELO = process.env.OPENAI_MODEL || "gpt-4o-mini";

/**
 * Chamada de texto estruturado. Devolve null em vez de lançar: uma etapa que
 * falha é reportada a quem chamou, que decide se aborta ou segue sem ela.
 */
async function etapa<T>(
  // ZodType<Saída, Def, Entrada>: um schema com .transform() tem tipo de
  // entrada e de saída diferentes. Tipar só pela saída faz o TypeScript
  // reclamar que a entrada não bate.
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  sistema: string,
  usuario: string,
  nome: string,
): Promise<T | null> {
  const completion = await cliente().chat.completions.create({
    model: MODELO,
    // 0 nas etapas analíticas: queremos a resposta mais provável, não a mais
    // criativa. A criatividade fica concentrada na etapa de copy.
    temperature: 0.2,
    messages: [
      { role: "system", content: sistema },
      { role: "user", content: usuario },
    ],
    response_format: {
      type: "json_object",
    },
  });

  const bruto = completion.choices[0]?.message?.content;
  if (!bruto || !bruto.trim()) {
    console.error(`[conteudo] etapa ${nome}: modelo devolveu vazio`);
    return null;
  }

  // Alguns modelos embrulham o JSON em cerca de markdown mesmo com
  // response_format json_object. Isso não é erro do modelo, é ruído de
  // formatação — tirar a cerca é mais barato que rejeitar a etapa e refazer
  // a chamada.
  const limpo = bruto
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  // O 9Router anexa `data: [DONE]` ao corpo mesmo sem stream:true. O SDK
  // entrega esse sufixo dentro de `content`, e o JSON.parse estoura com
  // "Extra data". Cortar no marcador resolve sem depender do provedor.
  const semMarcador = limpo.split(/\ndata:\s*\[DONE\]/)[0].split(/data:\s*\[DONE\]/)[0].trim();

  let json: unknown;
  try {
    json = JSON.parse(semMarcador);
  } catch (e) {
    console.error(`[conteudo] etapa ${nome}: JSON inválido`, e);
    return null;
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    console.error(`[conteudo] etapa ${nome}: schema não bateu`, parsed.error.issues);
    return null;
  }
  return parsed.data;
}

/** Etapa 1 — o ângulo. */
export async function gerarIdeia(b: Briefing): Promise<Ideia | null> {
  return etapa(
    IdeiaSchema,
    `Você é estrategista de conteúdo para negócios locais brasileiros.

Antes de escrever qualquer coisa, decida o ÂNGULO. Um carrossel sem ângulo é
uma lista de obviedades que ninguém salva.

Regras:
- "dor" precisa ser concreta e reconhecível. "Falta de clientes" é vago;
  "depende de indicação e o mês fecha no aperto" é concreto.
- "angulo" precisa ser um recorte que um concorrente não escolheria.
- "promessa" é o que o leitor ganha, não o que o produto faz.
- Português do Brasil. Sem jargão de marketing.

Responda só o JSON do schema.`,
    `Tema: ${b.tema}
${b.publico ? `Público: ${b.publico}` : "Público: decida você com base no tema."}
${b.tom ? `Tom desejado: ${b.tom}` : "Tom: decida você."}
Slides disponíveis: ${b.slides}`,
    "ideia",
  );
}

/** Etapa 2 — o plano. Barato, e evita refazer 10 slides. */
export async function gerarPlano(b: Briefing, ideia: Ideia): Promise<Plano | null> {
  return etapa(
    PlanoSchema,
    `Você estrutura carrosséis para Instagram.

Recebe um ângulo e devolve o ESQUELETO: o que cada slide faz no arco, antes de
qualquer texto ser escrito.

Regras do arco:
- Slide 1 é sempre "gancho": para o dedo de quem está rolando.
- O último é sempre "cta": uma ação clara, não três.
- No meio precisa existir uma "virada" — o momento em que o conteúdo deixa de
  ser o óbvio e passa a ser útil.
- Uma ideia por slide. Se a ideia precisa de duas frases para caber, ela é
  dois slides.
- Exatamente ${b.slides} slides.

Responda só o JSON do schema.`,
    `Ângulo:
${JSON.stringify(ideia, null, 2)}

Tema original: ${b.tema}`,
    "plano",
  );
}

/** Etapa 4 — direção visual. */
export async function gerarCriativo(
  b: Briefing,
  ideia: Ideia,
  plano: Plano,
): Promise<Criativo | null> {
  return etapa(
    CriativoSchema,
    `Você define direção visual de carrossel para Instagram.

A direção precisa servir ao CONTEÚDO, não enfeitar. Um carrossel de conteúdo
denso pede ritmo contido; um de anúncio pede impacto.

Regras:
- "ritmo" impactante só se o ângulo for provocativo ou o CTA for forte.
- "imagem" nenhuma quando o texto já carrega o peso — foto fraca distrai.
- Justifique em uma frase, sem adjetivo vazio.

Responda só o JSON do schema.`,
    `Ângulo: ${JSON.stringify(ideia)}
Plano: ${JSON.stringify(plano.slides.map((s) => ({ p: s.posicao, f: s.funcao, i: s.ideia })))}`,
    "criativo",
  );
}

/** Etapa 6 — publicação. */
export async function gerarPublicacao(
  b: Briefing,
  ideia: Ideia,
  plano: Plano,
): Promise<Publicacao | null> {
  return etapa(
    PublicacaoSchema,
    `Você escreve a legenda e os metadados de publicação de um carrossel.

Regras:
- A legenda NÃO repete o carrossel. Ela abre uma segunda porta para o mesmo
  assunto, ou faz a pergunta que o carrossel responde.
- Até 400 caracteres. Instagram corta em 125 antes do "mais".
- Hashtags: mistura de amplas e específicas do nicho. Sem hashtag genérica
  tipo #amor #vida.
- "melhor_horario" precisa de motivo, não só hora.

Responda só o JSON do schema.`,
    `Ângulo: ${JSON.stringify(ideia)}
Estrutura: ${JSON.stringify(plano.slides.map((s) => s.ideia))}`,
    "publicacao",
  );
}

export interface ResultadoConteudo {
  ideia: Ideia;
  plano: Plano;
  criativo: Criativo | null;
  publicacao: Publicacao | null;
  /** Etapas que falharam — o chamador decide se aborta. */
  falhas: string[];
}

/**
 * Roda as etapas de estratégia (1, 2, 4, 6) e devolve o material que alimenta
 * a etapa 3 (copy), que vive no gerador de slides.
 *
 * Falha na ideia ou no plano aborta: sem eles a copy não tem em que se apoiar.
 * Falha em criativo ou publicação não aborta — são enriquecimento.
 */
export async function planejarConteudo(b: Briefing): Promise<ResultadoConteudo | null> {
  const ideia = await gerarIdeia(b);
  if (!ideia) {
    console.error("[conteudo] abortado: etapa 'ideia' falhou");
    return null;
  }

  const plano = await gerarPlano(b, ideia);
  if (!plano) {
    console.error("[conteudo] abortado: etapa 'plano' falhou");
    return null;
  }

  const [criativo, publicacao] = await Promise.all([
    gerarCriativo(b, ideia, plano),
    gerarPublicacao(b, ideia, plano),
  ]);

  const falhas: string[] = [];
  if (!criativo) falhas.push("criativo");
  if (!publicacao) falhas.push("publicacao");

  return { ideia, plano, criativo, publicacao, falhas };
}

/**
 * Monta o prompt da etapa 3 (copy) a partir do plano.
 *
 * É este texto que substitui o prompt genérico antigo: em vez de "crie um
 * carrossel sobre X", o modelo recebe o ângulo, a dor, a promessa e a função
 * de cada slide. A diferença na saída é o que faz parecer trabalhado.
 */
export function promptDeCopy(b: Briefing, r: ResultadoConteudo): string {
  const linhaPorSlide = r.plano.slides
    .map(
      (s) =>
        `  ${s.posicao}. [${s.funcao}] ${s.ideia} → elementos: ${s.elemento_sugerido}`,
    )
    .join("\n");

  return `Crie um carrossel de ${r.plano.slides.length} slides.

ÂNGULO (siga, não reinterprete)
- Público: ${r.ideia.publico}
- Dor: ${r.ideia.dor}
- Promessa: ${r.ideia.promessa}
- Recorte: ${r.ideia.angulo}
- Tom: ${r.ideia.tom}

ESTRUTURA (cada slide já tem uma função — respeite)
${linhaPorSlide}

REGRAS DE ESCRITA
- Uma ideia por slide. Não repita o que já foi dito em outro slide.
- Título: no máximo 6 palavras. Curto o bastante para ser lido de relance.
- Descrição: no máximo 20 palavras. Se precisar de mais, o slide está errado.
- SEM emoji. Nenhum. O visual já carrega a ênfase.
- Português do Brasil com acentuação correta. Erro de acento em imagem não tem conserto.
- Não invente número, pesquisa ou depoimento. Se não tem dado real, escreva sem dado.
- O CTA do último slide pede UMA coisa.

${b.tema ? `Contexto original do pedido: ${b.tema}` : ""}`;
}
