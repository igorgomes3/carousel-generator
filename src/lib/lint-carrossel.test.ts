/**
 * Teste do portão de qualidade, com foco na regra que mudou: a capa.
 *
 * Contexto: a regra antiga exigia 8 palavras de corpo em TODO slide, inclusive
 * no 1. O modelo obedeceu e encheu a capa de texto — foi assim que um teste real
 * gerou "Dia 1º, agenda vazia / Promoção no grupo depois de um mês de elogios /
 * Arrasta pro lado". O hook passava no portão e ninguém arrastaria.
 *
 * Rodar: npx tsx src/lib/lint-carrossel.test.ts
 */
import { lintCarrossel } from "./lint-carrossel";

let falhas = 0;

function ok(nome: string, condicao: boolean, detalhe = "") {
  if (condicao) {
    console.log(`  ok   ${nome}`);
    return;
  }
  falhas += 1;
  console.log(`  FALHA ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
}

type Elemento = { type: string; text?: string };

function slide(...elementos: Elemento[]) {
  return { elements: elementos };
}

const titulo = (text: string): Elemento => ({ type: "Title", text });
const subtitulo = (text: string): Elemento => ({ type: "Subtitle", text });
const descricao = (text: string): Elemento => ({ type: "Description", text });

const CORPO_OK =
  "A cliente fecha o pacote de dez sessões, faz três e desaparece sem dizer nada.";

/** Carrossel mínimo válido: capa curta + miolo com corpo + CTA com verbo. */
function carrossel(capa: ReturnType<typeof slide>) {
  return [
    capa,
    slide(titulo("Ela some no meio"), descricao(CORPO_OK)),
    slide(titulo("O silêncio custa caro"), descricao(CORPO_OK)),
    slide(titulo("Salve este roteiro"), descricao("Salve para usar na próxima semana com a sua equipe.")),
  ];
}

console.log("\n1. Capa curta passa (o hook não precisa de 8 palavras)");
{
  const curta = carrossel(slide(titulo("A cliente não some por preço"), subtitulo("Ela some por silêncio")));
  const r = lintCarrossel(curta, { min: 3, max: 10 });
  ok("capa de 9 palavras é aceita", r.erros.length === 0, r.erros.join(" | "));
  ok("sem aviso de capa longa", !r.avisos.some((a) => a.includes("capa com")), r.avisos.join(" | "));
}

console.log("\n2. Capa longa gera aviso, não erro (o carrossel não é descartado)");
{
  const longa = carrossel(
    slide(
      titulo("Dia primeiro agenda vazia promoção no grupo depois de um mês"),
      subtitulo("Arrasta pro lado e vê o resto"),
    ),
  );
  const r = lintCarrossel(longa, { min: 3, max: 10 });
  ok("capa com 16 palavras gera aviso", r.avisos.some((a) => a.includes("capa com")), r.avisos.join(" | "));
  ok("capa de 16 palavras não bloqueia a geração", r.erros.length === 0, r.erros.join(" | "));

  // Acima de 18 é erro, não aviso: o pipeline reescreve a copy com a lista de
  // defeitos. Foi para isso que a checagem virou bloqueante.
  const enorme = carrossel(
    slide(
      titulo("Dia primeiro agenda vazia promoção no grupo depois de um mês inteiro"),
      subtitulo("Arrasta pro lado para ver o resto da história toda agora mesmo"),
    ),
  );
  const r2 = lintCarrossel(enorme, { min: 3, max: 10 });
  ok("capa com mais de 18 palavras é recusada", r2.erros.some((e) => e.includes("capa com")), r2.erros.join(" | "));
  ok("capa longa não gera aviso de título do miolo", !r.avisos.some((a) => a.includes("slide 1 com título")), r.avisos.join(" | "));
}

console.log("\n3. Capa sem segunda linha é erro");
{
  const so = carrossel(slide(titulo("A cliente não some por preço")));
  const r = lintCarrossel(so, { min: 3, max: 10 });
  ok("capa só com título é recusada", r.erros.some((e) => e.includes("slide 1")), r.erros.join(" | "));
}

console.log("\n4. O miolo continua exigente (a exceção é só a capa)");
{
  const fraco = [
    slide(titulo("A cliente não some por preço"), subtitulo("Ela some por silêncio")),
    slide(titulo("Some no meio"), descricao("muito curto")),
    slide(titulo("Salve este roteiro"), descricao("Salve para usar depois com a sua equipe toda.")),
  ];
  const r = lintCarrossel(fraco, { min: 3, max: 10 });
  ok("slide 2 com corpo curto é recusado", r.erros.some((e) => e.startsWith("slide 2")), r.erros.join(" | "));
}

console.log("\n5. As regras antigas continuam valendo");
{
  const comEmoji = carrossel(
    slide(titulo("A cliente não some por preço ✨"), subtitulo("Ela some por silêncio")),
  );
  ok(
    "emoji é recusado",
    lintCarrossel(comEmoji, { min: 3, max: 10 }).erros.some((e) => e.includes("emoji")),
  );

  const semCta = [
    slide(titulo("A cliente não some por preço"), subtitulo("Ela some por silêncio")),
    slide(titulo("Ela some no meio"), descricao(CORPO_OK)),
    slide(titulo("O fim"), descricao("Esta é a última frase do carrossel inteiro, sem pedido.")),
  ];
  ok(
    "último slide sem verbo de ação é recusado",
    lintCarrossel(semCta, { min: 3, max: 10 }).erros.some((e) => e.includes("CTA")),
  );

  const vozDeIa = carrossel(
    slide(titulo("A cliente não some por preço"), subtitulo("Ela some por silêncio")),
  ).map((s, i) =>
    i === 1 ? slide(titulo("Eleve sua cliente"), descricao("Eleve sua cliente com esta técnica simples de retorno.")) : s,
  );
  ok(
    "voz de IA é recusada",
    lintCarrossel(vozDeIa, { min: 3, max: 10 }).erros.some((e) => e.includes("voz de IA")),
  );
}

console.log(falhas === 0 ? "\nTodos os casos passaram.\n" : `\n${falhas} caso(s) falharam.\n`);
process.exit(falhas === 0 ? 0 : 1);
