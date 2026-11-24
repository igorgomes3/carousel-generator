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
import {
  esqueleto,
  formatoPorId,
  nichoPorId,
  sugerirFormatoDoTema,
  vocabularioDoNicho,
  type Formato,
  type PassoDoArco,
} from "@/lib/estudio/formatos";

export type Tom = "direto" | "didatico" | "provocativo" | "acolhedor";
export type FuncaoSlide = "gancho" | "contexto" | "desenvolvimento" | "virada" | "cta";

/**
 * Normaliza a função de um slide, com fallback posicional.
 *
 * Por que posicional: quando o prompt entrega o roteiro pronto (formato × número
 * de slides), o modelo às vezes omite o campo `funcao` — ele já recebeu a função,
 * então não repete. Recusar a etapa por isso derrubava o pipeline inteiro por um
 * campo que o próprio pedido já determinava. Posição 1 é gancho, a última é CTA,
 * o resto é desenvolvimento.
 */
export function normalizarFuncao(valor: unknown, indice: number, total: number): FuncaoSlide {
  const s = String(valor ?? "").toLowerCase();
  if (s.includes("ganch") || s.includes("abert") || s.includes("hook")) return "gancho";
  if (s.includes("cta") || s.includes("chamada") || s.includes("acao") || s.includes("ação")) return "cta";
  if (s.includes("virad") || s.includes("insight") || s.includes("revela")) return "virada";
  if (s.includes("context") || s.includes("problema") || s.includes("dado")) return "contexto";
  if (s.trim()) return "desenvolvimento";
  if (indice === 0) return "gancho";
  if (indice === total - 1) return "cta";
  return "desenvolvimento";
}

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
  /**
   * O texto do primeiro slide, decidido aqui e não na etapa de copy.
   *
   * Por que na etapa 1: o gancho é consequência do ângulo, não da redação. Quando
   * ele fica para a etapa 3, o modelo já tem dez slides para escrever e escreve o
   * gancho como resumo do assunto ("fidelize seus clientes") — que é exatamente o
   * hook que não faz ninguém arrastar. Decidido junto com o ângulo, ele nasce
   * específico e a copy só precisa não estragar.
   *
   * Opcional de propósito: um campo obrigatório a mais é mais um ponto de falha
   * de schema, e schema que falha derruba o pipeline inteiro.
   */
  gancho: z
    .string()
    .optional()
    .transform((v) => (v ?? "").trim())
    .describe("O texto do slide 1: afirmação de 6 a 12 palavras, específica"),
  /**
   * Três candidatos de gancho, de padrões diferentes.
   *
   * Por que três: um único gancho é uma amostra de tamanho 1 do gosto do modelo.
   * Com três, a escolha passa a ser feita em código, por regra determinística
   * (`escolherGancho`), e não pela ordem em que o modelo escreveu. Custa zero
   * chamada extra — vem na mesma resposta.
   */
  ganchos: z
    .array(
      // O modelo devolve ora string, ora objeto ({padrao: "...", texto: "..."}).
      // Recusar o objeto derrubava a etapa 1 inteira por um detalhe de forma —
      // então qualquer formato é aceito e o texto é extraído do primeiro campo
      // textual que existir.
      z.union([z.string(), z.record(z.unknown())]).transform((v): string => {
        if (typeof v === "string") return v.trim();
        for (const chave of ["texto", "gancho", "hook", "text", "frase", "valor"]) {
          const x = v[chave];
          if (typeof x === "string" && x.trim()) return x.trim();
        }
        return Object.values(v).find((x): x is string => typeof x === "string")?.trim() ?? "";
      }),
    )
    .optional()
    .transform((v) => (v ?? []).filter(Boolean))
    .optional()
    .describe("Três candidatos de gancho, cada um num padrão diferente"),
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
        // Opcional: quando o roteiro já vem pronto no prompt, o modelo costuma
        // omitir a função. O normalizador resolve pelo nome ou pela posição.
        funcao: z.string().optional().describe("O trabalho deste slide no arco"),
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
    //
    // E resolve o elemento por função: um slide de gancho precisa de título com
    // subtítulo; o resto precisa de título com descrição. Deixar isso a cargo do
    // modelo produzia carrossel de títulos soltos.
    //
    // A virada era "subtitulo+descricao" (sem título). Isso brigava com a regra
    // de que todo slide tem título e fazia a virada parecer slide quebrado no
    // meio de uma lista — revisão do critic, 22/11. Agora ela também tem título.
    .transform((slides) =>
      slides.map((s, i) => {
        const funcao = normalizarFuncao(s.funcao, i, slides.length);
        const derivado: ElementoSugerido =
          funcao === "gancho" ? "titulo+subtitulo" : "titulo+descricao";
        // Só mantém a sugestão do modelo quando ela traz mais de um elemento.
        const dele = s.elemento_sugerido ?? "titulo";
        return {
          ...s,
          posicao: i + 1,
          funcao,
          elemento_sugerido: dele === "titulo" ? derivado : dele,
        };
      }),
    ),
});

