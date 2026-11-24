/**
 * `POST /api/autopilot/conversa` — a entrevista em forma de conversa.
 *
 * O formulário funciona, mas quem chega de fora não sabe o que responder em
 * "nicho" e "público": é mais fácil contar o negócio em duas frases e deixar o
 * agente organizar. Esta rota faz exatamente isso, em UMA chamada por mensagem:
 *
 *   entrada  → { mensagens: [{papel, texto}], ... }
 *   saída    → { resposta, briefing, completo }
 *
 * O modelo devolve `{resposta, briefing}` e o briefing é gravado no perfil na
 * mesma requisição — se a pessoa fechar a aba no meio, o que já contou fica
 * salvo. `completo` só vira `true` quando nicho, público e oferta existem; a
 * tela usa isso para liberar o botão de ativar.
 */
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

import { exigirSessao } from "@/lib/auth/supabase-servidor";
import {
  briefingCompleto,
  gravarPerfilDoUsuario,
  lerPerfilDoUsuario,
  normalizarBriefing,
  type Briefing,
} from "@/lib/autopilot/perfil";
import { aplicarConfigIA } from "@/lib/ia/config";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface Mensagem {
  papel: "usuario" | "agente";
  texto: string;
}

const SISTEMA = `Você é o estrategista de conteúdo do Carrossel IA. Conversa com o dono de um
perfil de Instagram para entender o negócio dele e montar um BRIEFING que será usado por um
agente que escreve um carrossel novo todos os dias.

Objetivo da conversa: descobrir, com naturalidade, quatro coisas:
  1. o que ele vende (serviço/produto principal);
  2. para quem vende (público, com o detalhe que separa);
  3. qual oferta resolve qual dor;
  4. como ele fala com esse público (tom).

E cinco opcionais: pilares de conteúdo, @ do perfil.

Regras de conversa:
- UMA pergunta por mensagem, curta, em português do Brasil, sem emoji.
- Nunca repita pergunta cujo campo já esteja preenchido no briefing atual.
- Se a pessoa escrever tudo de uma vez, não insista: organize o que veio e pergunte só o que falta.
- Com o briefing completo, a resposta deve ser um fecho curto ("Pronto, já sei o suficiente") e
  uma sugestão concreta de primeiro post. Não faça mais perguntas.

Responda SEMPRE um JSON:
{"resposta": "o que você diz ao usuário", "briefing": {"nicho": "", "publico": "", "oferta": "", "tom": "", "pilares": [], "instagram": ""}}
- briefing é o estado ATUAL COMPLETO (junte o que já se sabia com o que acabou de ser dito).
- Campo desconhecido fica string vazia (ou lista vazia).
- Não invente informação: se não foi dito, deixe vazio.`;

export async function POST(request: NextRequest) {
  const portao = await exigirSessao(request);
  if (!portao.ok) return portao.resposta;

  const corpo = (await request.json().catch(() => null)) as
    | { mensagens?: Mensagem[] }
    | null;
  const mensagens = (corpo?.mensagens ?? []).filter(
    (m): m is Mensagem =>
      Boolean(m) &&
      (m.papel === "usuario" || m.papel === "agente") &&
      typeof m.texto === "string" &&
      m.texto.trim().length > 0,
  );
  if (mensagens.length === 0) {
    return NextResponse.json({ erro: "Escreva uma mensagem." }, { status: 400 });
  }

  const config = await aplicarConfigIA();
  if (!config.llmApiKey) {
    return NextResponse.json(
      { erro: "A conversa está sem chave de IA. Peça ao administrador para configurar." },
      { status: 503 },
    );
  }

  const perfil = await lerPerfilDoUsuario(portao.sessao);
  const briefingAtual = perfil?.briefing ?? normalizarBriefing({});

  const cliente = new OpenAI({
    apiKey: config.llmApiKey,
    baseURL: config.llmBaseUrl || undefined,
    maxRetries: 1,
  });

  let resposta = "";
  let briefing: Briefing = briefingAtual;

  try {
    const completion = await cliente.chat.completions.create({
      model: config.llmModel,
      temperature: 0.5,
      messages: [
        { role: "system", content: SISTEMA },
        {
          role: "system",
          content: `Briefing atual (não pergunte o que já está aqui): ${JSON.stringify(briefingAtual)}`,
        },
        ...mensagens.slice(-14).map((m) => ({
          role: m.papel === "usuario" ? ("user" as const) : ("assistant" as const),
          content: m.texto,
        })),
      ],
      response_format: { type: "json_object" },
    });

    const bruto = completion.choices[0]?.message?.content?.trim();
    if (!bruto) throw new Error("resposta vazia");
    const dados = JSON.parse(bruto) as { resposta?: unknown; briefing?: unknown };
    resposta = typeof dados.resposta === "string" ? dados.resposta.trim() : "";
    briefing = normalizarBriefing(dados.briefing ?? briefingAtual);
  } catch (erro) {
    console.error("[autopilot] conversa falhou:", erro);
    return NextResponse.json(
      { erro: "Não consegui responder agora. Tente de novo." },
      { status: 502 },
    );
  }

  // Grava mesmo incompleto: conversa longa não pode perder o que já foi dito.
  const gravado = await gravarPerfilDoUsuario(portao.sessao, {
    briefing,
    igHandle: briefing.instagram ?? undefined,
  });

  return NextResponse.json(
    {
      resposta,
      briefing,
      completo: briefingCompleto(briefing),
      salvo: gravado.ok,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
