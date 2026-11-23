/**
 * "Minhas pautas" — as ideias que o próprio usuário salvou.
 *
 * Por que existe: a fonte de pauta era notícia (Google News, via fila de outro
 * produto), e notícia não gera carrossel viral de engajamento — gera ruído. A
 * substituição mais simples para quem não é técnico é a que não pede conta nova
 * nem tela nova: o campo de tema livre que já existe, mais um atalho com as
 * pautas que a pessoa já escreveu e quer reaproveitar.
 *
 * Fica no `localStorage` de propósito: sem tabela, sem migração, sem chamada de
 * rede. O custo disso é honesto e conhecido — pauta salva num navegador não
 * aparece em outro. Quando isso incomodar, o passo seguinte é gravar na API
 * (`/conteudo/pautas`), e aí sim há migração.
 *
 * As funções puras (`lerPautas`, `adicionarPauta`, `removerPauta`) existem para
 * poder testar sem navegador: `npx tsx src/lib/estudio/pautas-salvas.test.ts`.
 */

export const CHAVE_PAUTAS = "carrossel:pautas-do-usuario";

/** Teto de atalhos na tela: acima disso deixa de ser atalho e vira lista. */
export const MAX_PAUTAS = 8;

/** Tamanho mínimo para a pauta valer como atalho (mesmo do gerador). */
export const MIN_PAUTA = 3;

/** Limite de cada pauta, igual ao do campo de tema do estúdio. */
export const MAX_PAUTA = 400;

/**
 * Lê a lista do que veio do armazenamento. Aceita string JSON, array já
 * parseado, ou lixo — e nunca lança: um valor corrompido não pode impedir o
 * estúdio de abrir.
 */
export function lerPautas(bruto: unknown): string[] {
  let lista: unknown = bruto;
  if (typeof bruto === "string") {
    try {
      lista = JSON.parse(bruto);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(lista)) return [];

  const vistas = new Set<string>();
  const saida: string[] = [];
  for (const item of lista) {
    if (typeof item !== "string") continue;
    const limpa = item.trim().slice(0, MAX_PAUTA);
    if (limpa.length < MIN_PAUTA) continue;
    const chave = limpa.toLowerCase();
    if (vistas.has(chave)) continue;
    vistas.add(chave);
    saida.push(limpa);
    if (saida.length === MAX_PAUTAS) break;
  }
  return saida;
}

/**
 * Adiciona no topo, sem duplicar (comparação sem caixa e sem espaço nas pontas).
 * Pauta repetida apenas sobe para o topo — é o que a pessoa quis dizer ao salvar
 * de novo.
 */
export function adicionarPauta(lista: string[], nova: string): string[] {
  const limpa = nova.trim().slice(0, MAX_PAUTA);
  if (limpa.length < MIN_PAUTA) return lista;
  const semEla = lista.filter((p) => p.trim().toLowerCase() !== limpa.toLowerCase());
  return [limpa, ...semEla].slice(0, MAX_PAUTAS);
}

export function removerPauta(lista: string[], alvo: string): string[] {
  const chave = alvo.trim().toLowerCase();
  return lista.filter((p) => p.trim().toLowerCase() !== chave);
}

/** Lê do navegador. Fora do navegador (SSR, teste) devolve lista vazia. */
export function carregarPautas(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return lerPautas(window.localStorage.getItem(CHAVE_PAUTAS));
  } catch {
    return [];
  }
}

/** Grava no navegador. Falha de armazenamento (modo privado, cota) é silenciosa. */
export function salvarPautas(lista: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CHAVE_PAUTAS, JSON.stringify(lista));
  } catch {
    /* sem espaço ou sem permissão: o atalho é conveniência, não caminho crítico */
  }
}
