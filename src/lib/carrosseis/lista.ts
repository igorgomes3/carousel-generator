/**
 * Regras da tela inicial — abas, contagens, busca, ordenação e paginação.
 *
 * Este arquivo é puro de propósito: nada de React, nada de fetch, nada de
 * `window`. A §8.1 do plano exige prova de contagem (aba × SQL), de busca (termo
 * que só existe na legenda) e de ordenação; provar isso em teste de navegador é
 * caro e frágil, provar em função pura é barato e direto. A tela é uma casca
 * fina em cima daqui.
 *
 * Fonte dos dados: `GET /api/carrossel/carrosseis` (API do AutoClinic). Os
 * campos marcados como opcionais ainda não são devolvidos pela API em
 * `cf717c1`; quando passarem a ser, a tela os exibe sem mudança de código
 * (decisão e divergência registradas em docs/design/fase-1-decisoes.md).
 */

export const ESTADOS = [
  "a_produzir",
  "gerando",
  "pronta",
  "aguardando_aprovacao",
  "aprovada",
  "publicada",
] as const;

export type Estado = (typeof ESTADOS)[number];

/** Valores de `?estado=` reservados para o ambiente de dev (§2.6 / §8.1 item 9). */
export const ESTADOS_DEV = ["vazio", "carregando", "erro"] as const;
export type EstadoDev = (typeof ESTADOS_DEV)[number];

export interface CapaCarrossel {
  titulo?: string | null;
  fundo?: string | null;
  cor_texto?: string | null;
  slides?: number | null;
}

export interface Carrossel {
  id: string;
  titulo: string;
  estado: Estado;
  estado_em: string;
  atualizado_em: string;
  criado_em?: string | null;
  versao_atual?: number | null;
  slides: number;
  publico_ativo?: boolean | null;
  capa?: CapaCarrossel | null;
  /** Pauta de origem — a API ainda não devolve; a linha só aparece se existir. */
  pauta_titulo?: string | null;
  /** Legenda vigente — a API ainda não devolve (fase 4). */
  legenda?: string | null;
  hashtags?: string[] | null;
  /** Quantas fotos entraram na peça (§2.2, linha 4). */
  fotos?: number | null;
  /** Origem do lote (§2.4, filtro de fonte). */
  fonte?: string | null;
  publicada_em?: string | null;
  publico_token?: string | null;
}

export type Aba = "para_aprovar" | "a_produzir" | "aprovadas" | "todas";

export interface DefinicaoAba {
  chave: Aba;
  rotulo: string;
  estados: Estado[];
  /** Texto do vazio da aba quando ela não tem nada mas a organização tem peças. */
  vazio: string;
}

/**
 * As quatro abas (§2.3). `pronta` e `aguardando_aprovacao` se juntam em "Para
 * aprovar" porque, com uma pessoa só, os dois estados ficam a segundos de
 * distância — o que muda é se a legenda já existe. `Todas` inclui `publicada`,
 * que não tem aba própria.
 */
export const ABAS: DefinicaoAba[] = [
  {
    chave: "para_aprovar",
    rotulo: "Para aprovar",
    estados: ["aguardando_aprovacao", "pronta"],
    vazio: "Para aprovar",
  },
  { chave: "a_produzir", rotulo: "A produzir", estados: ["a_produzir", "gerando"], vazio: "A produzir" },
  { chave: "aprovadas", rotulo: "Aprovadas", estados: ["aprovada"], vazio: "Aprovadas" },
  { chave: "todas", rotulo: "Todas", estados: [...ESTADOS], vazio: "Todas" },
];

export const ABA_PADRAO: Aba = "para_aprovar";

export function ehAba(valor: unknown): valor is Aba {
  return typeof valor === "string" && ABAS.some((a) => a.chave === valor);
}

export function ehEstado(valor: unknown): valor is Estado {
  return typeof valor === "string" && (ESTADOS as readonly string[]).includes(valor);
}

export function ehEstadoDev(valor: unknown): valor is EstadoDev {
  return typeof valor === "string" && (ESTADOS_DEV as readonly string[]).includes(valor);
}

const ROTULO_ESTADO: Record<Estado, string> = {
  a_produzir: "A produzir",
  gerando: "Gerando",
  pronta: "Falta legenda",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovada: "Aprovada",
  publicada: "Publicada",
};

export function rotuloEstado(estado: Estado): string {
  return ROTULO_ESTADO[estado] ?? estado;
}

export function definicaoDaAba(aba: Aba): DefinicaoAba {
  return ABAS.find((a) => a.chave === aba) ?? ABAS[0];
}

/** Contagem por aba — o número que os chips mostram (§2.1, §2.3). */
export function contagensPorAba(lista: Carrossel[]): Record<Aba, number> {
  const saida = { para_aprovar: 0, a_produzir: 0, aprovadas: 0, todas: 0 } as Record<Aba, number>;
  for (const c of lista) {
    saida.todas += 1;
    if (c.estado === "aguardando_aprovacao" || c.estado === "pronta") saida.para_aprovar += 1;
    else if (c.estado === "a_produzir" || c.estado === "gerando") saida.a_produzir += 1;
    else if (c.estado === "aprovada") saida.aprovadas += 1;
  }
  return saida;
}

