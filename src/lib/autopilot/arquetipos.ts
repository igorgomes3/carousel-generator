/**
 * Os cinco arquétipos de pauta, em rotação.
 *
 * Por que fixos no código e não "deixe a IA escolher": sem rotação, três dias
 * seguidos saem "5 erros que…", "5 dicas para…", "5 sinais de…". O modelo não tem
 * memória do que publicou ontem; a rotação é do produto, não do prompt.
 *
 * A escolha do dia é determinística (`indice % 5`), então o mesmo dia nunca sai
 * com dois arquétipos diferentes, e a sequência é previsível para quem acompanha.
 */
export interface Arquetipo {
  id: string;
  nome: string;
  /** Instrução que entra no prompt da pauta. */
  direcao: string;
}

export const ARQUETIPOS: Arquetipo[] = [
  {
    id: "mito-verdade",
    nome: "Mito vs verdade",
    direcao:
      "Contrarie uma crença comum do nicho e mostre o que realmente acontece. Nada de 'dicas': o post existe para corrigir uma ideia errada.",
  },
  {
    id: "passo-a-passo",
    nome: "Passo a passo prático",
    direcao:
      "Ensine um processo concreto, na ordem em que se faz, com o critério de decisão em cada passo. O leitor precisa conseguir executar hoje.",
  },
  {
    id: "erro-comum",
    nome: "Erro comum do público",
    direcao:
      "Mostre um erro que o público comete de boa-fé, o custo real dele e como sair. Sem julgamento moral, com consequência concreta.",
  },
  {
    id: "caso-real",
    nome: "Caso real / exemplo",
    direcao:
      "Conte um caso verossímil (sem inventar número de cliente real): situação, decisão tomada, resultado e o que se aprende. Se citar valor, deixe claro que é exemplo.",
  },
  {
    id: "lista-contraria",
    nome: "Lista contrária",
    direcao:
      "Uma lista que vai contra o senso comum do nicho, com o motivo de cada item. Não é polêmica gratuita: cada item precisa de justificativa defensável.",
  },
];

/** Arquétipo do dia — determinístico por data e por perfil. */
export function arquetipoDoDia(data: Date, semente: string): Arquetipo {
  const dia = Math.floor(
    Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()) / 86_400_000,
  );
  // A semente evita que todos os perfis do sistema publiquem o mesmo arquétipo
  // no mesmo dia — a lista fica menos óbvia para quem acompanha dois perfis.
  const s = Array.from(semente).reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) % 9973, 7);
  return ARQUETIPOS[(dia + s) % ARQUETIPOS.length];
}
