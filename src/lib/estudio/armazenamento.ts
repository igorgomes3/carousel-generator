/**
 * Onde os projetos salvos vivem — agora no Supabase dedicado do carrossel.
 *
 * ## O que mudou (23/11/2026)
 *
 * Antes: um `projeto.json` por projeto em `data/estudio/projetos/<id>/`, e o
 * dono era um UUID de cookie (`estudio_dono`) — porque o estúdio não tinha
 * login. Igor decidiu que geração de conteúdo exige conta, então a identidade
 * passou a ser `auth.uid()` do GoTrue do projeto novo e o documento passou a
 * morar na tabela `projetos` (`documento jsonb`), com RLS por `auth_user_id`.
 *
 * ## O que continua no disco, e por quê
 *
 * Os BYTES das imagens. Uma capa por IA chega em `data:image/png;base64` com
 * 1–2 MB; em `jsonb` isso vira lixo que toda consulta da lista carrega. O
 * `documento` guarda o caminho (`/api/projetos/<id>/arquivos/card-01.png?v=2`)
 * e o arquivo fica em `data/estudio/projetos/<id>/arquivos/`.
 *
 * Consequência assumida: documento = banco (durável, por usuário, visível de
 * qualquer navegador); imagem = disco deste host. Perder o host perde as
 * imagens, não os textos. O passo seguinte é mover os bytes para o Storage do
 * mesmo projeto Supabase — não está feito aqui.
 *
 * ## Segurança
 *
 * Toda leitura/escrita vai ao PostgREST com o **token do usuário**, então a RLS
 * (`auth.uid() = auth_user_id`) é quem decide. O filtro por id aparece no SQL
 * também: cinto e suspensório. Projeto de outro dono responde **null**, que a
 * rota traduz em 404 — nunca 403, que confirmaria a existência do id.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import {
  LIMITE_NOME,
  NOME_SEM_TITULO,
  normalizarSlides,
  nomeLimpo,
  nomePadrao,
  type ProjetoSalvo,
  type ResumoProjeto,
} from "@/lib/estudio/projetos";
import { normalizarArroba } from "@/lib/estudio/arroba";
import { estiloVazio, normalizarEstilo, type EstiloEscolhido } from "@/lib/estudio/estilo";
import type { SlideCarrossel } from "@/lib/estudio/tipos";
import { comoServico, comoUsuario, type Sessao } from "@/lib/auth/supabase-servidor";

/** Diretório das imagens. `ESTUDIO_DADOS` existe para o gate rodar em diretório limpo. */
export const RAIZ_DADOS =
  process.env.ESTUDIO_DADOS?.trim() || path.join(process.cwd(), "data", "estudio");

const DIR_PROJETOS = path.join(RAIZ_DADOS, "projetos");

const RE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const RE_ARQUIVO = /^[a-z0-9][a-z0-9._-]{0,80}$/i;

/** Linha da tabela `projetos`. `documento` é o `ProjetoSalvo` inteiro. */
interface LinhaProjeto {
  id: string;
  auth_user_id: string;
  nome: string;
  documento: ProjetoSalvo;
  token_publico: string;
  criado_em: string;
  atualizado_em: string;
}

export function idValido(id: string): boolean {
  return RE_ID.test(id);
}

/* ------------------------------------------------------------------ */
/* Mapeamento banco ↔ contrato da tela                                 */
/* ------------------------------------------------------------------ */

function linhaParaProjeto(linha: LinhaProjeto): ProjetoSalvo {
  const doc = (linha.documento ?? {}) as Partial<ProjetoSalvo>;
  return {
    id: linha.id,
    nome: linha.nome || doc.nome || NOME_SEM_TITULO,
    templateId: doc.templateId ?? "minimalist",
    tema: doc.tema ?? "",
    slides: Array.isArray(doc.slides) ? doc.slides : [],
    criadoEm: doc.criadoEm ?? linha.criado_em,
    atualizadoEm: doc.atualizadoEm ?? linha.atualizado_em,
    salvoEm: doc.salvoEm ?? linha.atualizado_em,
    versao: Number.isFinite(doc.versao) ? Number(doc.versao) : 1,
    ...(doc.arroba ? { arroba: doc.arroba } : {}),
    ...(doc.estilo ? { estilo: doc.estilo } : {}),
  };
}