/** Contagem dos seis estados exatos — os chips do segundo nível. */
export function contagensPorEstado(lista: Carrossel[]): Record<Estado, number> {
  const saida = Object.fromEntries(ESTADOS.map((e) => [e, 0])) as Record<Estado, number>;
  for (const c of lista) if (saida[c.estado] !== undefined) saida[c.estado] += 1;
  return saida;
}

/** Itens de uma aba. Ordem preservada — quem ordena é `ordenar`. */
export function daAba(lista: Carrossel[], aba: Aba): Carrossel[] {
  const { estados } = definicaoDaAba(aba);
  return lista.filter((c) => estados.includes(c.estado));
}

/** Normaliza para busca: sem acento, minúsculo. "Ação" acha "acao". */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * O que a busca varre: título, legenda e hashtags (§2.4).
 *
 * A busca da galeria antiga filtrava só o título, no cliente, e por isso
 * "harmonização" achava a peça mas "protocolo" escrita na legenda não — o
 * critério 7 da §8.1 existe exatamente para isso.
 */
export function textoBuscavel(c: Carrossel): string {
  const partes = [c.titulo, c.legenda ?? "", c.pauta_titulo ?? "", (c.hashtags ?? []).join(" ")];
  return normalizar(partes.filter(Boolean).join(" \n "));
}

export function buscar(lista: Carrossel[], termo: string): Carrossel[] {
  const alvo = normalizar(termo);
  if (!alvo) return lista;
  const palavras = alvo.split(/\s+/).filter(Boolean);
  return lista.filter((c) => {
    const texto = textoBuscavel(c);
    return palavras.every((p) => texto.includes(p));
  });
}

export type Ordem = "atualizado" | "parado" | "publicacao" | "titulo";

export const ORDENS: { chave: Ordem; rotulo: string }[] = [
  { chave: "atualizado", rotulo: "Atualizado" },
  { chave: "parado", rotulo: "Mais antigo parado" },
  { chave: "publicacao", rotulo: "Data de publicação" },
  { chave: "titulo", rotulo: "Título A–Z" },
];

export const ORDEM_PADRAO: Ordem = "atualizado";

export function ehOrdem(valor: unknown): valor is Ordem {
  return typeof valor === "string" && ORDENS.some((o) => o.chave === valor);
}

