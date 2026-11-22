/**
 * Onde os projetos salvos vivem — disco, um diretório por projeto.
 *
 * ## Por que store próprio, e não a tabela `carrossel_projetos`
 *
 * A issue #13 deixou a pergunta aberta ("persistimos pelo caminho existente ou
 * criamos store próprio?"). Foi medido antes de decidir:
 *
 * - `carrossel_projetos` mora no Postgres do AutoClinic e guarda o documento do
 *   **editor antigo** (`DocumentSchema`: slides com elementos soltos). O estúdio
 *   fala `CarrosselGerado` — card + texto + imagem. Converter um no outro para
 *   gravar seria inventar compatibilidade que ninguém usa.
 * - aquela tabela exige `organization_id` + `autor_id`, ou seja sessão do
 *   GoTrue. O estúdio não tem login: o leigo chega em `/` e cria. Exigir a conta
 *   do painel AutoClinic do Clécio para salvar o carrossel dele é o oposto do
 *   que a tela promete.
 * - as capas vêm em `data:image/...;base64` com 1–2 MB cada. Em `jsonb` isso
 *   vira lixo no banco que todo mundo consulta; em arquivo é o que é.
 *
 * Então: store próprio, no disco deste servidor, com um arquivo JSON por
 * projeto e as imagens como arquivos irmãos. A API é a única que toca aqui.
 *
 * ## Migração idempotente
 *
 * `MIGRACOES` é aplicada uma vez, em ordem, e cada id aplicado fica registrado
 * em `migracoes.json`. Rodar de novo não faz nada — nem em paralelo, porque a
 * aplicação é serializada por uma promise única por processo. Criar o store é
 * `mkdir -p`; a migração 2 limpa temporários de gravações interrompidas.
 *
 * ## Segurança
 *
 * O `id` do projeto é validado por regex antes de virar caminho (`..` recusado)
 * e todo acesso confere o dono. Projeto de outro dono responde **null**, que a
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

/** Diretório raiz. `ESTUDIO_DADOS` existe para o gate rodar em diretório limpo. */
export const RAIZ_DADOS =
  process.env.ESTUDIO_DADOS?.trim() || path.join(process.cwd(), "data", "estudio");

const DIR_PROJETOS = path.join(RAIZ_DADOS, "projetos");
const ARQ_MIGRACOES = path.join(RAIZ_DADOS, "migracoes.json");

const RE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const RE_ARQUIVO = /^[a-z0-9][a-z0-9._-]{0,80}$/i;

/** Projeto como fica no disco: o contrato público + o dono (nunca sai daqui). */
interface ProjetoGravado extends ProjetoSalvo {
  dono: string;
}

interface EstadoMigracoes {
  aplicadas: number[];
}

interface Migracao {
  id: number;
  nome: string;
  aplicar: () => Promise<void>;
}

/* ------------------------------------------------------------------ */
/* Migrações                                                           */
/* ------------------------------------------------------------------ */

const MIGRACOES: Migracao[] = [
  {
    id: 1,
    nome: "cria-diretorios",
    // `recursive: true` é o idempotente do `mkdir -p`: existe? não reclama.
    aplicar: async () => {
      await fs.mkdir(DIR_PROJETOS, { recursive: true });
    },
  },
  {
    id: 2,
    nome: "remove-temporarios",
    // Gravação interrompida (queda de energia no meio do rename) deixa
    // `.tmp-*` para trás. Nenhum deles é um projeto válido; apagar é seguro.
    aplicar: async () => {
      const entradas = await fs.readdir(DIR_PROJETOS).catch(() => [] as string[]);
      for (const entrada of entradas) {
        if (!entrada.startsWith(".tmp-")) continue;
        await fs.rm(path.join(DIR_PROJETOS, entrada), { recursive: true, force: true }).catch(() => {});
      }
    },
  },
];

let migracaoEmCurso: Promise<void> | null = null;

/**
 * Garante o store pronto. Chamado por toda função pública: a primeira chamada
 * aplica as migrações pendentes, as seguintes reaproveitam a mesma promise.
 */