function resumoDe(projeto: ProjetoSalvo): ResumoProjeto {
  const capa: SlideCarrossel = projeto.slides[0] ?? {
    tipo: "capa",
    titulo: projeto.nome,
    corpo: "",
    imagem: null,
  };
  return {
    id: projeto.id,
    nome: projeto.nome,
    templateId: projeto.templateId,
    tema: projeto.tema,
    slides: projeto.slides.length,
    atualizadoEm: projeto.atualizadoEm,
    salvoEm: projeto.salvoEm,
    capa,
  };
}

/* ------------------------------------------------------------------ */
/* Leitura                                                             */
/* ------------------------------------------------------------------ */

async function buscarLinha(sessao: Sessao, id: string): Promise<LinhaProjeto | null> {
  if (!idValido(id)) return null;
  const { ok, dados } = await comoUsuario<LinhaProjeto[]>(sessao, `projetos?id=eq.${id}&select=*`);
  if (!ok || !dados || dados.length === 0) return null;
  return dados[0];
}

export async function lerProjeto(sessao: Sessao, id: string): Promise<ProjetoSalvo | null> {
  const linha = await buscarLinha(sessao, id);
  return linha ? linhaParaProjeto(linha) : null;
}

/**
 * Lista do usuário, do mais recente para o mais antigo. A ordenação é do
 * Postgres — a lista cresce e ordenar no Node seria carregar tudo à toa.
 */
export async function listarProjetos(sessao: Sessao): Promise<ResumoProjeto[]> {
  const { ok, dados, erro } = await comoUsuario<LinhaProjeto[]>(
    sessao,
    `projetos?select=*&order=atualizado_em.desc&limit=200`,
  );
  if (!ok) throw new Error(erro ?? "Não foi possível abrir seus projetos.");
  return (dados ?? []).map((linha) => resumoDe(linhaParaProjeto(linha)));
}

/* ------------------------------------------------------------------ */
/* Imagens (bytes em disco)                                            */
/* ------------------------------------------------------------------ */

const EXTENSOES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export const TIPOS_POR_EXTENSAO: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

function dirDosArquivos(id: string): string {
  if (!idValido(id)) throw new Error("id de projeto inválido");
  return path.join(DIR_PROJETOS, id, "arquivos");
}

function nomeDoCard(indice: number, extensao: string): string {
  return `card-${String(indice + 1).padStart(2, "0")}.${extensao}`;
}

async function escreverAtomico(destino: string, conteudo: string | Uint8Array): Promise<void> {
  const temporario = `${destino}.tmp-${crypto.randomBytes(6).toString("hex")}`;
  await fs.writeFile(temporario, conteudo);
  await fs.rename(temporario, destino);
}

async function removerImagemDoCard(dir: string, indice: number): Promise<void> {
  const existentes = await fs.readdir(dir).catch(() => [] as string[]);
  const prefixo = `card-${String(indice + 1).padStart(2, "0")}.`;
  for (const arquivo of existentes) {
    if (!arquivo.startsWith(prefixo)) continue;
    await fs.rm(path.join(dir, arquivo), { force: true }).catch(() => {});
  }
}

/**
 * Troca `data:image/...;base64,...` por arquivo no disco.
 *
 * Sem isso, cada abertura da lista baixaria ~10 MB de base64 dentro do JSON.
 * O caminho devolvido é o da nossa rota de arquivo, com `v=<versao>` para o
 * navegador não servir a imagem velha quando a pessoa troca a capa por IA.
 */
async function materializarImagens(
  id: string,
  slides: SlideCarrossel[],
  versao: number,
): Promise<SlideCarrossel[]> {
  const dir = dirDosArquivos(id);
  await fs.mkdir(dir, { recursive: true });

  const saida: SlideCarrossel[] = [];

  for (let i = 0; i < slides.length; i += 1) {
    const slide = slides[i];
    const imagem = slide.imagem;

    if (!imagem) {
      await removerImagemDoCard(dir, i);
      saida.push({ ...slide, imagem: null });
      continue;
    }

    const dataUrl = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(imagem);
    if (dataUrl) {
      const mime = dataUrl[1].toLowerCase();
      const extensao = EXTENSOES[mime];
      if (!extensao) {
        // Formato que não sabemos gravar: mantém o data URL em vez de perder a
        // imagem. Fica grande, mas perder a capa seria pior.
        saida.push(slide);
        continue;
      }
      const bytes = Buffer.from(dataUrl[2], "base64");
      const arquivo = nomeDoCard(i, extensao);
      await removerImagemDoCard(dir, i);
      await escreverAtomico(path.join(dir, arquivo), bytes);
      saida.push({ ...slide, imagem: `/api/projetos/${id}/arquivos/${arquivo}?v=${versao}` });
      continue;
    }

    // Já é caminho nosso (ou URL externa): normaliza o cache e segue.
    if (imagem.startsWith(`/api/projetos/${id}/arquivos/`)) {
      const arquivo = imagem.split("/").pop()?.split("?")[0] ?? "";
      saida.push({
        ...slide,
        imagem: RE_ARQUIVO.test(arquivo)
          ? `/api/projetos/${id}/arquivos/${arquivo}?v=${versao}`
          : null,
      });
      continue;
    }

    saida.push(slide);
  }

  return saida;
}