function tempo(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Ordenação (§2.4). "Mais antigo parado" usa `estado_em` ascendente: é a
 * pergunta "o que está mofando", e `atualizado_em` não responde isso — uma peça
 * parada há dez dias pode ter sido apenas reaberta ontem.
 */
export function ordenar(lista: Carrossel[], ordem: Ordem): Carrossel[] {
  const copia = [...lista];
  switch (ordem) {
    case "parado":
      return copia.sort((a, b) => tempo(a.estado_em) - tempo(b.estado_em));
    case "publicacao":
      return copia.sort((a, b) => tempo(b.publicada_em) - tempo(a.publicada_em));
    case "titulo":
      return copia.sort((a, b) =>
        normalizar(a.titulo).localeCompare(normalizar(b.titulo), "pt-BR"),
      );
    case "atualizado":
    default:
      return copia.sort((a, b) => tempo(b.atualizado_em) - tempo(a.atualizado_em));
  }
}

export const POR_PAGINA = 24;

export interface Pagina<T> {
  itens: T[];
  pagina: number;
  paginas: number;
  total: number;
  /** "1–24 de 58" — rodapé em `tabular-nums`. */
  intervalo: string;
}

export function paginar<T>(itens: T[], pagina: number, porPagina = POR_PAGINA): Pagina<T> {
  const total = itens.length;
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const atual = Math.min(Math.max(1, Math.trunc(pagina) || 1), paginas);
  const inicio = (atual - 1) * porPagina;
  const fatia = itens.slice(inicio, inicio + porPagina);
  const primeiro = total === 0 ? 0 : inicio + 1;
  const ultimo = inicio + fatia.length;
  return {
    itens: fatia,
    pagina: atual,
    paginas,
    total,
    intervalo: `${primeiro}–${ultimo} de ${total}`,
  };
}

/** Parâmetros da lista como eles aparecem na URL (`?aba=`, `?q=`, ...). */
export interface ParametrosLista {
  aba: Aba;
  q: string;
  estado: Estado | null;
  ordem: Ordem;
  fonte: string | null;
  de: string | null;
  ate: string | null;
  pagina: number;
}

export const PARAMETROS_PADRAO: ParametrosLista = {
  aba: ABA_PADRAO,
  q: "",
  estado: null,
  ordem: ORDEM_PADRAO,
  fonte: null,
  de: null,
  ate: null,
  pagina: 1,
};

export interface ResultadoLista {
  /** Itens da página, já filtrados e ordenados. */
  itens: Carrossel[];
  /** Filtrados pela aba/busca/estado/fonte/período, antes da paginação. */
  filtrados: Carrossel[];
  contagens: Record<Aba, number>;
  porEstado: Record<Estado, number>;
  pagina: Pagina<Carrossel>;
  /** Quantos carrosséis a organização tem, ignorando a busca (para "Ver todas (58)"). */
  totalOrganizacao: number;
}

/**
 * Pipeline da tela: aba → estado exato → fonte → período → busca → ordem →
 * página. A ordem dos passos é a da §2.4 e importa: filtrar antes de ordenar
 * mantém a contagem dos chips independente do que está selecionado.
 */
export function aplicarParametros(
  lista: Carrossel[],
  params: ParametrosLista,
): ResultadoLista {
  const contagens = contagensPorAba(lista);
  const porEstado = contagensPorEstado(lista);

  let filtrados = daAba(lista, params.aba);
  if (params.estado) filtrados = filtrados.filter((c) => c.estado === params.estado);
  if (params.fonte) filtrados = filtrados.filter((c) => c.fonte === params.fonte);
  if (params.de) filtrados = filtrados.filter((c) => tempo(c.publicada_em) >= tempo(params.de));
  if (params.ate) {
    // Fim do dia: `ate=2026-11-12` inclui o que foi publicado às 23h.
    const fim = new Date(`${params.ate}T23:59:59`).getTime();
    filtrados = filtrados.filter((c) => tempo(c.publicada_em) <= fim);
  }
  if (params.q) filtrados = buscar(filtrados, params.q);
  filtrados = ordenar(filtrados, params.ordem);

  return {
    itens: paginar(filtrados, params.pagina).itens,
    filtrados,
    contagens,
    porEstado,
    pagina: paginar(filtrados, params.pagina),
    totalOrganizacao: lista.length,
  };
}

/* ------------------------------------------------------------------ *
 * Textos do cartão (§2.2)
 * ------------------------------------------------------------------ */

/** "há 2 h", "ontem", "há 3 dias" — relativo e curto, cabe na linha. */
export function quandoRelativo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "—";
  const minutos = Math.max(0, Math.round((Date.now() - data.getTime()) / 60000));
  if (minutos < 60) return minutos <= 1 ? "agora" : `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? "há 1 dia" : `há ${dias} dias`;
}

/** Linha 2: `7 slides · 1080×1350 · há 2 h`. */
export function linhaDeDensidade(c: Carrossel): string {
  const slides = `${c.slides} ${c.slides === 1 ? "slide" : "slides"}`;
  return `${slides} · 1080×1350 · ${quandoRelativo(c.atualizado_em)}`;
}

export const LIMITE_LEGENDA = 2200;

export interface ResumoLegenda {
  legenda: number;
  hashtags: number;
  fotos: number;
}

/**
 * Linha 4: `legenda 312/2.200 · 8 hashtags · 2 fotos`.
 *
 * Devolve `null` quando não há nada a dizer — a §2.2 manda a linha aparecer
 * "só quando existem", e "legenda 0/2.200" não informa nada.
 */
export function resumoDaPeca(c: Carrossel): ResumoLegenda | null {
  const legenda = (c.legenda ?? "").trim().length;
  const hashtags = c.hashtags?.length ?? 0;
  const fotos = c.fotos ?? 0;
  if (!legenda && !hashtags && !fotos) return null;
  return { legenda, hashtags, fotos };
}

export function textoResumoDaPeca(r: ResumoLegenda): string {
  const partes: string[] = [];
  if (r.legenda) partes.push(`legenda ${r.legenda}/${LIMITE_LEGENDA}`);
  if (r.hashtags) partes.push(`${r.hashtags} ${r.hashtags === 1 ? "hashtag" : "hashtags"}`);
  if (r.fotos) partes.push(`${r.fotos} ${r.fotos === 1 ? "foto" : "fotos"}`);
  return partes.join(" · ");
}

/** Tom estável por id — só quando o carrossel ainda não tem capa gravada. */
const TONS = ["#123B32", "#242743", "#3A2A1B", "#1B2532", "#2A1B2C", "#14262F"];

export function tomDeReserva(id: string): string {
  let soma = 0;
  for (let i = 0; i < id.length; i += 1) soma = (soma + id.charCodeAt(i)) % 9973;
  return TONS[soma % TONS.length];
}

/**
 * Cores da miniatura: capa gravada pelo servidor (§2.2, "renderizada do slide
 * 1") e, só na falta dela, o tom de reserva. Carrossel criado antes da coluna
 * `capa` existir cai no tom — mas o caminho normal é a cor real do slide 1, que
 * é o que o critério 6 mede.
 */
export function coresDaCapa(c: Carrossel): { fundo: string; texto: string; real: boolean } {
  const fundo = c.capa?.fundo;
  const texto = c.capa?.cor_texto;
  if (typeof fundo === "string" && fundo.trim()) {
    return { fundo, texto: typeof texto === "string" && texto.trim() ? texto : "#ffffff", real: true };
  }
  return { fundo: tomDeReserva(c.id), texto: "#ffffff", real: false };
}

/** Título dentro da miniatura: o do slide 1 quando existe. */
export function tituloDaCapa(c: Carrossel): string {
  const t = c.capa?.titulo;
  return typeof t === "string" && t.trim() ? t : c.titulo;
}