export async function garantirArmazenamento(): Promise<void> {
  if (migracaoEmCurso) return migracaoEmCurso;

  migracaoEmCurso = (async () => {
    await fs.mkdir(RAIZ_DADOS, { recursive: true });
    let estado: EstadoMigracoes = { aplicadas: [] };
    try {
      estado = JSON.parse(await fs.readFile(ARQ_MIGRACOES, "utf8")) as EstadoMigracoes;
    } catch {
      // Primeira execução (ou arquivo corrompido): começa do zero. Reaplicar
      // tudo é seguro — cada migração é idempotente por construção.
      estado = { aplicadas: [] };
    }
    const aplicadas = new Set(estado.aplicadas ?? []);

    for (const migracao of MIGRACOES) {
      if (aplicadas.has(migracao.id)) continue;
      await migracao.aplicar();
      aplicadas.add(migracao.id);
      const novo: EstadoMigracoes = { aplicadas: Array.from(aplicadas).sort((a, b) => a - b) };
      await escreverAtomico(ARQ_MIGRACOES, JSON.stringify(novo, null, 2));
    }
  })();

  try {
    await migracaoEmCurso;
  } catch (erro) {
    // Falhou? libera para tentar de novo na próxima requisição, em vez de
    // deixar o app inteiro em erro até reiniciar o processo.
    migracaoEmCurso = null;
    throw erro;
  }
}

/* ------------------------------------------------------------------ */
/* Escrita atômica                                                     */
/* ------------------------------------------------------------------ */

async function escreverAtomico(destino: string, conteudo: string | Uint8Array): Promise<void> {
  const temporario = `${destino}.tmp-${crypto.randomBytes(6).toString("hex")}`;
  await fs.writeFile(temporario, conteudo);
  await fs.rename(temporario, destino);
}

/* ------------------------------------------------------------------ */
/* Caminhos                                                            */
/* ------------------------------------------------------------------ */

export function idValido(id: string): boolean {
  return RE_ID.test(id);
}

function dirDoProjeto(id: string): string {
  if (!idValido(id)) throw new Error("id de projeto inválido");
  return path.join(DIR_PROJETOS, id);
}

function dirDosArquivos(id: string): string {
  return path.join(dirDoProjeto(id), "arquivos");
}

function arqDoProjeto(id: string): string {
  return path.join(dirDoProjeto(id), "projeto.json");
}

/* ------------------------------------------------------------------ */
/* Leitura                                                             */
/* ------------------------------------------------------------------ */

async function lerGravado(id: string): Promise<ProjetoGravado | null> {
  if (!idValido(id)) return null;
  try {
    const texto = await fs.readFile(arqDoProjeto(id), "utf8");
    const dados = JSON.parse(texto) as ProjetoGravado;
    if (!dados || typeof dados.id !== "string" || !Array.isArray(dados.slides)) return null;
    return dados;
  } catch {
    return null;
  }
}

/** Sem o `dono`: é o que a tela pode ver. */
function publico(gravado: ProjetoGravado): ProjetoSalvo {
  const { dono: _dono, ...resto } = gravado;
  return resto;
}

function resumoDe(gravado: ProjetoGravado): ResumoProjeto {
  const capa: SlideCarrossel = gravado.slides[0] ?? {
    tipo: "capa",
    titulo: gravado.nome,
    corpo: "",
    imagem: null,
  };
  return {
    id: gravado.id,
    nome: gravado.nome,
    templateId: gravado.templateId,
    tema: gravado.tema,
    slides: gravado.slides.length,
    atualizadoEm: gravado.atualizadoEm,
    salvoEm: gravado.salvoEm,
    capa,
  };
}

/** Projeto inteiro, só se for do dono. */
export async function lerProjeto(dono: string, id: string): Promise<ProjetoSalvo | null> {
  await garantirArmazenamento();
  const gravado = await lerGravado(id);
  if (!gravado || gravado.dono !== dono) return null;
  return publico(gravado);
}

/**
 * Lista do dono, do mais recente para o mais antigo.
 *
 * Sem índice: `readdir` + `readFile` por projeto. Com centenas de projetos isso
 * são poucos ms; um índice paralelo seria mais uma coisa para dessincronizar.
 */
export async function listarProjetos(dono: string): Promise<ResumoProjeto[]> {
  await garantirArmazenamento();
  const entradas = await fs.readdir(DIR_PROJETOS).catch(() => [] as string[]);
  const resumos: ResumoProjeto[] = [];

  for (const entrada of entradas) {
    if (!idValido(entrada)) continue;
    const gravado = await lerGravado(entrada);
    if (!gravado || gravado.dono !== dono) continue;
    resumos.push(resumoDe(gravado));
  }

  return resumos.sort(
    (a, b) => new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime(),
  );
}

