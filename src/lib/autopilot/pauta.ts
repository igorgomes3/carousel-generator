/**
 * A pauta do dia: uma chamada de LLM, curta, antes do pipeline de slides.
 *
 * Por que uma chamada separada em vez de "peça tudo ao pipeline": o pipeline de 6
 * etapas recebe um TEMA. A decisão de qual tema é do dia depende do arquétipo
 * rotativo e do histórico do perfil, e essa decisão precisa ser barata e
 * auditável (fica gravada em `historico_temas`). Uma chamada com
 * `response_format: json_object` devolve `{tema, gancho}` em segundos.
 *
 * Nunca lança: sem pauta, o tick registra falha e tenta amanhã.
 */
import OpenAI from "openai";

import { configEfetiva } from "@/lib/ia/config";
import type { Arquetipo } from "@/lib/autopilot/arquetipos";
import type { Briefing } from "@/lib/autopilot/perfil";

export interface PautaDoDia {
  tema: string;
  gancho: string;
}

export async function gerarPautaDoDia({
  briefing,
  arquetipo,
  historico,
}: {
  briefing: Briefing;
  arquetipo: Arquetipo;
  historico: string[];
}): Promise<PautaDoDia | null> {
  const cfg = await configEfetiva();
  if (!cfg.llmApiKey) return null;

  const cliente = new OpenAI({
    apiKey: cfg.llmApiKey,
    baseURL: cfg.llmBaseUrl || undefined,
    maxRetries: 1,
  });

  const sistema = `Você escolhe a pauta de UM carrossel de Instagram para o perfil descrito.

Regras:
- Um assunto específico, não um tema genérico ("como precificar serviço de social media" é tema; "marketing" é nada).
- Formato de pauta: "${arquetipo.nome}". ${arquetipo.direcao}
- Português do Brasil, sem emoji, sem hashtag no tema.
- O tema precisa servir a quem vende: o post leva o leitor a considerar a oferta.
- PROIBIDO repetir ou parafrasear estes temas já publicados: ${
    historico.length ? historico.slice(0, 15).join(" | ") : "(nenhum ainda)"
  }

Responda só o JSON: {"tema": "...", "gancho": "..."} — gancho é a manchete da capa, no máximo 12 palavras.`;

  const usuario = `Nicho: ${briefing.nicho}
Público: ${briefing.publico}
Oferta: ${briefing.oferta}
Tom de voz: ${briefing.tom || "direto e prático"}
Pilares de conteúdo: ${briefing.pilares.length ? briefing.pilares.join(", ") : "livre"}`;

  try {
    const resposta = await cliente.chat.completions.create({
      model: cfg.llmModel,
      temperature: 0.8,
      messages: [
        { role: "system", content: sistema },
        { role: "user", content: usuario },
      ],
      response_format: { type: "json_object" },
    });

    const bruto = resposta.choices[0]?.message?.content?.trim();
    if (!bruto) return null;

    const dados = JSON.parse(bruto) as { tema?: unknown; gancho?: unknown };
    const tema = typeof dados.tema === "string" ? dados.tema.trim().slice(0, 240) : "";
    const gancho = typeof dados.gancho === "string" ? dados.gancho.trim().slice(0, 160) : "";
    if (tema.length < 8) return null;
    return { tema, gancho };
  } catch (erro) {
    console.error("[autopilot] falha ao gerar pauta:", erro);
    return null;
  }
}
