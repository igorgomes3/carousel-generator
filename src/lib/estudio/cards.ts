/**
 * Quantidade de cards e foto por card — o passo 2 do wizard (issue #11).
 *
 * O que o alvo faz e a gente copia: no passo "Tema" ele deixa escolher quantos
 * cards o carrossel tem (padrão 7) e subir uma foto por card antes de gerar o
 * roteiro. A foto entra no card depois, como fundo.
 *
 * Por que este arquivo existe separado da tela: as duas regras que erram fácil
 * são numéricas — o intervalo de cards e o teto de tamanho do arquivo. Aqui
 * elas são funções puras, provadas em `cards.test.ts`, e a tela (e a rota
 * `/api/gerar`) usam as mesmas. Sem isso, o seletor aceitaria 40 cards e a rota
 * devolveria 5: a pessoa pede uma coisa e recebe outra.
 *
 * Nada de `fs`, nada de `next/*`, nada de React: isto roda no servidor e no
 * navegador.
 */
import type { SlideCarrossel } from "@/lib/estudio/tipos";

/** Piso do alvo é 5, mas o produto já nasce em 3: capa + 1 conteúdo + CTA. */
export const MIN_CARDS = 3;
export const MAX_CARDS = 10;
/** Padrão do alvo (`Slides −/+ (padrão 7)`), medido na REA autenticada. */
export const CARDS_PADRAO = 7;

/**
 * Teto de tamanho do arquivo que a pessoa escolhe.
 *
 * 8 MB: foto de celular (iPhone 12 MP em HEIC→JPG ronda 2–4 MB; Android com
 * 48 MP passa de 10 MB) cabe na maioria dos casos, e o que passa é recusado com
 * número na tela em vez de travar o upload em silêncio. Depois de escolhido, o
 * arquivo é reduzido no navegador antes de virar `data:` — 10 fotos de 8 MB em
 * base64 seriam ~106 MB de corpo no `POST` do salvamento.
 */
export const TAMANHO_MAX_MB = 8;
export const TAMANHO_MAX_BYTES = TAMANHO_MAX_MB * 1024 * 1024;

/**
 * Teto do arquivo JÁ reduzido no navegador. É o que garante que 10 cards com
 * foto continuam num `POST` que o servidor aceita sem chorar.
 */
export const TETO_REDUZIDO_BYTES = 2 * 1024 * 1024;

/** Tipos que o card aceita como fundo. HEIC fica de fora: navegador não decodifica. */
export const FORMATOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"] as const;
export const EXTENSOES_ACEITAS = ["jpg", "jpeg", "png", "webp"] as const;

/** O `accept` do `<input type="file">` — uma fonte só, sem string duplicada. */
export const ACCEPT_IMAGEM = FORMATOS_ACEITOS.join(",");

/** "JPG, PNG ou WebP" — a frase que aparece na tela. */
export const FORMATOS_LEGIVEIS = "JPG, PNG ou WebP";

export interface Recusa {
  ok: false;
  /** Frase pronta para a tela, em linguagem de gente. */
  motivo: string;
}

/**
 * Trava a quantidade no intervalo do produto.
 *
 * Aceita qualquer coisa que chegue de fora (query string, JSON de rota, valor
 * de stepper) e devolve inteiro dentro de [MIN_CARDS, MAX_CARDS]. `null`,
 * `"abc"` e `NaN` caem no padrão — nunca em 0 cards, que desenharia tela vazia.
 */
export function limitarQuantidade(valor: unknown): number {
  const numero =
    typeof valor === "number"
      ? valor
      : typeof valor === "string" && valor.trim() !== ""
        ? Number(valor)
        : NaN;
  if (!Number.isFinite(numero)) return CARDS_PADRAO;
  return Math.min(MAX_CARDS, Math.max(MIN_CARDS, Math.round(numero)));
}

/** Card em branco do tipo pedido — usado quando a IA devolve menos cards que o escolhido. */
export function cardVazio(tipo: SlideCarrossel["tipo"]): SlideCarrossel {
  return { tipo, titulo: "", corpo: "", imagem: null };
}

/**
 * Deixa o carrossel EXATAMENTE com `quantidade` cards.
 *
 * Por que não confiar no que a IA devolve: o pipeline de 6 etapas escreve o
 * número de slides que o modelo quiser — pedimos 4 e vêm 8. Se o card 1 é capa
 * e o último é o CTA, sobrar ou faltar card no meio é o único lugar onde dá
 * para mexer sem quebrar a peça. Então: mantém capa e CTA, corta ou completa o
 * miolo. Card que falta nasce vazio (editável no resultado), não é inventado.
 */