/* ------------------------------------------------------------------ */
/* Imagens                                                             */
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

function nomeDoCard(indice: number, extensao: string): string {
  return `card-${String(indice + 1).padStart(2, "0")}.${extensao}`;
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

async function removerImagemDoCard(dir: string, indice: number): Promise<void> {
  const existentes = await fs.readdir(dir).catch(() => [] as string[]);
  const prefixo = `card-${String(indice + 1).padStart(2, "0")}.`;
  for (const arquivo of existentes) {
    if (!arquivo.startsWith(prefixo)) continue;
    await fs.rm(path.join(dir, arquivo), { force: true }).catch(() => {});
  }
}

/** Caminho absoluto de um arquivo do projeto, ou null se o dono/arquivo não bater. */
export async function caminhoDoArquivo(
  dono: string,
  id: string,
  arquivo: string,
): Promise<string | null> {
  if (!RE_ARQUIVO.test(arquivo)) return null;
  const gravado = await lerGravado(id);
  if (!gravado || gravado.dono !== dono) return null;
  const caminho = path.join(dirDosArquivos(id), arquivo);
  try {
    const info = await fs.stat(caminho);
    return info.isFile() ? caminho : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Escrita de projetos                                                 */
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
 * Curadoria vinda do cliente → o que vai para o disco.
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
  dono: string,
  dados: DadosNovoProjeto,
): Promise<ResultadoCriacao> {
  await garantirArmazenamento();

  const slides = normalizarSlides(dados.slides);
  if (!slides) return { ok: false, motivo: "O carrossel chegou vazio ou com cards demais." };

  const templateId =
    typeof dados.templateId === "string" && dados.templateId.trim() ? dados.templateId : "minimalist";
  const tema = typeof dados.tema === "string" ? dados.tema.slice(0, 400) : "";

  const agora = new Date().toISOString();
  const id = crypto.randomUUID();
  const versao = 1;

  const slidesGravados = await materializarImagens(id, slides, versao);
  const arroba = normalizarArroba(dados.arroba);
  const estilo = estiloParaGravar(dados.estilo);
  const gravado: ProjetoGravado = {
    id,
    nome: nomeLimpo(dados.nome, nomePadrao(slides, tema)) || NOME_SEM_TITULO,
    templateId,
    tema,
    slides: slidesGravados,
    criadoEm: agora,
    atualizadoEm: agora,
    salvoEm: agora,
    versao,
    dono,
    // Campo ausente no JSON quando não há @/estilo escolhido.
    ...(arroba ? { arroba } : {}),
    ...(estilo ? { estilo } : {}),
  };

  await fs.mkdir(dirDoProjeto(id), { recursive: true });
  await escreverAtomico(arqDoProjeto(id), JSON.stringify(gravado, null, 2));

  return { ok: true, projeto: publico(gravado) };
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
  dono: string,
  id: string,
  dados: DadosAlteracao,
): Promise<ResultadoCriacao> {
  await garantirArmazenamento();

  const atual = await lerGravado(id);
  if (!atual || atual.dono !== dono) return { ok: false, motivo: "nao_encontrado" };

  const versao = (Number.isFinite(atual.versao) ? atual.versao : 1) + 1;
  const agora = new Date().toISOString();

  let slides = atual.slides;
  if (dados.slides !== undefined) {
    const normalizados = normalizarSlides(dados.slides);
    if (!normalizados) return { ok: false, motivo: "O carrossel chegou vazio ou com cards demais." };
    slides = await materializarImagens(id, normalizados, versao);
  }

  const nomeRecebido =
    typeof dados.nome === "string" ? dados.nome : undefined;
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

  const gravado: ProjetoGravado = {
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

  await escreverAtomico(arqDoProjeto(id), JSON.stringify(gravado, null, 2));
  return { ok: true, projeto: publico(gravado) };
}

export async function apagarProjeto(dono: string, id: string): Promise<boolean> {
  await garantirArmazenamento();
  const gravado = await lerGravado(id);
  if (!gravado || gravado.dono !== dono) return false;
  await fs.rm(dirDoProjeto(id), { recursive: true, force: true });
  return true;
}
