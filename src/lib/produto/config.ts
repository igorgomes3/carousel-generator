/**
 * `config_produto` — os interruptores que o administrador controla.
 *
 * Linha única, RLS ligada e **nenhuma policy**: só `service_role` lê e escreve.
 * `cadastro_aberto` e `exigir_convite` mudam o comportamento de `/api/auth/cadastro`
 * (e da tela), então não podem ser graváveis pelo próprio usuário.
 */
import { comoServico } from "@/lib/auth/supabase-servidor";

export interface ConfigProduto {
  cadastroAberto: boolean;
  exigirConvite: boolean;
  atualizadoPor: string | null;
  atualizadoEm: string | null;
}

interface Linha {
  cadastro_aberto: boolean | null;
  exigir_convite: boolean | null;
  atualizado_por: string | null;
  atualizado_em: string | null;
}

const PADRAO: ConfigProduto = {
  cadastroAberto: true,
  exigirConvite: false,
  atualizadoPor: null,
  atualizadoEm: null,
};

let cache: { em: number; valor: ConfigProduto } | null = null;
const CACHE_MS = 15_000;

export function limparCacheProduto() {
  cache = null;
}

export async function lerConfigProduto(): Promise<ConfigProduto> {
  if (cache && Date.now() - cache.em < CACHE_MS) return cache.valor;

  const { ok, dados } = await comoServico<Linha[]>("config_produto?select=*&limit=1").catch(
    () => ({ ok: false, dados: null }) as { ok: boolean; dados: null },
  );

  if (!ok || !dados || dados.length === 0) {
    cache = { em: Date.now(), valor: PADRAO };
    return PADRAO;
  }

  const l = dados[0];
  const valor: ConfigProduto = {
    // Ausência de linha cai no padrão ABERTO: fechar por falha de banco seria
    // transformar um problema técnico em "ninguém consegue entrar".
    cadastroAberto: l.cadastro_aberto ?? true,
    exigirConvite: l.exigir_convite ?? false,
    atualizadoPor: l.atualizado_por,
    atualizadoEm: l.atualizado_em,
  };
  cache = { em: Date.now(), valor };
  return valor;
}

export async function salvarConfigProduto(
  patch: Partial<Pick<ConfigProduto, "cadastroAberto" | "exigirConvite">>,
  por: string,
): Promise<{ ok: boolean; erro?: string }> {
  const atual = await lerConfigProduto();
  const corpo = {
    id: true,
    cadastro_aberto: patch.cadastroAberto ?? atual.cadastroAberto,
    exigir_convite: patch.exigirConvite ?? atual.exigirConvite,
    atualizado_por: por,
    atualizado_em: new Date().toISOString(),
  };

  const { ok, erro } = await comoServico<null>("config_produto", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(corpo),
  });

  limparCacheProduto();
  return ok ? { ok: true } : { ok: false, erro: erro ?? "não foi possível salvar" };
}