/**
 * Caminho absoluto de um arquivo do projeto, ou null se o projeto não for do
 * usuário da sessão. O dono é conferido no banco (RLS); o disco só entrega
 * bytes depois disso.
 */
export async function caminhoDoArquivo(
  sessao: Sessao,
  id: string,
  arquivo: string,
): Promise<string | null> {
  if (!RE_ARQUIVO.test(arquivo) || !idValido(id)) return null;
  const linha = await buscarLinha(sessao, id);
  if (!linha) return null;

  const caminho = path.join(dirDosArquivos(id), arquivo);
  try {
    const info = await fs.stat(caminho);
    return info.isFile() ? caminho : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Escrita                                                             */
/* ------------------------------------------------------------------ */

export interface DadosNovoProjeto {
  nome?: string;
  templateId: string;
  tema?: string;
  slides: unknown;
  /** Handle do perfil (issue #12), com ou sem `@`. */
  arroba?: unknown;
  /** Fundo/destaque/fonte escolhidos (issue #12). */
  estilo?: unknown;
}

/**
 * Curadoria vinda do cliente → o que vai para o banco.
 *
 * Id desconhecido é descartado (`normalizarEstilo`) e estilo vazio vira
 * `undefined`: assim o JSON do projeto antigo e o do novo que não escolheu nada
 * ficam iguais, e "não escolheu" continua sendo um estado só.
 */
function estiloParaGravar(entrada: unknown): EstiloEscolhido | undefined {
  const estilo = normalizarEstilo(entrada);
  return estiloVazio(estilo) ? undefined : estilo;
}

export type ResultadoCriacao =
  | { ok: true; projeto: ProjetoSalvo }
  | { ok: false; motivo: string };

export async function criarProjeto(
  sessao: Sessao,
  dados: DadosNovoProjeto,
): Promise<ResultadoCriacao> {
  const slides = normalizarSlides(dados.slides);
  if (!slides) return { ok: false, motivo: "O carrossel chegou vazio ou com cards demais." };

  const templateId =
    typeof dados.templateId === "string" && dados.templateId.trim()
      ? dados.templateId
      : "minimalist";
  const tema = typeof dados.tema === "string" ? dados.tema.slice(0, 400) : "";

  const agora = new Date().toISOString();
  const id = crypto.randomUUID();
  const versao = 1;

  const slidesGravados = await materializarImagens(id, slides, versao);
  const arroba = normalizarArroba(dados.arroba);
  const estilo = estiloParaGravar(dados.estilo);

  const projeto: ProjetoSalvo = {
    id,
    nome: nomeLimpo(dados.nome, nomePadrao(slides, tema)) || NOME_SEM_TITULO,
    templateId,
    tema,
    slides: slidesGravados,
    criadoEm: agora,
    atualizadoEm: agora,
    salvoEm: agora,
    versao,
    ...(arroba ? { arroba } : {}),
    ...(estilo ? { estilo } : {}),
  };

  const { ok, dados: criado, erro } = await comoUsuario<LinhaProjeto[]>(sessao, "projetos", {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({
      id,
      auth_user_id: sessao.usuario.id,
      nome: projeto.nome,
      documento: projeto,
    }),
  });

  if (!ok || !criado || criado.length === 0) {
    console.error("[projetos] falha ao criar:", erro);
    return { ok: false, motivo: "Não foi possível salvar o projeto. Tente de novo." };
  }

  return { ok: true, projeto: linhaParaProjeto(criado[0]) };
}

export interface DadosAlteracao {
  nome?: unknown;
  templateId?: unknown;
  tema?: unknown;
  slides?: unknown;
  arroba?: unknown;
  estilo?: unknown;
}

/**
 * Salva por cima. Lê antes de escrever porque `versao` é a única coisa que
 * ordena duas abas abertas no mesmo projeto: a última gravação vence, mas o
 * carimbo de tempo e a versão contam a verdade.
 */
export async function salvarProjeto(
  sessao: Sessao,
  id: string,
  dados: DadosAlteracao,
): Promise<ResultadoCriacao> {
  const atual = await lerProjeto(sessao, id);
  if (!atual) return { ok: false, motivo: "nao_encontrado" };

  const versao = (Number.isFinite(atual.versao) ? atual.versao : 1) + 1;
  const agora = new Date().toISOString();

  let slides = atual.slides;
  if (dados.slides !== undefined) {
    const normalizados = normalizarSlides(dados.slides);
    if (!normalizados) return { ok: false, motivo: "O carrossel chegou vazio ou com cards demais." };
    slides = await materializarImagens(id, normalizados, versao);
  }

  const nomeRecebido = typeof dados.nome === "string" ? dados.nome : undefined;
  const temaRecebido = typeof dados.tema === "string" ? dados.tema.slice(0, 400) : undefined;
  const templateRecebido =
    typeof dados.templateId === "string" && dados.templateId.trim()
      ? dados.templateId
      : undefined;

  /**
   * `undefined` = campo não veio (aba antiga, cliente que não conhece a issue
   * #12) → mantém o que está gravado. String vazia/nula = a pessoa APAGOU o @ →
   * limpa. Sem essa distinção, salvar texto de um card apagaria o @ junto.
   */
  const arrobaRecebida = dados.arroba !== undefined ? normalizarArroba(dados.arroba) : undefined;
  const estiloRecebido = dados.estilo !== undefined ? estiloParaGravar(dados.estilo) : undefined;

  const projeto: ProjetoSalvo = {
    ...atual,
    nome:
      nomeRecebido !== undefined
        ? nomeLimpo(nomeRecebido, atual.nome).slice(0, LIMITE_NOME)
        : atual.nome,
    tema: temaRecebido ?? atual.tema,
    templateId: templateRecebido ?? atual.templateId,
    slides,
    atualizadoEm: agora,
    salvoEm: agora,
    versao,
    arroba: dados.arroba !== undefined ? (arrobaRecebida ?? undefined) : atual.arroba,
    estilo: dados.estilo !== undefined ? estiloRecebido : atual.estilo,
  };

  const { ok, dados: salvo, erro } = await comoUsuario<LinhaProjeto[]>(
    sessao,
    `projetos?id=eq.${id}`,
    {
      method: "PATCH",
      headers: { prefer: "return=representation" },
      body: JSON.stringify({ nome: projeto.nome, documento: projeto }),
    },
  );

  if (!ok || !salvo || salvo.length === 0) {
    console.error("[projetos] falha ao salvar:", erro);
    return { ok: false, motivo: erro ?? "Não foi possível salvar as alterações. Tente de novo." };
  }

  return { ok: true, projeto: linhaParaProjeto(salvo[0]) };
}

export async function apagarProjeto(sessao: Sessao, id: string): Promise<boolean> {
  const atual = await lerProjeto(sessao, id);
  if (!atual) return false;

  const { ok } = await comoUsuario<null>(sessao, `projetos?id=eq.${id}`, { method: "DELETE" });
  if (!ok) return false;

  await fs.rm(path.join(DIR_PROJETOS, id), { recursive: true, force: true }).catch(() => {});
  return true;
}

/**
 * Projeto por token público (`/p/<token>`), sem sessão.
 *
 * Usa `service_role` porque quem abre o link não tem conta — e é exatamente por
 * isso que o token é um UUID opaco: ele É a credencial, então não pode ser
 * adivinhado nem listado.
 */
export async function projetoPorToken(token: string): Promise<ProjetoSalvo | null> {
  if (!idValido(token)) return null;
  const { ok, dados } = await comoServico<LinhaProjeto[]>(
    `projetos?token_publico=eq.${token}&select=*`,
  );
  if (!ok || !dados || dados.length === 0) return null;
  return linhaParaProjeto(dados[0]);
}
