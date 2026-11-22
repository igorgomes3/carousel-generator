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
  ajustarAoEsqueleto,
  escolherGancho,
  promptDaIdeia,
  promptDeCopy,
  promptDeEmergencia,
  resolverFormato,
  type ResultadoConteudo,
} from "./conteudo";
import { FORMATOS, esqueleto, sugerirFormatoDoTema } from "./estudio/formatos";

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
  gancho: "A agenda não esvazia de repente. Ela esvazia em silêncio.",
  tom: "direto" as const,
};

const plano = {
  slides: [
    { posicao: 1, funcao: "gancho" as const, ideia: "a conta que ninguém faz", elemento_sugerido: "titulo+subtitulo" as const },
    { posicao: 2, funcao: "contexto" as const, ideia: "o custo fixo da clínica", elemento_sugerido: "titulo+descricao" as const },
    { posicao: 3, funcao: "virada" as const, ideia: "quantos pacientes cobrem o custo", elemento_sugerido: "titulo+descricao" as const },
    { posicao: 4, funcao: "cta" as const, ideia: "calcule o seu", elemento_sugerido: "titulo+descricao" as const },
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
        { posicao: 1, funcao: "gancho", ideia: "outra abertura", elemento_sugerido: "titulo+subtitulo" },
        { posicao: 2, funcao: "desenvolvimento", ideia: "outro meio", elemento_sugerido: "titulo+descricao" },
        { posicao: 3, funcao: "cta", ideia: "outro fim", elemento_sugerido: "titulo+descricao" },
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

console.log("\n5. Etapa 1 é a dona das regras do gancho (revisão do critic)");
{
  const b = { tema: "Como fidelizar seus clientes da sua clínica de estética", slides: 8, nicho: "clinica-saude" };
  const { sistema, usuario } = promptDaIdeia(b);

  ok("diz que afirmação bate pergunta", /AFIRMAÇÃO, nunca pergunta/.test(sistema));
  ok("cita a taxa medida", /23,2%/.test(sistema) && /19,5%/.test(sistema));
  ok("dá a faixa de palavras em pt-BR", /6 a 12 palavras/.test(sistema));
  ok("explica a audiência (quem publica x quem lê)", /Quem PUBLICA/.test(sistema) && /QUEM LÊ/.test(sistema));
  ok("traz o anti-exemplo com reescrita", sistema.includes("Dia 1º, agenda vazia") && sistema.includes("BOM:"));
  ok(
    "traz padrões de gancho do formato",
    promptDaIdeia({ ...b, formato: "lista" }).sistema.includes("5 erros que fazem a cliente não voltar"),
  );
  ok("traz o vocabulário do nicho", sistema.includes("VOCABULÁRIO DESTE NICHO") && sistema.includes("pacote de sessões"));
  ok("pede três candidatos", /TRÊS candidatos/.test(sistema));
  ok("nomeia o nicho no pedido", usuario.includes("Clínica e saúde"));

  // O quiz é a exceção: a capa pode ser pergunta, porque a estrutura do formato
  // é "a pergunta ou o jogo". Regra única para todos os formatos contradizia isso.
  const quiz = promptDaIdeia({ ...b, formato: "quiz" }).sistema;
  ok("quiz é isento da regra de afirmação", /exceção: a capa pode ser a pergunta/.test(quiz));
  ok("lista não é isento", /nunca pergunta/.test(promptDaIdeia({ ...b, formato: "lista" }).sistema));

  // O tema "como fidelizar meus clientes" é do negócio, mas quem lê é a cliente
  // final — o prompt precisa dizer isso ou o modelo escreve consultoria.
  ok("sem nicho, não inventa vocabulário", !/VOCABULÁRIO DESTE NICHO/.test(promptDaIdeia({ tema: "t", slides: 7 }).sistema));
}

console.log("\n6. Etapa 3 recebe o gancho pronto e não repete as regras");
{
  const r: ResultadoConteudo = { ideia, plano, criativo: null, publicacao: null, falhas: [] };
  const comFormato = promptDeCopy(
    { tema: "fidelizar clientes da clínica de estética", slides: 8, nicho: "clinica-saude", formato: "cheat-sheet" },
    r,
  );

  ok("nomeia o formato no pedido", comFormato.includes('formato "Cheat sheet que se salva"'));
  ok("traz a estrutura publicada do formato", comFormato.includes("Slide 1: o que o guia cobre"));
  ok("traz o limite do formato", /Limite deste formato/i.test(comFormato));
  ok("reproduz o gancho decidido na etapa 1", comFormato.includes(ideia.gancho));
  ok("proíbe reescrever o gancho", /Não reescreva/.test(comFormato));
  ok("manda fatiar em título + subtítulo", /Fatie em TÍTULO/.test(comFormato));
  ok("proíbe aquecimento no slide 2", /SLIDE 2 — SEM AQUECIMENTO/.test(comFormato));
  ok("traz o vocabulário do nicho", comFormato.includes("pacote de sessões"));
  ok("proíbe 'arraste para o lado' no CTA", /NÃO escreva "arraste para o lado"/.test(comFormato));
  ok("proíbe CTA triplo", /Três pedidos = nenhum/.test(comFormato));

  // A contradição que o critic apontou: regra de COMO escrever o gancho na etapa
  // que é proibida de mexer nele. Agora não pode voltar.
  ok("não repete as regras de criação do gancho", !/AFIRMAÇÃO, nunca pergunta/.test(comFormato));
  ok("não repete o anti-exemplo", !comFormato.includes("Dia 1º, agenda vazia"));
  ok("não mistura hooks reais em inglês", !/drmarkhyman|cheat code/.test(comFormato));

  const semEscolha = promptDeCopy({ tema: "5 erros que fazem a cliente sumir", slides: 6 }, r);
  ok("tema com número cai em lista numerada", semEscolha.includes('formato "Lista numerada"'));

  const emergencia = promptDeEmergencia({ tema: "t", slides: 8, nicho: "clinica-saude", formato: "opiniao" });
  ok("prompt de emergência nomeia o formato", emergencia.includes('formato "Opinião que divide"'));
  ok("prompt de emergência tem as regras do gancho", /AFIRMAÇÃO, nunca pergunta/.test(emergencia));
  ok("prompt de emergência tem o anti-exemplo", emergencia.includes("Dia 1º, agenda vazia"));
  ok("prompt de emergência tem vocabulário", emergencia.includes("pacote de sessões"));
}

console.log("\n7. A escolha do gancho é determinística (3 candidatos -> 1)");
{
  const lista = FORMATOS.lista;

  const limpo = "5 sinais de que a cliente não volta";
  ok(
    "rejeita chamada de arrasto",
    escolherGancho(["Arrasta pro lado e veja 5 erros que afastam cliente", limpo], lista) === limpo,
  );
  ok(
    "rejeita promessa de promoção",
    escolherGancho(["Promoção no grupo para as clientes da clínica", limpo], lista) === limpo,
  );
  ok(
    "rejeita pergunta no formato lista",
    !escolherGancho(["Sua cliente voltaria hoje?", limpo], lista).includes("?"),
  );
  ok(
    "aceita pergunta no quiz",
    escolherGancho(["Sua pele é oleosa ou seca? Responda e veja o que indicar"], FORMATOS.quiz).includes("?"),
  );
  ok(
    "rejeita gancho com mais de 14 palavras",
    escolherGancho(
      [
        "A cliente que fechou o pacote de dez sessões fez apenas três e parou de responder todas as mensagens da recepção",
        limpo,
      ],
      lista,
    ) === limpo,
  );

  const escolhido = escolherGancho(
    [
      "Fidelize suas clientes com atendimento de excelência",
      "5 sinais de que a cliente não volta",
      "Ela fez 3 das 10 sessões e parou de responder no WhatsApp",
    ],
    lista,
  );
  ok("prefere número ou cena concreta ao conselho vago", escolhido !== "Fidelize suas clientes com atendimento de excelência", escolhido);
  ok("não devolve vazio quando todos são ruins", escolherGancho(["nada"], lista) === "");
  ok(
    "quando todos são reprovados, devolve o primeiro",
    escolherGancho(["Promoção imperdível para todas as clientes da clínica hoje"], lista).length > 0,
  );
}

console.log("\n8. O arco do formato manda no plano");
{
  const arco = esqueleto(FORMATOS["passo-a-passo"], 6);
  ok("esqueleto tem 6 passos", arco.length === 6);
  ok("esqueleto começa no gancho", arco[0]!.funcao === "gancho");
  ok("esqueleto termina no cta", arco[5]!.funcao === "cta");

  // Modelo devolveu menos slides do que o formato pede: as ideias dele são
  // preservadas, as que faltam viram o papel do passo.
  const curtos = plano.slides.slice(0, 2);
  const ajustado = ajustarAoEsqueleto(curtos, arco);
  ok("ajuste devolve o tamanho do arco", ajustado.length === 6);
  ok("ajuste mantém a ideia do modelo na posição 1", ajustado[0]!.ideia === curtos[0]!.ideia);
  ok("ajuste preenche o que falta com o papel do passo", ajustado[3]!.ideia === arco[3]!.papel);
  ok("ajuste renumera as posições", ajustado.every((s, i) => s.posicao === i + 1));
  ok("ajuste dá título ao slide 1", ajustado[0]!.elemento_sugerido === "titulo+subtitulo");

  // Modelo devolveu mais slides: o excedente é cortado, não vira slide extra.
  const longos = Array.from({ length: 9 }, (_, i) => ({
    posicao: i + 1,
    funcao: (i === 0 ? "gancho" : i === 8 ? "cta" : "desenvolvimento") as "gancho" | "cta" | "desenvolvimento",
    ideia: `ideia ${i + 1}`,
    elemento_sugerido: "titulo+descricao" as const,
  }));
  const ajustadoLongo = ajustarAoEsqueleto(longos, arco);
  ok("ajuste corta o excedente", ajustadoLongo.length === 6);
  ok("ajuste mantém o gancho na posição 1", ajustadoLongo[0]!.ideia === "ideia 1");
  // Reancoragem: o CTA do modelo vai para o último slide, não para onde o índice caiu.
  ok("ajuste leva o CTA do modelo para o fim", ajustadoLongo[5]!.funcao === "cta");
}

console.log("\n9. O tema sugere o formato (default inteligente, não cego)");
{
  ok("'5 erros que...' é lista", sugerirFormatoDoTema("5 erros que fazem a cliente não voltar") === "lista");
  ok("'como fidelizar...' é passo a passo", sugerirFormatoDoTema("Como fidelizar seus clientes da clínica") === "passo-a-passo");
  ok("'antes e depois' é caso real", sugerirFormatoDoTema("Antes e depois: pele com acne em 4 sessões") === "caso-real");
  ok("'qual é o seu tipo de pele' é quiz", sugerirFormatoDoTema("Qual é o seu tipo de pele?") === "quiz");
  ok("'checklist' é cheat sheet", sugerirFormatoDoTema("Checklist do que perguntar na avaliação") === "cheat-sheet");
  ok("'por que ninguém volta' é opinião", sugerirFormatoDoTema("Por que ninguém volta depois da primeira sessão") === "opiniao");
  ok("tema sem pista cai em lista", sugerirFormatoDoTema("Fidelização") === "lista");
  // O default não pode ser sempre o formato de melhor mediana (cheat sheet): era
  // o comportamento antigo e o critic apontou que isso ignora o tema.
  ok(
    "nicho não sequestra o default",
    resolverFormato({ tema: "5 erros que afastam cliente", slides: 7, nicho: "clinica-saude" })?.id === "lista",
  );
}

console.log(falhas === 0 ? "\nTodos os casos passaram.\n" : `\n${falhas} caso(s) falharam.\n`);
process.exit(falhas === 0 ? 0 : 1);
