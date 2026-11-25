/**
 * Chaves de IA do próprio usuário.
 *
 * O modelo do produto é: o administrador paga por padrão (chave global no
 * `/admin`) e o usuário PODE custear o próprio uso. Por isso a chave do usuário
 * é opcional e, quando existe, sobrepõe a global — nunca o contrário.
 *
 * Regras:
 * - campo vazio = usa a global (não é "apagar tudo", é "herdar");
 * - a chave nunca volta para o navegador, só a máscara;
 * - RLS por `auth.uid()`: o usuário lê e grava a própria linha; o cron e as rotas
 *   de geração leem com `service_role` para resolver a chave na hora.
 */
import type { Sessao } from "@/lib/auth/supabase-servidor";
import { comoServico, comoUsuario } from "@/lib/auth/supabase-servidor";

export interface ChavesUsuario {
  llmBaseUrl: string | null;
  llmModel: string | null;
  llmApiKey: string | null;
  imagemBaseUrl: string | null;
  imagemModel: string | null;
  imagemApiKey: string | null;
}

export const CHAVES_VAZIAS: ChavesUsuario = {
  llmBaseUrl: null,
  llmModel: null,
  llmApiKey: null,
  imagemBaseUrl: null,
  imagemModel: null,
  imagemApiKey: null,
};

interface Linha {
  llm_base_url: string | null;
  llm_model: string | null;
  llm_api_key: string | null;
  imagem_base_url: string | null;
  imagem_model: string | null;
  imagem_api_key: string | null;
}

function daLinha(l: Linha | null | undefined): ChavesUsuario {
  if (!l) return CHAVES_VAZIAS;
  return {
    llmBaseUrl: l.llm_base_url ?? null,
    llmModel: l.llm_model ?? null,
    llmApiKey: l.llm_api_key ?? null,
    imagemBaseUrl: l.imagem_base_url ?? null,
    imagemModel: l.imagem_model ?? null,
    imagemApiKey: l.imagem_api_key ?? null,
  };
}

export async function lerChavesPorId(userId: string): Promise<ChavesUsuario> {
  const { ok, dados } = await comoServico<Linha[]>(
    `chaves_usuario?select=*&user_id=eq.${userId}&limit=1`,
  ).catch(() => ({ ok: false, dados: null }) as { ok: boolean; dados: null });
  if (!ok || !dados || dados.length === 0) return CHAVES_VAZIAS;
  return daLinha(dados[0]);
}

export async function lerChavesDoUsuario(sessao: Sessao): Promise<ChavesUsuario> {
  const { ok, dados } = await comoUsuario<Linha[]>(
    sessao,
    `chaves_usuario?select=*&user_id=eq.${sessao.usuario.id}&limit=1`,
  );
  if (!ok || !dados || dados.length === 0) return CHAVES_VAZIAS;
  return daLinha(dados[0]);
}

export interface PatchChaves {
  llmBaseUrl?: string | null;
  llmModel?: string | null;
  llmApiKey?: string | null;
  imagemBaseUrl?: string | null;
  imagemModel?: string | null;
  imagemApiKey?: string | null;
}

/**
 * Grava. `undefined` mantém; `null` (ou `"__apagar__"` vindo da API) limpa o
 * campo para voltar a herdar a global.
 *
 * PATCH/INSERT explícito em vez de upsert: `merge-duplicates` exige UPDATE de
 * tabela e a modelagem por coluna já custou `permission denied` em
 * `perfis_automacao` (24/11/2026).
 */
export async function salvarChavesDoUsuario(
  sessao: Sessao,
  patch: PatchChaves,
): Promise<{ ok: boolean; erro?: string; chaves?: ChavesUsuario }> {
  const atual = await lerChavesDoUsuario(sessao);

  const mesclar = (novo: string | null | undefined, antigo: string | null) =>
    novo === undefined ? antigo : novo;

  const corpo = {
    llm_base_url: mesclar(patch.llmBaseUrl, atual.llmBaseUrl),
    llm_model: mesclar(patch.llmModel, atual.llmModel),
    llm_api_key: mesclar(patch.llmApiKey, atual.llmApiKey),
    imagem_base_url: mesclar(patch.imagemBaseUrl, atual.imagemBaseUrl),
    imagem_model: mesclar(patch.imagemModel, atual.imagemModel),
    imagem_api_key: mesclar(patch.imagemApiKey, atual.imagemApiKey),
    atualizado_em: new Date().toISOString(),
  };

  const existe = Boolean(
    atual.llmApiKey || atual.imagemApiKey || atual.llmModel || atual.imagemModel,
  );

  const { ok, dados, erro } = existe
    ? await comoUsuario<Linha[]>(sessao, `chaves_usuario?user_id=eq.${sessao.usuario.id}`, {
        method: "PATCH",
        headers: { prefer: "return=representation" },
        body: JSON.stringify(corpo),
      })
    : await comoUsuario<Linha[]>(sessao, "chaves_usuario", {
        method: "POST",
        headers: { prefer: "return=representation" },
        body: JSON.stringify({ ...corpo, user_id: sessao.usuario.id }),
      });

  if (!ok || !dados || dados.length === 0) {
    return { ok: false, erro: erro ?? "Não foi possível salvar as chaves." };
  }
  return { ok: true, chaves: daLinha(dados[0]) };
}

/** O usuário custeia o próprio uso? Usado para explicar na tela. */
export function usaChavePropria(c: ChavesUsuario): boolean {
  return Boolean(c.llmApiKey || c.imagemApiKey);
}
