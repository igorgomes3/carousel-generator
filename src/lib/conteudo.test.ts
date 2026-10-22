/**
 * Teste do pipeline de conteúdo.
 *
 * Verifica o que dá para verificar sem gastar chamada de modelo: os schemas, o
 * prompt que a etapa 3 recebe, e o comportamento quando uma etapa falha.
 * O resto é validação manual (custo de token real).
 *
 * Rodar: npx tsx src/lib/conteudo.test.ts
 */
import {
  IdeiaSchema,
  PlanoSchema,
  CriativoSchema,
  PublicacaoSchema,
  promptDeCopy,
  type ResultadoConteudo,
} from "./conteudo";

let falhas = 0;

function ok(nome: string, condicao: boolean, detalhe = "") {
  if (condicao) {
    console.log(`  ok   ${nome}`);
    return;
  }
  falhas += 1;
  console.log(`  FALHA ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
}

const ideia = {
  publico: "donas de clínica de estética em Fortaleza",
  dor: "depende de indicação e o mês fecha no aperto",
  promessa: "saber quantos pacientes o mês precisa para fechar no azul",
  angulo: "o número que a clínica precisa antes de investir em anúncio",
  tom: "direto" as const,
};

const plano = {
  slides: [
    { posicao: 1, funcao: "gancho" as const, ideia: "a conta que ninguém faz", elemento_sugerido: "titulo" as const },
    { posicao: 2, funcao: "contexto" as const, ideia: "o custo fixo da clínica", elemento_sugerido: "titulo+descricao" as const },
    { posicao: 3, funcao: "virada" as const, ideia: "quantos pacientes cobrem o custo", elemento_sugerido: "titulo+descricao" as const },
    { posicao: 4, funcao: "cta" as const, ideia: "calcule o seu", elemento_sugerido: "titulo" as const },
  ],
};

console.log("\n1. Schemas aceitam saída bem formada");
{
  ok("IdeiaSchema", IdeiaSchema.safeParse(ideia).success);
  ok("PlanoSchema", PlanoSchema.safeParse(plano).success);
  ok(
    "CriativoSchema",
    CriativoSchema.safeParse({
      paleta_sugerida: "livre",
      ritmo: "contido",
      imagem: "nenhuma",
      justificativa: "o texto carrega o peso",
    }).success,
  );
  ok(
    "PublicacaoSchema",
    PublicacaoSchema.safeParse({
      legenda: "A conta que toda clínica deveria fazer antes de anunciar.",
      hashtags: ["#estetica", "#clinica", "#fortaleza"],
      melhor_horario: "19h, quando a dona da clínica já fechou o caixa",
    }).success,
  );
}

console.log("\n2. Schemas rejeitam saída fora do contrato");
{
  // O modelo erra o enum de `tom` com frequência — escreve uma justificativa em
  // vez da palavra-chave. Isso NÃO pode derrubar o pipeline: é normalizado.
  const casoReal = IdeiaSchema.safeParse({
    ...ideia,
    tom: "Direto, de colega de profissão para colega. Frase curta, zero emoji de foguete.",
  });
  ok("tom com justificativa é normalizado para 'direto'", casoReal.success && casoReal.data.tom === "direto");

  const provoc = IdeiaSchema.safeParse({ ...ideia, tom: "Provocativo, para incomodar" });
  ok("tom com palavra-chave é reconhecido", provoc.success && provoc.data.tom === "provocativo");

  const nada = IdeiaSchema.safeParse({ ...ideia, tom: "sei lá" });
  ok("tom irreconhecível cai em 'direto'", nada.success && nada.data.tom === "direto");

  ok("tom ausente é rejeitado", !IdeiaSchema.safeParse({ ...ideia, tom: undefined }).success);
  ok(
    "plano com 2 slides é rejeitado (mínimo 3)",
    !PlanoSchema.safeParse({ slides: plano.slides.slice(0, 2) }).success,
  );
  ok(
    "plano com 13 slides é rejeitado (máximo 12)",
    !PlanoSchema.safeParse({
      slides: Array.from({ length: 13 }, (_, i) => ({
        funcao: "desenvolvimento",
        ideia: `s${i}`,
        elemento_sugerido: "titulo",
      })),
    }).success,
  );

  // Tolerância a ruído do modelo: os três casos abaixo quebravam o pipeline
  // antes e agora são normalizados.
  const semPosicao = PlanoSchema.safeParse({
    slides: plano.slides.map(({ posicao, ...resto }) => resto),
  });
  ok(
    "posicao ausente é derivada do índice",
    semPosicao.success && semPosicao.data.slides[0]!.posicao === 1 && semPosicao.data.slides[3]!.posicao === 4,
  );

  const funcaoRuim = PlanoSchema.safeParse({
    slides: [
      { funcao: "introdução do assunto", ideia: "x", elemento_sugerido: "titulo" },
      { funcao: "miolo", ideia: "y", elemento_sugerido: "titulo" },
      { funcao: "chamada para ação", ideia: "z", elemento_sugerido: "titulo" },
    ],
  });
  ok("funcao em texto livre é normalizada", funcaoRuim.success, JSON.stringify(funcaoRuim.success ? "" : funcaoRuim.error.issues));

  const elementoRuim = PlanoSchema.safeParse({
    slides: [
      { funcao: "gancho", ideia: "x", elemento_sugerido: "Título + Descrição" },
      { funcao: "contexto", ideia: "y", elemento_sugerido: "Título" },
      { funcao: "cta", ideia: "z", elemento_sugerido: "Subtítulo" },
    ],
  });
  ok(
    "elemento em texto livre é normalizado",
    elementoRuim.success && elementoRuim.data.slides[0]!.elemento_sugerido === "titulo+descricao",
  );
  ok(
    "hashtags abaixo do mínimo são rejeitadas",
    !PublicacaoSchema.safeParse({
      legenda: "x",
      hashtags: ["#a"],
      melhor_horario: "19h",
    }).success,
  );
}

console.log("\n3. O prompt da copy carrega o plano inteiro");
{
  const r: ResultadoConteudo = {
    ideia,
    plano,
    criativo: null,
    publicacao: null,
    falhas: [],
  };
  const prompt = promptDeCopy({ tema: "teste", slides: 4 }, r);

  ok("contém a dor", prompt.includes(ideia.dor));
  ok("contém o ângulo", prompt.includes(ideia.angulo));
  ok("contém a promessa", prompt.includes(ideia.promessa));
  ok("contém cada slide do plano", plano.slides.every((s) => prompt.includes(s.ideia)));
  ok("contém a função de cada slide", prompt.includes("[gancho]") && prompt.includes("[cta]"));
  ok("pede a quantidade certa de slides", prompt.includes("4 slides"));
  ok("proíbe emoji", /sem emoji/i.test(prompt));
  ok("proíbe inventar dado", /não invente/i.test(prompt));
  ok(
    "não menciona 'A carousel with about'",
    !prompt.toLowerCase().includes("a carousel with about"),
  );
}

console.log("\n4. Prompt com plano diferente muda de fato");
{
  const outro: ResultadoConteudo = {
    ideia: { ...ideia, angulo: "ângulo completamente distinto" },
    plano: {
      slides: [
        { posicao: 1, funcao: "gancho", ideia: "outra abertura", elemento_sugerido: "titulo" },
        { posicao: 2, funcao: "desenvolvimento", ideia: "outro meio", elemento_sugerido: "titulo+descricao" },
        { posicao: 3, funcao: "cta", ideia: "outro fim", elemento_sugerido: "titulo" },
      ],
    },
    criativo: null,
    publicacao: null,
    falhas: [],
  };
  const a = promptDeCopy({ tema: "t", slides: 4 }, { ideia, plano, criativo: null, publicacao: null, falhas: [] });
  const b = promptDeCopy({ tema: "t", slides: 3 }, outro);
  ok("prompts diferentes para planos diferentes", a !== b);
  ok("segundo prompt tem 3 slides", b.includes("3 slides"));
}

console.log(falhas === 0 ? "\nTodos os casos passaram.\n" : `\n${falhas} caso(s) falharam.\n`);
process.exit(falhas === 0 ? 0 : 1);