export function ajustarQuantidade(slides: SlideCarrossel[], quantidade: number): SlideCarrossel[] {
  const total = limitarQuantidade(quantidade);
  const origem = (slides ?? []).filter(Boolean);

  if (origem.length === 0) {
    const vazios = Array.from({ length: total }, () => cardVazio("conteudo"));
    vazios[0] = cardVazio("capa");
    if (total > 1) vazios[total - 1] = cardVazio("cta");
    return vazios;
  }

  const capa: SlideCarrossel = { ...origem[0], tipo: "capa" };
  // Com um slide só não existe CTA separado: a capa é o carrossel inteiro.
  const temCta = origem.length > 1;
  const ultimo: SlideCarrossel | null = temCta ? { ...origem[origem.length - 1], tipo: "cta" } : null;

  const miolo: SlideCarrossel[] = origem
    .slice(1, temCta ? origem.length - 1 : origem.length)
    .map((s) => ({ ...s, tipo: "conteudo" }));

  const espaco = total - (temCta ? 2 : 1);

  while (miolo.length < espaco) miolo.push(cardVazio("conteudo"));
  while (miolo.length > espaco) miolo.pop();

  return ultimo ? [capa, ...miolo, ultimo] : [capa, ...miolo];
}

/**
 * Ajusta a lista de fotos ao número de cards.
 *
 * Encolher o carrossel de 7 para 4 não pode apagar a foto do card 1: corta o
 * fim. Aumentar não pode herdar imagem de card que não existe: completa com
 * `null`.
 */
export function redimensionarImagens(
  imagens: (string | null)[],
  quantidade: number,
): (string | null)[] {
  const total = limitarQuantidade(quantidade);
  const saida = (imagens ?? []).slice(0, total);
  while (saida.length < total) saida.push(null);
  return saida;
}

/** Nome do card na tela: 1 é a capa, o último é o CTA. */
export function rotuloDoCard(indice: number, total: number): string {
  if (indice === 0) return "Capa";
  if (indice === total - 1 && total > 1) return "Último card";
  return `Card ${indice + 1}`;
}

/**
 * Complemento pronto para `aria-label`: "da capa", "do card 3", "do último card".
 *
 * Existe porque "Escolher imagem do Capa" é o tipo de texto que denuncia
 * concatenação de rótulo — e quem usa leitor de tela ouve isso em cada card.
 */
export function alvoDaImagem(indice: number, total: number): string {
  if (indice === 0) return "da capa";
  if (total > 1 && indice === total - 1) return "do último card";
  return `do card ${indice + 1}`;
}

/** "1,4 MB" — tamanho em linguagem de gente, para a mensagem de recusa. */
export function tamanhoLegivel(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${mb.toFixed(1).replace(".", ",")} MB`;
}

function extensaoDe(nome: string | undefined): string {
  const ponto = (nome ?? "").lastIndexOf(".");
  return ponto >= 0 ? (nome ?? "").slice(ponto + 1).toLowerCase() : "";
}

/**
 * Recusa o arquivo ANTES de ler os bytes, com motivo em português.
 *
 * Duas perguntas só: "o navegador sabe decodificar isso?" e "cabe no teto?".
 * O tipo pode vir vazio (arquivo arrastado de alguns lugares), então a extensão
 * serve de segunda opinião — recusar um `.jpg` bom por causa de `type` vazio
 * seria mentir para a pessoa.
 */
export function validarArquivo(arquivo: {
  nome?: string;
  tipo?: string;
  tamanho: number;
}): { ok: true } | Recusa {
  const tipo = (arquivo.tipo ?? "").toLowerCase();
  const extensao = extensaoDe(arquivo.nome);
  const tipoAceito = (FORMATOS_ACEITOS as readonly string[]).includes(tipo);
  const extensaoAceita = (EXTENSOES_ACEITAS as readonly string[]).includes(extensao);

  if (!tipoAceito && !extensaoAceita) {
    return {
      ok: false,
      motivo: `Esse arquivo não é uma imagem que a gente abre. Use ${FORMATOS_LEGIVEIS}.`,
    };
  }

  if (arquivo.tamanho > TAMANHO_MAX_BYTES) {
    return {
      ok: false,
      motivo: `Essa imagem tem ${tamanhoLegivel(arquivo.tamanho)} e o limite é ${TAMANHO_MAX_MB} MB por card. Escolha uma menor — no celular, a versão “compartilhar” costuma já vir reduzida.`,
    };
  }

  return { ok: true };
}

/** Recusa de quem JÁ foi reduzido no navegador e ainda ficou grande demais. */
export const RECUSA_APOS_REDUCAO =
  "Não conseguimos reduzir essa imagem o suficiente para o card. Tente outra foto.";
