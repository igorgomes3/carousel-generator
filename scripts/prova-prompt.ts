/**
 * Mostra o prompt que a etapa 3 (copy) recebe, para revisão.
 *
 * Uso: npx tsx scripts/prova-prompt.ts [formato]
 * Sem chamada de modelo, sem custo — só monta o texto.
 */
import { promptDeCopy, promptDeEmergencia, type ResultadoConteudo } from "../src/lib/conteudo";

const temas: { tema: string; nicho: string; formato: string; gancho: string }[] = [
  {
    tema: "Como fidelizar seus clientes da sua clínica de estética",
    nicho: "clinica-saude",
    formato: "lista",
    gancho: "A cliente não some por preço. Ela some por silêncio.",
  },
  {
    tema: "Como fidelizar seus clientes da sua clínica de estética",
    nicho: "clinica-saude",
    formato: "cheat-sheet",
    gancho: "O que perguntar na primeira sessão para a cliente voltar",
  },
  {
    tema: "Como fidelizar seus clientes da sua clínica de estética",
    nicho: "clinica-saude",
    formato: "opiniao",
    gancho: "Desconto não fideliza. Ele treina a cliente a esperar o próximo.",
  },
];

for (const caso of temas) {
  const briefing = { tema: caso.tema, slides: 8, nicho: caso.nicho, formato: caso.formato };
  const r: ResultadoConteudo = {
    ideia: {
      publico: "donas de clínica de estética com agenda irregular",
      dor: "a cliente some depois da terceira sessão e a agenda do mês fecha no aperto",
      promessa: "identificar a cliente que está prestes a sumir antes de ela sumir",
      angulo: "fidelização começa no silêncio entre uma sessão e outra, não no preço",
      gancho: caso.gancho,
      ganchos: [caso.gancho],
      tom: "direto",
    },
    plano: {
      slides: [
        { posicao: 1, funcao: "gancho", ideia: caso.gancho, elemento_sugerido: "titulo+subtitulo" },
        { posicao: 2, funcao: "desenvolvimento", ideia: "o silêncio da segunda semana", elemento_sugerido: "titulo+descricao" },
        { posicao: 3, funcao: "desenvolvimento", ideia: "o que a cliente não fala no balcão", elemento_sugerido: "titulo+descricao" },
        { posicao: 4, funcao: "desenvolvimento", ideia: "o follow-up que não parece cobrança", elemento_sugerido: "titulo+descricao" },
        { posicao: 5, funcao: "virada", ideia: "quem volta não volta pelo procedimento", elemento_sugerido: "subtitulo+descricao" },
        { posicao: 6, funcao: "desenvolvimento", ideia: "a mensagem certa no dia certo", elemento_sugerido: "titulo+descricao" },
        { posicao: 7, funcao: "desenvolvimento", ideia: "o erro de prometer retorno em 7 dias", elemento_sugerido: "titulo+descricao" },
        { posicao: 8, funcao: "cta", ideia: "salvar o roteiro", elemento_sugerido: "titulo+descricao" },
      ],
    },
    criativo: null,
    publicacao: null,
    falhas: [],
  };
  console.log(`\n\n===================== FORMATO: ${caso.formato} =====================\n`);
  console.log(promptDeCopy(briefing, r));
}

console.log("\n\n===================== PROMPT DE EMERGÊNCIA (plano B) =====================\n");
console.log(promptDeEmergencia({ tema: temas[0]!.tema, slides: 8, nicho: "clinica-saude", formato: "lista" }));
