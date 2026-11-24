/**
 * Configuração de IA do produto — uma só, do administrador, herdada por todos.
 *
 * Antes disto, provedor e chave eram `OPENAI_API_KEY` / `OPENAI_BASE_URL` /
 * `OPENAI_MODEL` no ambiente: trocar exigia shell e restart. Agora a fonte
 * principal é a tabela `config_ia` (service_role), e o ambiente virou fallback —
 * o que já estava configurado continua valendo sem ninguém redigitar nada.
 *
 * Por que escrever no `process.env` em vez de passar adiante por parâmetro:
 * `lib/conteudo.ts` e `lib/langchain.ts` leem modelo/base do ambiente em pontos
 * profundos do pipeline de 6 etapas. Replumbar assinatura por assinatura
 * atravessaria meia dúzia de arquivos para o mesmo resultado, com risco maior.
 * A configuração é GLOBAL (uma linha para todos os usuários), então mutar o
 * ambiente do processo é coerente — não existe "configuração por requisição"
 * aqui. O que fica proibido é ler a tabela em cada chamada: daí o cache curto.
 */
import { comoServico } from "@/lib/auth/supabase-servidor";

/** Base padrão do hub de modelos (9Router) quando nada estiver configurado. */
const BASE_PADRAO = "http://127.0.0.1:20128/v1";
const MODELO_TEXTO_PADRAO = "flash";
const MODELO_IMAGEM_PADRAO = "cx/gpt-image-2.5";

export interface ConfigIA {
  llmBaseUrl: string | null;
  llmModel: string | null;
  llmApiKey: string | null;
  imagemBaseUrl: string | null;
  imagemModel: string | null;
  imagemApiKey: string | null;
  atualizadoPor: string | null;
  atualizadoEm: string | null;
}

export interface ConfigResolvida {
  llmBaseUrl: string;
  llmModel: string;
  llmApiKey: string;
  imagemBaseUrl: string;
  imagemModel: string;
  imagemApiKey: string;
}

interface LinhaConfig {
  llm_base_url: string | null;
  llm_model: string | null;
  llm_api_key: string | null;
  imagem_base_url: string | null;
  imagem_model: string | null;
  imagem_api_key: string | null;
  atualizado_por: string | null;
  atualizado_em: string | null;
}

function daLinha(linha: LinhaConfig | null): ConfigIA {
  return {
    llmBaseUrl: linha?.llm_base_url ?? null,
    llmModel: linha?.llm_model ?? null,
    llmApiKey: linha?.llm_api_key ?? null,
    imagemBaseUrl: linha?.imagem_base_url ?? null,
    imagemModel: linha?.imagem_model ?? null,
    imagemApiKey: linha?.imagem_api_key ?? null,
    atualizadoPor: linha?.atualizado_por ?? null,
    atualizadoEm: linha?.atualizado_em ?? null,
  };
}

/** Cache curto: evita um round-trip ao banco por chamada de etapa. */
let cache: { em: number; valor: ConfigIA } | null = null;
const CACHE_MS = 15_000;

export function limparCacheConfigIA() {
  cache = null;
}

export async function lerConfigIA(): Promise<ConfigIA> {
  if (cache && Date.now() - cache.em < CACHE_MS) return cache.valor;

  const { ok, dados } = await comoServico<LinhaConfig[]>(
    "config_ia?select=*&limit=1",
  ).catch(() => ({ ok: false, dados: null }) as { ok: boolean; dados: null });

  // Banco fora do ar não pode derrubar a geração: cai no ambiente.
  if (!ok || !dados || dados.length === 0) {
    const vazio = daLinha(null);
    cache = { em: Date.now(), valor: vazio };
    return vazio;
  }

  const valor = daLinha(dados[0]);
  cache = { em: Date.now(), valor };
  return valor;
}

export interface PatchConfig {
  llmBaseUrl?: string | null;
  llmModel?: string | null;
  llmApiKey?: string | null;
  imagemBaseUrl?: string | null;
  imagemModel?: string | null;
  imagemApiKey?: string | null;
}

/**
 * Grava a configuração. Campo ausente no patch fica como estava; string vazia
 * também não apaga (a tela manda vazio quando a pessoa não redigitou a chave).
 * Apagar é explícito: `null`.
 */
export async function gravarConfigIA(
  patch: PatchConfig,
  por: string,
): Promise<{ ok: boolean; erro?: string }> {
  const atual = await lerConfigIA();

  const corpo = {
    id: true,
    llm_base_url: patch.llmBaseUrl === undefined ? atual.llmBaseUrl : patch.llmBaseUrl,
    llm_model: patch.llmModel === undefined ? atual.llmModel : patch.llmModel,
    llm_api_key: patch.llmApiKey === undefined ? atual.llmApiKey : patch.llmApiKey,
    imagem_base_url:
      patch.imagemBaseUrl === undefined ? atual.imagemBaseUrl : patch.imagemBaseUrl,
    imagem_model: patch.imagemModel === undefined ? atual.imagemModel : patch.imagemModel,
    imagem_api_key:
      patch.imagemApiKey === undefined ? atual.imagemApiKey : patch.imagemApiKey,
    atualizado_por: por,
    atualizado_em: new Date().toISOString(),
  };

  const { ok, erro } = await comoServico<null>("config_ia", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(corpo),
  });

  limparCacheConfigIA();
  return ok ? { ok: true } : { ok: false, erro: erro ?? "não foi possível salvar" };
}

/** Configuração efetiva: banco primeiro, ambiente como herança. */
export async function configEfetiva(): Promise<ConfigResolvida> {
  const cfg = await lerConfigIA();
  return {
    llmBaseUrl: (cfg.llmBaseUrl || process.env.OPENAI_BASE_URL || BASE_PADRAO).replace(/\/$/, ""),
    llmModel: cfg.llmModel || process.env.OPENAI_MODEL || MODELO_TEXTO_PADRAO,
    llmApiKey: cfg.llmApiKey || process.env.OPENAI_API_KEY || "",
    imagemBaseUrl: (
      cfg.imagemBaseUrl ||
      process.env.IMAGEM_BASE_URL ||
      process.env.OPENAI_BASE_URL ||
      BASE_PADRAO
    ).replace(/\/$/, ""),
    imagemModel: cfg.imagemModel || process.env.IMAGEM_MODEL || MODELO_IMAGEM_PADRAO,
    imagemApiKey:
      cfg.imagemApiKey || process.env.IMAGEM_API_KEY || process.env.OPENAI_API_KEY || "",
  };
}

/**
 * Projeta a configuração no ambiente do processo e devolve o resultado.
 *
 * Obrigatório antes de qualquer geração: `lib/conteudo.ts` e `lib/langchain.ts`
 * montam cliente com `process.env.OPENAI_API_KEY` / `OPENAI_BASE_URL`.
 */
export async function aplicarConfigIA(): Promise<ConfigResolvida> {
  const cfg = await configEfetiva();
  process.env.OPENAI_API_KEY = cfg.llmApiKey;
  process.env.OPENAI_BASE_URL = cfg.llmBaseUrl;
  process.env.OPENAI_MODEL = cfg.llmModel;
  process.env.IMAGEM_MODEL = cfg.imagemModel;
  return cfg;
}

/** Mostra o suficiente para reconhecer a chave, nunca a chave. */
export function mascararChave(valor: string | null): string | null {
  if (!valor) return null;
  if (valor.length <= 8) return "••••";
  return `${valor.slice(0, 4)}••••${valor.slice(-4)}`;
}
