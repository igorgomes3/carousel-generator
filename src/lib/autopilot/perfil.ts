/**
 * Perfil de automação: quem recebe um post por dia e sobre o quê.
 *
 * Uma linha por usuário (`perfis_automacao`). O cron fala com `service_role`;
 * a tela fala com o token do usuário e a RLS resolve (`auth.uid() = user_id`).
 *
 * Regras que este módulo guarda:
 * - `liberado` NÃO é do usuário. Signup é aberto e autoconfirm, então autopilot
 *   ligado por padrão seria torneira de custo aberta para qualquer bot. Quem
 *   libera é o administrador (ou o cap global em `listarElegiveis`).
 * - `posts_sem_abrir` é o freio de custo: três posts automáticos seguidos sem a
 *   pessoa abrir e o perfil é pausado sozinho.
 */
import type { Sessao } from "@/lib/auth/supabase-servidor";
import { comoServico, comoUsuario } from "@/lib/auth/supabase-servidor";

/** Teto de perfis ativos que o sistema gera por dia (custo). */
export const CAP_ATIVOS = 10;
/** Depois de N posts não abertos, o autopilot pausa sozinho. */
export const LIMITE_SEM_ABRIR = 3;
const HISTORICO_MAX = 20;

export interface Briefing {
  nicho: string;
  publico: string;
  oferta: string;
  tom: string;
  pilares: string[];
  /** @ do perfil, sem `@`. Metadado visual — não é fonte de verdade. */
  instagram?: string;
}

export interface PerfilAutomacao {
  userId: string;
  ativo: boolean;
  liberado: boolean;
  igHandle: string | null;
  briefing: Briefing;
  historicoTemas: string[];
  postsSemAbrir: number;
  ultimaExecucaoEm: string | null;
  ultimoStatus: string | null;
  ultimoErro: string | null;
}

interface LinhaPerfil {
  user_id: string;
  ativo: boolean;
  liberado: boolean;
  ig_handle: string | null;
  briefing: Record<string, unknown> | null;
  historico_temas: unknown;
  posts_sem_abrir: number | null;
  ultima_execucao_em: string | null;
  ultimo_status: string | null;
  ultimo_erro: string | null;
}

const CAMPOS =
  "user_id,ativo,liberado,ig_handle,briefing,historico_temas,posts_sem_abrir,ultima_execucao_em,ultimo_status,ultimo_erro";

/** Só o que a entrevista pergunta — nada de campo que a tela não coleta. */
export function normalizarBriefing(bruto: unknown): Briefing {
  const b = (bruto ?? {}) as Record<string, unknown>;
  const texto = (v: unknown, max = 280) =>
    typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
  const pilares = Array.isArray(b.pilares)
    ? b.pilares
        .filter((p): p is string => typeof p === "string")
        .map((p) => p.trim())
        .filter(Boolean)
        .slice(0, 6)
    : [];
  return {
    nicho: texto(b.nicho, 120),
    publico: texto(b.publico, 200),
    oferta: texto(b.oferta, 200),
    tom: texto(b.tom, 60),
    pilares,
    instagram: texto(b.instagram, 40).replace(/^@+/, "").toLowerCase() || undefined,
  };
}

export function briefingCompleto(b: Briefing): boolean {
  return Boolean(b.nicho && b.publico && b.oferta);
}

function daLinha(linha: LinhaPerfil): PerfilAutomacao {
  return {
    userId: linha.user_id,
    ativo: Boolean(linha.ativo),
    liberado: Boolean(linha.liberado),
    igHandle: linha.ig_handle,
    briefing: normalizarBriefing(linha.briefing),
    historicoTemas: Array.isArray(linha.historico_temas)
      ? linha.historico_temas.filter((t): t is string => typeof t === "string")
      : [],
    postsSemAbrir: Number(linha.posts_sem_abrir ?? 0),
    ultimaExecucaoEm: linha.ultima_execucao_em,
    ultimoStatus: linha.ultimo_status,
    ultimoErro: linha.ultimo_erro,
  };
}

/** Perfil do usuário logado (RLS manda). `null` = ainda não fez a entrevista. */
export async function lerPerfilDoUsuario(sessao: Sessao): Promise<PerfilAutomacao | null> {
  const { ok, dados } = await comoUsuario<LinhaPerfil[]>(
    sessao,
    `perfis_automacao?select=${CAMPOS}&user_id=eq.${sessao.usuario.id}&limit=1`,
  );
  if (!ok || !dados || dados.length === 0) return null;
  return daLinha(dados[0]);
}

/** Leitura pelo cron (service_role), por id de usuário. */
export async function lerPerfilPorId(userId: string): Promise<PerfilAutomacao | null> {
  const { ok, dados } = await comoServico<LinhaPerfil[]>(
    `perfis_automacao?select=${CAMPOS}&user_id=eq.${userId}&limit=1`,
  );
  if (!ok || !dados || dados.length === 0) return null;
  return daLinha(dados[0]);
}

export interface GravarPerfil {
  briefing?: Briefing;
  ativo?: boolean;
  igHandle?: string | null;
}

