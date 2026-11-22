/**
 * Contrato do projeto salvo no estúdio.
 *
 * Por que existe: até aqui o carrossel do estúdio era descartável — gerava,
 * mostrava, baixava e sumia ao fechar a aba. Este arquivo é o formato que
 * sobrevive: cards (texto), imagens, template (paleta + fontes) e o nome.
 *
 * O que entra aqui é só o que a tela precisa: nada de `fs`, nada de `next/*`.
 * Assim a lista, o estúdio e as rotas de API falam o mesmo contrato e as
 * funções de texto podem ser provadas em teste puro (§ issue #13).
 */
import type { SlideCarrossel } from "@/lib/estudio/tipos";
import type { EstiloEscolhido } from "@/lib/estudio/estilo";

/** Um projeto como ele fica gravado. */
export interface ProjetoSalvo {
  id: string;
  nome: string;
  /** O template guarda a paleta e as duas fontes — não duplicamos cor nem fonte. */
  templateId: string;
  /** O que a pessoa escreveu no passo 2 ("5 erros que…"). */
  tema: string;
  slides: SlideCarrossel[];
  criadoEm: string;
  atualizadoEm: string;
  /** Quando o último salvamento explícito aconteceu. É o que a tela mostra. */
  salvoEm: string;
  /** Sobe a cada salvamento; serve para detectar gravação fora de ordem. */
  versao: number;
  /**
   * Handle do perfil sem `@` (issue #12). `undefined` em projeto gravado antes
   * da issue: o card abre sem @, que é o comportamento de antes.
   */
  arroba?: string;
  /** Curadoria de fundo/destaque/fonte por id (issue #12). Ids, nunca hex. */
  estilo?: EstiloEscolhido;
}

/**
 * O que a lista precisa de um projeto: identificação, data e a capa para a
 * miniatura. `capa` já vem pronta do servidor (primeiro card) porque a lista
 * não deve baixar dez slides para desenhar uma miniatura.
 */
export interface ResumoProjeto {
  id: string;
  nome: string;
  templateId: string;
  tema: string;
  slides: number;
  atualizadoEm: string;
  salvoEm: string;
  capa: SlideCarrossel;
}

export const NOME_SEM_TITULO = "Carrossel sem título";
export const LIMITE_NOME = 80;
export const LIMITE_SLIDES = 20;

/** Nome padrão: a manchete do primeiro card, sem marcação do renderizador. */
export function nomePadrao(slides: SlideCarrossel[], tema = ""): string {
  const primeiro = slides[0]?.titulo ?? "";
  const limpo = primeiro.replace(/\(\(U:([^)]+)\)\)/g, "$1").replace(/\*\*/g, "").trim();
  const base = limpo || tema.trim();
  if (!base) return NOME_SEM_TITULO;
  if (base.length <= 60) return base;
  const corte = base.slice(0, 60);
  const espaco = corte.lastIndexOf(" ");
  return `${(espaco > 24 ? corte.slice(0, espaco) : corte).trim()}…`;
}

/** Nome normalizado para gravar: sem espaços sobrando, com teto de tamanho. */
export function nomeLimpo(nome: unknown, alternativa: string): string {
  const texto = typeof nome === "string" ? nome.replace(/\s+/g, " ").trim() : "";
  if (!texto) return alternativa;
  return texto.slice(0, LIMITE_NOME);
}

const dois = (n: number) => String(n).padStart(2, "0");

/** "14:32" no fuso de quem está olhando — não no fuso do servidor. */
export function horaCurta(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${dois(d.getHours())}:${dois(d.getMinutes())}`;
}

function mesmoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * O texto do salvamento. Pedido do CEO na issue: "salvo às 14:32", visível.
 *
 * Hoje mostra a hora; ontem e antes disso ganham o dia, porque "salvo às 14:32"
 * de três dias atrás seria mentira por omissão.
 */
export function quandoSalvo(iso: string | null | undefined, agora = new Date()): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const ontem = new Date(agora.getTime() - 86_400_000);
  if (mesmoDia(d, agora)) return `Salvo às ${horaCurta(iso)}`;
  if (mesmoDia(d, ontem)) return `Salvo ontem às ${horaCurta(iso)}`;
  const dia = `${dois(d.getDate())}/${dois(d.getMonth() + 1)}`;
  const ano = d.getFullYear() === agora.getFullYear() ? "" : `/${d.getFullYear()}`;
  return `Salvo em ${dia}${ano} às ${horaCurta(iso)}`;
}

/** Data da lista: "hoje", "ontem", "12/11" — o que responde "quando eu mexi nisso". */
export function dataCurta(iso: string | null | undefined, agora = new Date()): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (mesmoDia(d, agora)) return `hoje, ${horaCurta(iso)}`;
  const ontem = new Date(agora.getTime() - 86_400_000);
  if (mesmoDia(d, ontem)) return `ontem, ${horaCurta(iso)}`;
  const ano = d.getFullYear() === agora.getFullYear() ? "" : `/${d.getFullYear()}`;
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}${ano}`;
}

/** "6 cards" — plural certo, porque a lista é lida por gente. */
export function contagemDeCards(n: number): string {
  return `${n} ${n === 1 ? "card" : "cards"}`;
}

/**
 * Valida o que o cliente mandou. Não usa Zod de propósito: o schema do projeto
 * é pequeno e o formato do slide já é validado no gerador; aqui a pergunta é só
 * "dá para desenhar isso?", e uma resposta caseira devolve erro em pt-BR.
 */
export function normalizarSlides(entrada: unknown): SlideCarrossel[] | null {
  if (!Array.isArray(entrada) || entrada.length === 0 || entrada.length > LIMITE_SLIDES) {
    return null;
  }
  const saida: SlideCarrossel[] = [];
  for (const item of entrada) {
    if (!item || typeof item !== "object") return null;
    const s = item as Partial<SlideCarrossel>;
    const tipo = s.tipo === "capa" || s.tipo === "cta" ? s.tipo : "conteudo";
    const titulo = typeof s.titulo === "string" ? s.titulo : "";
    const corpo = typeof s.corpo === "string" ? s.corpo : "";
    const imagem = typeof s.imagem === "string" && s.imagem.trim() ? s.imagem : null;
    if (!titulo.trim() && !corpo.trim() && !imagem) return null;
    saida.push({ tipo, titulo, corpo, imagem });
  }
  return saida;
}