/** Etapa 4 — direção visual. Ligada ao briefing, não solta. */
export const CriativoSchema = z.object({
  paleta_sugerida: z
    .string()
    .optional()
    .transform((v) => (v ?? "livre").trim() || "livre")
    .describe("Nome de uma paleta disponível ou 'livre'"),
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
  // O modelo às vezes devolve {"janela": "...", "motivo": "..."}: aceitar e juntar
  // evita perder a etapa inteira por formato.
  melhor_horario: z
    .union([z.string(), z.record(z.unknown())])
    .transform((v) => {
      if (typeof v === "string") return v.trim();
      return Object.values(v)
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .join(" — ");
    })
    .describe("Janela sugerida e o motivo em uma frase"),
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
  /** Nicho escolhido na tela (id de `lib/estudio/formatos`). */
  nicho?: string;
  /** Formato escolhido na tela (id de `lib/estudio/formatos`). */
  formato?: string;
}

/**
 * Qual formato o carrossel vai seguir, em ordem de decisão:
 *   1. o que o usuário escolheu na tela;
 *   2. o formato que o próprio tema pede ("5 erros" é lista, "como fazer" é passo
 *      a passo) — heurística determinística, sem chamada de modelo;
 *   3. "Lista numerada".
 *
 * A ordem mudou depois da revisão do critic: antes o default era "o formato de
 * melhor mediana do nicho", o que faria a maioria dos carrosséis sair em cheat
 * sheet (o melhor medido) mesmo quando o tema não pedia tabela. O tema manda mais
 * que a média do nicho.
 */
export function resolverFormato(b: Briefing): Formato | null {
  const explicito = formatoPorId(b.formato);
  if (explicito) return explicito;

  return formatoPorId(sugerirFormatoDoTema(b.tema)) ?? formatoPorId("lista");
}

function cliente(): OpenAI {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
    maxRetries: 1,
  });
}

/**
 * Nome do modelo lido a cada chamada, não no import.
 *
 * Era `const MODELO = process.env.OPENAI_MODEL` no topo: o valor congelava no
 * primeiro import e trocar o modelo pelo painel do administrador não valia nada
 * até reiniciar o processo. Configuração de produto não pode depender de ordem
 * de import.
 */