/**
 * Grava o perfil do usuário. Só `ativo`, `ig_handle` e `briefing` — `liberado`
 * fica fora do grant de UPDATE de propósito (migration).
 */
export async function gravarPerfilDoUsuario(
  sessao: Sessao,
  dados: GravarPerfil,
): Promise<{ ok: boolean; erro?: string; perfil?: PerfilAutomacao }> {
  const corpo: Record<string, unknown> = { atualizado_em: new Date().toISOString() };
  if (dados.briefing !== undefined) corpo.briefing = dados.briefing;
  if (dados.ativo !== undefined) corpo.ativo = dados.ativo;
  if (dados.igHandle !== undefined) corpo.ig_handle = dados.igHandle;

  /**
   * PATCH se já existe, INSERT se é a primeira entrevista.
   *
   * Não é upsert (`Prefer: resolution=merge-duplicates`) de propósito: o upsert
   * exige privilégio de UPDATE na TABELA, e a migration concede update só por
   * COLUNA para barrar `liberado` (usuário não liga autopilot sozinho). O
   * resultado era `permission denied for table perfis_automacao`.
   */
  const existente = await lerPerfilDoUsuario(sessao);

  const { ok, dados: salvo, erro } = existente
    ? await comoUsuario<LinhaPerfil[]>(
        sessao,
        `perfis_automacao?user_id=eq.${sessao.usuario.id}`,
        {
          method: "PATCH",
          headers: { prefer: "return=representation" },
          body: JSON.stringify(corpo),
        },
      )
    : await comoUsuario<LinhaPerfil[]>(sessao, "perfis_automacao", {
        method: "POST",
        headers: { prefer: "return=representation" },
        body: JSON.stringify({ ...corpo, user_id: sessao.usuario.id }),
      });

  if (!ok || !salvo || salvo.length === 0) {
    return { ok: false, erro: erro ?? "Não foi possível salvar." };
  }
  return { ok: true, perfil: daLinha(salvo[0]) };
}

/** Perfis elegíveis hoje: ativos, liberados, entrevista completa e sem post do dia. */
export async function listarElegiveis(hoje: string): Promise<PerfilAutomacao[]> {
  const { ok, dados } = await comoServico<LinhaPerfil[]>(
    `perfis_automacao?select=${CAMPOS}&ativo=eq.true&liberado=eq.true&order=ultima_execucao_em.asc.nullsfirst&limit=${CAP_ATIVOS * 3}`,
  );
  if (!ok || !dados) return [];

  const perfis = dados.map(daLinha).filter((p) => briefingCompleto(p.briefing));

  // Já tem post automático hoje? Então não é elegível (idempotência do dia).
  const { dados: feitos } = await comoServico<{ auth_user_id: string }[]>(
    `projetos?select=auth_user_id&origem=eq.autopilot&data_referencia=eq.${hoje}`,
  );
  const jaTem = new Set((feitos ?? []).map((f) => f.auth_user_id));

  return perfis.filter((p) => !jaTem.has(p.userId)).slice(0, CAP_ATIVOS);
}

/** Registro de execução no perfil (sucesso). */
export async function registrarSucesso(
  userId: string,
  tema: string,
  historicoAtual: string[],
): Promise<void> {
  const historico = [tema, ...historicoAtual].slice(0, HISTORICO_MAX);
  await comoServico<null>(`perfis_automacao?user_id=eq.${userId}`, {
    method: "PATCH",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({
      historico_temas: historico,
      ultima_execucao_em: new Date().toISOString(),
      ultimo_status: "ok",
      ultimo_erro: null,
      posts_sem_abrir: 0,
      atualizado_em: new Date().toISOString(),
    }),
  });
}

/** Registro de falha. Duas falhas seguidas param o perfil (evita queimar cota). */
export async function registrarFalha(userId: string, erro: string): Promise<void> {
  await comoServico<null>(`perfis_automacao?user_id=eq.${userId}`, {
    method: "PATCH",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({
      ultima_execucao_em: new Date().toISOString(),
      ultimo_status: "erro",
      ultimo_erro: erro.slice(0, 400),
      atualizado_em: new Date().toISOString(),
    }),
  });
}

/** O usuário abriu/baixou um post automático: zera o freio de inatividade. */
export async function marcarPostAberto(sessao: Sessao): Promise<void> {
  await comoUsuario<null>(sessao, `perfis_automacao?user_id=eq.${sessao.usuario.id}`, {
    method: "PATCH",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({ posts_sem_abrir: 0, atualizado_em: new Date().toISOString() }),
  });
}

/** Incrementa o freio e pausa quando passa do limite. */
export async function registrarPostNaoAberto(userId: string, atual: number): Promise<void> {
  const proximo = atual + 1;
  const pausar = proximo >= LIMITE_SEM_ABRIR;
  await comoServico<null>(`perfis_automacao?user_id=eq.${userId}`, {
    method: "PATCH",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({
      posts_sem_abrir: proximo,
      ...(pausar ? { ativo: false, ultimo_status: "pausado_por_inatividade" } : {}),
      atualizado_em: new Date().toISOString(),
    }),
  });
}
