/**
 * `POST /api/interno/autopilot/tick` — o job diário, uma pauta por chamada.
 *
 * Chamado pelo timer do sistema (`scripts/autopilot-tick.sh`), nunca pelo
 * navegador: exige `x-cron-secret` igual a `AUTOPILOT_CRON_SECRET`.
 *
 * Por que UMA por chamada: o pipeline leva ~2 min e a VPS tem 3,7 GB de RAM
 * divididos com Traefik/n8n/Supabase de outros produtos. Concorrência aqui não
 * acelera nada — derruba o host. O script chama em loop até `restantes = 0`.
 *
 * Por que SÓ TEXTO: capa por IA consome ~1% da janela de 5h do provedor de
 * imagem. Gerar capa para quem não abriu o post queima cota no lixo; a capa sai
 * quando a pessoa abre o projeto (botão "Gerar imagem por IA" do estúdio).
 *
 * Idempotência: `projetos_autopilot_dia_uidx` (índice único parcial por usuário e
 * `data_referencia`). Rodar o tick duas vezes no mesmo dia não duplica post.
 */
import { NextRequest, NextResponse } from "next/server";

import { arquetipoDoDia } from "@/lib/autopilot/arquetipos";
import { gerarPautaDoDia } from "@/lib/autopilot/pauta";
import {
  listarElegiveis,
  registrarFalha,
  registrarPostNaoAberto,
  registrarSucesso,
} from "@/lib/autopilot/perfil";
import { resolverFormato } from "@/lib/conteudo";
import { gerarDocumentoCompleto } from "@/lib/gerar-documento";
import { criarProjeto } from "@/lib/estudio/armazenamento";
import { slidesDoDocumento } from "@/lib/estudio/do-documento";
import {
  hashtagsDeReserva,
  hashtagsDoBriefing,
  legendaDeReserva,
  normalizarHashtags,
  normalizarLegenda,
} from "@/lib/estudio/publicacao";
import { aplicarConfigIA } from "@/lib/ia/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SLIDES_DO_POST = 6;

/** `YYYY-MM-DD` no fuso de São Paulo — o dia do post é o dia do criador. */
function hojeEmSaoPaulo(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export async function POST(request: NextRequest) {
  const segredo = process.env.AUTOPILOT_CRON_SECRET?.trim();
  const recebido = request.headers.get("x-cron-secret")?.trim();
  if (!segredo || recebido !== segredo) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const config = await aplicarConfigIA();
  if (!config.llmApiKey) {
    return NextResponse.json({ erro: "Sem chave de texto configurada." }, { status: 503 });
  }

  const hoje = hojeEmSaoPaulo();
  const elegiveis = await listarElegiveis(hoje);
  const perfil = elegiveis[0];

  if (!perfil) {
    return NextResponse.json({ hoje, gerados: 0, restantes: 0 });
  }

  const arquetipo = arquetipoDoDia(new Date(), perfil.userId);
  const pauta = await gerarPautaDoDia({
    briefing: perfil.briefing,
    arquetipo,
    historico: perfil.historicoTemas,
  });

  if (!pauta) {
    await registrarFalha(perfil.userId, "não foi possível definir a pauta do dia");
    return NextResponse.json(
      { hoje, gerados: 0, restantes: elegiveis.length - 1, erro: "pauta" },
      { status: 502 },
    );
  }

  const gerado = await gerarDocumentoCompleto(pauta.tema, config.llmApiKey, SLIDES_DO_POST, {
    publico: `${perfil.briefing.publico} — oferta: ${perfil.briefing.oferta}`,
    tom: perfil.briefing.tom || undefined,
  }).catch(() => null);

  if (!gerado) {
    await registrarFalha(perfil.userId, "pipeline de geração não devolveu documento");
    return NextResponse.json(
      { hoje, gerados: 0, restantes: elegiveis.length - 1, erro: "geracao" },
      { status: 502 },
    );
  }

  const slides = slidesDoDocumento(gerado.documento.slides as { elements?: Element[] }[], SLIDES_DO_POST);
  const publicacao = gerado.estrategia.publicacao;
  const legenda = normalizarLegenda(publicacao?.legenda) || legendaDeReserva(slides);
  const hashtagsBrutas = normalizarHashtags(publicacao?.hashtags);
  const doModelo =
    hashtagsBrutas.length > 0
      ? hashtagsBrutas
      : hashtagsDeReserva(resolverFormato({ tema: pauta.tema, slides: SLIDES_DO_POST }));
  // As do briefing entram PRIMEIRO: elas vêm do que a pessoa declarou sobre o
  // próprio negócio, então valem mais que a sugestão do modelo sobre o tema.
  const hashtags = normalizarHashtags([...hashtagsDoBriefing(perfil.briefing), ...doModelo]).slice(0, 12);

  const criado = await criarProjeto(
    null,
    {
      nome: pauta.tema.slice(0, 90),
      templateId: "minimalist",
      tema: pauta.tema,
      slides,
      legenda,
      hashtags,
      melhorHorario: publicacao?.melhor_horario ?? "",
    },
    { paraUsuario: perfil.userId, origem: "autopilot", dataReferencia: hoje },
  );

  if (!criado.ok) {
    // Índice único violado = post do dia já existe: não é falha, é idempotência.
    const jaExistia = /duplicate key|já existe|unique/i.test(criado.motivo);
    if (!jaExistia) await registrarFalha(perfil.userId, criado.motivo);
    return NextResponse.json({
      hoje,
      gerados: 0,
      restantes: elegiveis.length - 1,
      ...(jaExistia ? { jaExistia: true } : { erro: criado.motivo }),
    });
  }

  await registrarSucesso(perfil.userId, pauta.tema, perfil.historicoTemas);
  // Post novo conta como "não aberto" até a pessoa abrir; 3 seguidos pausam o
  // perfil (freio de custo decidido com o critic).
  await registrarPostNaoAberto(perfil.userId, perfil.postsSemAbrir);

  return NextResponse.json({
    hoje,
    gerados: 1,
    restantes: elegiveis.length - 1,
    projeto: criado.projeto.id,
    arquetipo: arquetipo.id,
    tema: pauta.tema,
  });
}

interface Element {
  type?: string;
  text?: string | null;
}