function modeloDeTexto(): string {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

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
    model: modeloDeTexto(),
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

/**
 * Regras do primeiro slide.
 *
 * Os números vêm da análise de 18.215 carrosséis do topcarousels.com
 * (22/11/2026), que compara cada post com a média do próprio criador. Duas
 * ressalvas honestas sobre eles:
 *
 *   1. A medida de palavras foi feita em carrosséis majoritariamente em inglês.
 *      Português ocupa mais palavras para dizer o mesmo, então a faixa de 6 a 10
 *      palavras do estudo vira "6 a 12 no título" aqui, com teto de 14 no total.
 *      Isso é adaptação nossa, e está escrito em docs/conteudo/FORMATOS-CARROSSEL.md.
 *   2. A diferença entre caixa alta e caixa normal (22,5% contra 23,1%) é ruído
 *      estatístico. A proibição de caixa alta continua, mas como regra de
 *      desenho — não como se fosse dado.
 */
const regrasDoGancho = (formato: Formato | null): string => `
REGRAS DO PRIMEIRO SLIDE (a taxa entre parênteses é medida em 18.215 carrosséis, não é estilo)
- ${
    formato?.permitePerguntaNoPrimeiroSlide
      ? `Este formato é a exceção: a capa pode ser a pergunta do jogo ("Qual é o seu tipo de pele?"), porque o leitor precisa chegar ao fim para ver a resposta.`
      : `É uma AFIRMAÇÃO, nunca pergunta (afirmação dobraram 23,2%, pergunta 19,5%).`
  }
- Título do slide 1 com 6 a 12 palavras. Título + subtítulo juntos, no máximo 14 — acima de 15 o estudo mostra queda (20,1% contra 25,3% na melhor faixa).
- Sem caixa alta.
- Nomeie o erro, a cena ou o inimigo concreto. NUNCA nomeie o serviço, o preço ou a promoção.
- Número só quando for verdade do negócio. Sem número real, escreva sem número.
- Use o vocabulário do nicho (abaixo) para a frase ser de uma clínica e não de qualquer negócio.
- Quem lê tem de reconhecer a própria situação. Se a frase serve para qualquer clínica do Brasil, ela não serve.`;

/** O que saiu errado num teste real, com a reescrita ao lado. */
const ANTI_EXEMPLO = `O QUE NÃO FAZER (saiu num teste real e ninguém arrastaria)
RUIM: "Dia 1º, agenda vazia / Promoção no grupo depois de um mês de elogios / Arrasta pro lado"
BOM:  "Ela fez 3 das 10 sessões e parou de responder no WhatsApp"
Por que o ruim falha: fala do serviço e não da cliente; promete promoção em vez de conteúdo;
manda arrastar em vez de dar motivo; são três frases que não se completam; 17 palavras.
O bom tem 13 palavras, uma cena que a dona de clínica reconhece, e nenhuma promessa.`;

/** Vocabulário concreto do nicho: substantivo do mundo real, não estatística. */
function blocoDoVocabulario(nichoId: string | undefined): string {
  const palavras = vocabularioDoNicho(nichoId);
  if (!palavras.length) return "";
  return `VOCABULÁRIO DESTE NICHO (use pelo menos um por slide; são cenas, não dados)
${palavras.map((p) => `- ${p}`).join("\n")}`;
}

/** Descrição do formato escolhido, para as etapas que escrevem. */
function blocoDoFormato(formato: Formato | null): string {
  if (!formato) return "";
  return `FORMATO: ${formato.nome} (estrutura validada — segue a ordem, não invente outra)
${formato.estrutura.map((l) => `- ${l}`).join("\n")}
Como o gancho deste formato funciona: ${formato.hookFunciona}
Limite deste formato: ${formato.limite}`;
}

/** Palavras que denunciam hook de anúncio e não de conteúdo. */
const GANCHO_PROIBIDO = [
  "arraste",
  "arrasta",
  "deslize",
  "confira",
  "descubra",
  "você sabia",
  "clique",
  "link na bio",
  "promoção",
  "promocao",
  "imperdível",
];

/**
 * Escolhe qual dos ganchos candidatos vai para o slide 1.
 *
 * Por que em código e não "confie no modelo": pedir três candidatos e deixar o
 * modelo escolher é pedir para ele escolher o mais fácil, que costuma ser o mais
 * genérico. O filtro aqui é determinístico, testável e não custa chamada nova —
 * os três candidatos vêm na mesma resposta da etapa 1.
 *
 * Se todos forem reprovados, devolve o primeiro: um gancho imperfeito é melhor
 * que carrossel sem capa.
 */
export function escolherGancho(candidatos: string[], formato: Formato | null): string {
  const limpos = candidatos
    .map((c) => c.replace(/\s+/g, " ").trim())
    // O modelo às vezes devolve o NOME do padrão em vez da frase ("número +
    // substantivo", "cena concreta"). Isso não é gancho e não pode ganhar a
    // escolha: o filtro descarta o que parece rótulo.
    .filter((c) => c.length > 12 && !c.includes("+"))
    .filter((c) => !/^(n[úu]mero|cena|corre[çc][ãa]o|frase|hook|gancho)\b/i.test(c));

  if (!limpos.length) return "";

  const aprovados = limpos.filter((c) => {
    const minusculo = c.toLowerCase();
    if (GANCHO_PROIBIDO.some((p) => minusculo.includes(p))) return false;
    if (!formato?.permitePerguntaNoPrimeiroSlide && minusculo.includes("?")) return false;
    // Teto duro de 18: em pt-BR um gancho com número + explicação passa de 14 com
    // facilidade ("5 erros que fazem você parar na terceira sessão — nenhum deles é
    // o preço" tem 16). Cortar em 14 reprovava justamente os melhores.
    if (c.split(/\s+/).length > 18) return false;
    return true;
  });

  const pool = aprovados.length ? aprovados : limpos;

  const nota = (c: string): number => {
    const minusculo = c.toLowerCase();
    let n = 0;
    if (/\d/.test(c)) n += 2; // número é promessa contável
    // Alinhamento com o formato (ponto 4 do critic): uma lista numerada precisa de
    // capa que prometa uma contagem, não de uma opinião solta.
    if (formato?.id === "lista" && /\d/.test(c)) n += 4;
    if (formato?.id === "passo-a-passo" && /^(como|o que fazer|passo)/i.test(minusculo)) n += 2;
    if (/\b(erro|erros|sinal|sinais|motivo|motivos|coisa|coisas|forma|formas|maneira|passo|passos)\b/.test(minusculo)) n += 2;
    if (/\b(não|nunca|ninguém|para de|deixe de)\b/.test(minusculo)) n += 2; // tensão por negação
    const tamanho = c.split(/\s+/).length;
    if (tamanho <= 12) n += 1; // cabe no teto sem esticar
    if (tamanho > 14) n -= 2; // passa do que a capa aguenta: perde pontos
    if (/\b(vamos|juntos|jornada|potencialize|eleve|mergulhe)\b/.test(minusculo)) n -= 3;
    if (/\b(cliente|clínica|paciente|sessão|agenda|whatsapp|procedimento|orçamento)\b/.test(minusculo)) n += 2;
    // Cena vale mais que aforismo. "Ela desmarcou a quarta e nunca mais respondeu"
    // faz a leitora se reconhecer; "O resultado não termina quando você sai da
    // clínica" é bonito e abstrato. O tempo verbal passado com ação é o marcador
    // mais barato de cena que existe.
    if (/\b(fez|fiz|desmarcou|sumiu|parou|mandou|respondeu|chegou|marcou|pagou|disse|contou|voltou|desapareceu)\b/.test(minusculo)) n += 3;
    if (/^(o resultado|a verdade|o segredo|a chave|o problema é|a diferença)/.test(minusculo)) n -= 2;
    return n;
  };

  return pool.reduce((melhor, atual) => (nota(atual) > nota(melhor) ? atual : melhor), pool[0]!);
}

/** Exemplos de padrão do formato: mostram a forma do hook, não o conteúdo. */
function blocoDosPadroes(formato: Formato | null): string {
  if (!formato) return "";
  return `PADRÕES DE GANCHO QUE FUNCIONAM NESTE FORMATO (a forma, não o texto — troque pelo mundo da cliente)
${formato.padroes.map((p, i) => `${i + 1}. ${p}`).join("\n")}`;
}

/**
 * O prompt da etapa 1, isolado para poder ser testado sem chamar modelo.
 *
 * É aqui que o gancho é escrito — três candidatos, escolhidos depois em código.
 * Por isso este prompt é o dono de todas as regras de gancho, do anti-exemplo e
 * dos padrões do formato.
 */
export function promptDaIdeia(b: Briefing): { sistema: string; usuario: string } {
  const formato = resolverFormato(b);
  const nicho = nichoPorId(b.nicho);

  return {
    sistema: `Você é estrategista de conteúdo para negócios locais brasileiros.

Antes de escrever qualquer coisa, decida o ÂNGULO. Um carrossel sem ângulo é
uma lista de obviedades que ninguém salva.

AUDIÊNCIA — leia com atenção antes de escolher "publico":
- Quem PUBLICA é o negócio que usa este app (a clínica, o salão, a loja).
- "publico" é QUEM LÊ o carrossel: o seguidor desse negócio, ou seja, o cliente
  final dele. Se o tema diz "como fidelizar meus clientes", o leitor é a cliente
  da clínica, não outro dono de clínica. Errar isso entrega um texto de consultoria
  para quem queria conteúdo para as próprias clientes.

Regras:
- "dor" precisa ser concreta e reconhecível. "Falta de clientes" é vago;
  "depende de indicação e o mês fecha no aperto" é concreto.
- "angulo" precisa ser um recorte que um concorrente não escolheria.
- "promessa" é o que o leitor ganha, não o que o produto faz.
- "ganchos": TRÊS candidatos de primeiro slide, cada um num padrão diferente
  (número + substantivo; cena concreta; correção de crença), seguindo as regras
  abaixo. A escolha final é feita em código — escreva os três com o mesmo cuidado.
- Cena vale mais que frase de efeito. "Ela desmarcou a quarta e não respondeu mais"
  faz a leitora se reconhecer; "O resultado não termina quando você sai da clínica"
  é bonito e não prende ninguém. Prefira o fato com lugar e hora à máxima.
- "gancho": repita aqui o seu preferido entre os três.
- Português do Brasil. Sem jargão de marketing.

${regrasDoGancho(formato)}

${ANTI_EXEMPLO}

${blocoDosPadroes(formato)}

${blocoDoFormato(formato)}

${blocoDoVocabulario(b.nicho)}

Responda só o JSON do schema.`,
    usuario: `Tema: ${b.tema}
${nicho ? `Nicho: ${nicho.nome}` : ""}
${b.publico ? `Público: ${b.publico}` : "Público: decida você com base no tema."}
${b.tom ? `Tom desejado: ${b.tom}` : "Tom: decida você."}
Slides disponíveis: ${b.slides}`,
  };
}

/** Etapa 1 — o ângulo e o gancho. */
export async function gerarIdeia(b: Briefing): Promise<Ideia | null> {
  const formato = resolverFormato(b);
  const { sistema, usuario } = promptDaIdeia(b);

  const ideia = await etapa(IdeiaSchema, sistema, usuario, "ideia");

  if (!ideia) return null;
  // O gancho que vale é o escolhido deterministicamente, não o que o modelo
  // declarou preferir (os dois costumam ser diferentes, e o do modelo é mais genérico).
  const escolhido = escolherGancho([...(ideia.ganchos ?? []), ideia.gancho], formato);
  return { ...ideia, gancho: escolhido || ideia.gancho };
}

/**
 * Reencaixa as ideias do modelo no arco do formato.
 *
 * Por que isto existe: o formato precisa mandar no arco. Se o modelo devolve 5
 * slides para um pedido de 8, aceitar o arco dele é aceitar que o formato virou
 * decoração — o gancho deixa de ser o slide 1 e o CTA some do fim. Aqui a função
 * de cada slide vem do esqueleto do formato e só a ideia vem do modelo.
 *
 * Reancoragem (revisão do critic): as pontas são fixas. A ideia que o modelo
 * escreveu como gancho só pode ocupar a posição 1, e a que ele escreveu como CTA
 * só a última — antes, um remapeamento ingênuo por índice podia levar a conclusão
 * do carrossel para um slide de desenvolvimento no meio.
 */
export function ajustarAoEsqueleto(
  slides: Plano["slides"],
  alvo: PassoDoArco[],
): Plano["slides"] {
  const ultima = alvo.length - 1;
  const doMeio = slides.filter(
    (s, i) => i > 0 && i < slides.length - 1 && s.funcao !== "gancho" && s.funcao !== "cta",
  );
  const ctaDoModelo = [...slides].reverse().find((s) => s.funcao === "cta");
  let cursorMeio = 0;

  return alvo.map((passo, i) => {
    let ideia: string | undefined;

    if (i === 0) {
      ideia = slides[0]?.funcao === "cta" ? undefined : slides[0]?.ideia;
    } else if (i === ultima) {
      ideia = ctaDoModelo?.ideia ?? slides[slides.length - 1]?.ideia;
    } else {
      ideia = doMeio[cursorMeio]?.ideia;
      cursorMeio += 1;
    }

    return {
      posicao: i + 1,
      funcao: passo.funcao,
      ideia: (ideia ?? passo.papel).trim() || passo.papel,
      elemento_sugerido: i === 0 ? "titulo+subtitulo" : "titulo+descricao",
    };
  });
}

/** Etapa 2 — o plano. Barato, e evita refazer 10 slides. */
export async function gerarPlano(b: Briefing, ideia: Ideia): Promise<Plano | null> {
  const formato = resolverFormato(b);
  const arco = formato ? esqueleto(formato, b.slides) : null;
  const roteiro = arco
    ? arco.map((p, i) => `  ${i + 1}. [${p.funcao}] ${p.papel}`).join("\n")
    : null;

  const plano = await etapa(
    PlanoSchema,
    `Você estrutura carrosséis para Instagram.

Recebe um ângulo e devolve o ESQUELETO: o que cada slide faz no arco, antes de
qualquer texto ser escrito.

${formato ? blocoDoFormato(formato) : ""}

Regras do arco:
- Slide 1 é sempre "gancho": para o dedo de quem está rolando.
- O último é sempre "cta": uma ação clara, não três.
- No meio precisa existir uma "virada" quando o formato pede — o momento em que o
  conteúdo deixa de ser o óbvio e passa a ser útil.
- Uma ideia por slide. Se a ideia precisa de duas frases para caber, ela é
  dois slides.
- Exatamente ${b.slides} slides.

Responda só o JSON do schema.`,
    `Ângulo:
${JSON.stringify(ideia, null, 2)}

Tema original: ${b.tema}

${roteiro ? `ROTEIRO OBRIGATÓRIO (${b.slides} slides, nesta ordem — preencha a ideia de cada um)\n${roteiro}` : ""}`,
    "plano",
  );

  if (!plano) return null;
  // O arco do formato manda; a ideia do modelo é preservada por posição.
  if (arco && plano.slides.length !== arco.length) {
    return { slides: ajustarAoEsqueleto(plano.slides, arco) };
  }
  return plano;
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
 * Prompt de emergência para quando o pipeline de etapas falha (o passo 2 costuma
 * ser o que cai). Antes a rota caía numa chamada totalmente genérica e o
 * resultado era o carrossel sem formato e sem gancho. Aqui o formato e as regras
 * do primeiro slide continuam valendo, mesmo sem plano.
 */
export function promptDeEmergencia(b: Briefing): string {
  const formato = resolverFormato(b);
  return `Crie um carrossel de ${Math.min(10, Math.max(5, b.slides))} slides${formato ? ` no formato "${formato.nome}"` : ""} sobre: ${b.tema}

${formato ? `${blocoDoFormato(formato)}\n\n` : ""}${regrasDoGancho(formato)}

${ANTI_EXEMPLO}

${blocoDoVocabulario(b.nicho)}

REGRAS DE ESCRITA
- Todo slide tem título E um corpo de texto: no miolo, pelo menos 12 palavras.
- Slide 1: título de 6 a 12 palavras e um subtítulo curto. Título + subtítulo, no máximo 14.
- Slide 2 entrega o primeiro exemplo concreto; nada de aquecimento.
- Uma ideia por slide. Sem emoji. Português do Brasil com acentuação.
- Não invente número, pesquisa ou depoimento.
- Último slide: uma ação só, com verbo de ação. Não escreva "arraste para o lado".
- Não peça para marcar ou citar cliente/paciente nos comentários (privacidade).`;
}

/**
 * Monta o prompt da etapa 3 (copy) a partir do plano.
 *
 * Revisão do critic (22/11): as regras de criação de gancho moraram aqui antes,
 * e isso era contradição pura — o gancho já vem decidido da etapa 1 e a etapa 3
 * é proibida de reescrevê-lo. Regra de como escrever um gancho ao lado de uma
 * ordem para não mexer no gancho só diluía a instrução. Agora a etapa 3 recebe o
 * gancho pronto e a tarefa de fatiá-lo em título + subtítulo, mais a copy do
 * miolo. As regras de gancho ficam na etapa 1, onde o gancho é escrito.
 */
export function promptDeCopy(b: Briefing, r: ResultadoConteudo): string {
  const formato = resolverFormato(b);
  const nicho = nichoPorId(b.nicho);

  const linhaPorSlide = r.plano.slides
    .map(
      (s) =>
        `  ${s.posicao}. [${s.funcao}] ${s.ideia} → elementos: ${s.elemento_sugerido}`,
    )
    .join("\n");

  const gancho = r.ideia.gancho?.trim();

  return `Crie um carrossel de ${r.plano.slides.length} slides${formato ? ` no formato "${formato.nome}"` : ""}.

ÂNGULO (siga, não reinterprete)
- Público: ${r.ideia.publico}
- Dor: ${r.ideia.dor}
- Promessa: ${r.ideia.promessa}
- Recorte: ${r.ideia.angulo}
- Tom: ${r.ideia.tom}
${nicho ? `- Nicho: ${nicho.nome}` : ""}

${formato ? `${blocoDoFormato(formato)}\n\n` : ""}ESTRUTURA (cada slide já tem uma função — respeite)
${linhaPorSlide}

SLIDE 1 — O GANCHO JÁ ESTÁ ESCRITO
${gancho ? `"${gancho}"` : "Escreva uma afirmação de 6 a 12 palavras, específica e sem promessa."}
- Use esse texto. Não reescreva, não amacie, não troque por resumo do assunto.
- Fatie em TÍTULO (a parte mais forte, até 12 palavras) + SUBTÍTULO (no máximo 6
  palavras, só se sobrar algo). Título + subtítulo juntos, no máximo 14 palavras.
- Se o gancho vier em duas partes separadas por barra ("3 das 10 sessões e você
  parou de ir / O pacote continua pago"), a primeira é o título e a segunda o
  subtítulo. Não reescreva nenhuma das duas.
- NADA ALÉM DO GANCHO. Não acrescente promessa, contagem nem outra frase ao slide 1:
  título + subtítulo juntos somam no máximo 14 palavras, e o slide 1 é só o gancho.
- Sem caixa alta.

SLIDE 2 — SEM AQUECIMENTO
- O segundo slide entrega o primeiro exemplo concreto (cena, número real ou
  situação reconhecível). Contexto genérico aqui perde o leitor que já arrastou.

${blocoDoVocabulario(b.nicho)}

REGRAS DE ESCRITA
- Uma ideia por slide. Não repita o que já foi dito em outro slide.
- Cada slide tem TÍTULO e um corpo de texto com pelo menos 12 palavras no miolo.
  Slide só com título é carrossel vazio e será recusado.
- Título do miolo: no máximo 6 palavras. Descrição: entre 12 e 24 palavras, com o
  detalhe concreto que sustenta o título.
- O leitor precisa aprender algo por slide. Se o slide só repete o anterior com
  outras palavras, ele é enfeite — corte.
- SEM emoji. Nenhum. O visual já carrega a ênfase.
- Português do Brasil com acentuação correta. Erro de acento em imagem não tem conserto.
- Não invente número, pesquisa ou depoimento. Se não tem dado real, escreva sem dado.

CTA DO ÚLTIMO SLIDE
- Uma ação só, com verbo de ação (salve, comente, chame, agende, responda).
- NÃO escreva "arraste para o lado": quem chegou ao último slide já arrastou até ali.
- NÃO peça três coisas ("salve, comente e compartilhe"). Três pedidos = nenhum.
- NÃO peça para marcar, citar ou expor cliente/paciente nos comentários. Em saúde
  isso é problema de privacidade, e o cliente não autorizou aparecer.

${b.tema ? `Contexto original do pedido: ${b.tema}` : ""}`;
}
