/**
 * Catálogo de CTA para o último card.
 *
 * Decisão de produto (25/11/2026): todo carrossel termina com um CTA — não com um
 * resumo. O último card é o único lugar onde pedir ação é natural, e sem ele o
 * carrossel informa e não converte.
 *
 * Regra de implementação: **prompt pede, código garante.** O modelo pode ignorar
 * a instrução; `aplicarCtaNoUltimoSlide()` reescreve o último card a partir do
 * catálogo, então o CTA nunca falta. O texto continua editável na tela.
 *
 * Os cinco arquétipos abaixo são os formatos de CTA que mais aparecem em perfis
 * grandes de Instagram: pergunta, palavra-chave na DM, seguir, salvar e
 * compartilhar. A escolha é determinística pelo tema para o carrossel não sair
 * sempre com o mesmo fecho.
 */

export type TipoCta = "pergunta" | "palavra-chave" | "seguir" | "salvar" | "compartilhar";

export interface ArquétipoCta {
  id: TipoCta;
  nome: string;
  /** Por que funciona — vai no comentário do código, não na tela. */
  motivo: string;
  /** Molde do título; `{tema}` vira o assunto em minúsculas. */
  titulo: (tema: string) => string;
  /** Molde do corpo (o que a pessoa lê abaixo do título). */
  corpo: (tema: string) => string;
}

export const CATALOGO_CTA: ArquétipoCta[] = [
  {
    id: "pergunta",
    nome: "Pergunta",
    motivo:
      "Pergunta aberta sobre o próprio conteúdo puxa comentário sem exigir nada — é o CTA de menor atrito.",
    titulo: () => "E você, o que acha disso?",
    corpo: () =>
      "Comenta aqui embaixo o que já aconteceu com você. A resposta de cada um ajuda quem está lendo a decidir.",
  },
  {
    id: "palavra-chave",
    nome: "Palavra-chave na DM",
    motivo:
      "Palavra única + entrega no direct transforma leitor em conversa; é o CTA que mais gera lead qualificado.",
    titulo: () => "Comente “QUERO” que eu te mando",
    corpo: () =>
      "Escreve a palavra QUERO nos comentários e eu envio no seu privado o passo a passo completo deste assunto.",
  },
  {
    id: "seguir",
    nome: "Seguir o perfil",
    motivo:
      "Fecha o carrossel em audiência: quem chegou até o último card já provou interesse, então o pedido é barato.",
    titulo: () => "Me segue para não perder o próximo",
    corpo: () =>
      "Todo dia tem um carrossel assim, direto ao ponto. Segue o perfil para receber o próximo na sua timeline.",
  },
  {
    id: "salvar",
    nome: "Salvar o post",
    motivo:
      "Salvar é o sinal que mais pesa no alcance e o mais fácil de pedir: não expõe a pessoa em público.",
    titulo: () => "Salve para usar quando precisar",
    corpo: () =>
      "Salva este post: quando o assunto aparecer na sua mesa, você abre e segue o passo a passo sem procurar de novo.",
  },
  {
    id: "compartilhar",
    nome: "Compartilhar",
    motivo:
      "Compartilhar leva o conteúdo para fora do perfil — é o CTA que traz gente nova em vez de só aquecer quem já segue.",
    titulo: () => "Manda para quem precisa ler isso",
    corpo: () =>
      "Tem alguém do seu time que vive esse problema? Envia este post para essa pessoa agora, antes que ela passe pelo mesmo erro.",
  },
];

/** Soma estável do tema — mesma entrada, mesmo CTA. */
function semente(texto: string): number {
  return Array.from(texto.toLowerCase()).reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) % 100003, 17);
}

/** CTA do carrossel: determinístico pelo tema. */
export function escolherCta(tema: string): ArquétipoCta {
  const limpo = (tema ?? "").trim();
  if (!limpo) return CATALOGO_CTA[3];
  return CATALOGO_CTA[semente(limpo) % CATALOGO_CTA.length];
}

export function ctaPorId(id: string | null | undefined): ArquétipoCta | null {
  if (!id) return null;
  return CATALOGO_CTA.find((c) => c.id === id) ?? null;
}

/**
 * Instrução que entra no prompt de copy — para o modelo já nascer com o CTA
 * certo e o último slide não virar "resumo do que foi dito".
 */
export function instrucaoCta(tema: string, tipoForcado?: TipoCta | null): string {
  const arquetipo = ctaPorId(tipoForcado ?? null) ?? escolherCta(tema);
  return `O ÚLTIMO slide é CTA (tipo "${arquetipo.nome}"). Use esta mensagem como base, adaptando ao tema:
  título: ${arquetipo.titulo(tema)}
  corpo: ${arquetipo.corpo(tema)}
Nunca feche o carrossel com resumo. O último card pede UMA ação.`;
}

/** O título já pede ação? Se sim, o CTA do modelo é melhor que o molde. */
const PEDE_ACAO =
  /\b(coment|salv|segue|siga|compartilh|manda|envia|chama|clica|baixa|marca|responde|me conta|me diz)\w*/i;

export function tituloPedeAcao(titulo: string | null | undefined): boolean {
  return PEDE_ACAO.test((titulo ?? "").trim());
}

/**
 * Garante CTA no último card.
 *
 * Regra: se o modelo já escreveu um título que pede ação, ele fica — texto do
 * modelo costuma ser mais natural que molde. Se não pediu, o card é reescrito a
 * partir do catálogo. Assim a promessa "todo carrossel termina com CTA" não
 * depende do humor do modelo.
 */
export function aplicarCtaNoUltimoSlide<
  T extends { tipo: "capa" | "conteudo" | "cta"; titulo: string; corpo: string },
>(slides: T[], tema: string, tipoForcado?: TipoCta | null): T[] {
  if (slides.length === 0) return slides;
  const ultimo = slides[slides.length - 1];
  if (tituloPedeAcao(ultimo.titulo)) {
    // Mantém o texto, mas o TIPO precisa estar certo para o card desenhar como CTA.
    return [...slides.slice(0, -1), { ...ultimo, tipo: "cta" as const }];
  }

  const arquetipo = ctaPorId(tipoForcado ?? null) ?? escolherCta(tema);
  return [
    ...slides.slice(0, -1),
    {
      ...ultimo,
      tipo: "cta" as const,
      titulo: arquetipo.titulo(tema),
      corpo: arquetipo.corpo(tema),
    },
  ];
}
