/**
 * Teste do reparo determinístico da capa.
 *
 * Contexto: o modelo recebe ordem de usar o gancho escolhido sem mexer, e mexe.
 * Num teste real a capa saiu com 35 palavras em volta de um gancho de 11. O
 * reparo em código garante que o slide 1 publicado é o gancho que passou pelo
 * filtro — não a paráfrase do modelo.
 *
 * Rodar: npx tsx src/lib/gerar-documento.test.ts
 */
import { aplicarGanchoNaCapa } from "./gerar-documento";

let falhas = 0;

function ok(nome: string, condicao: boolean, detalhe = "") {
  if (condicao) {
    console.log(`  ok   ${nome}`);
    return;
  }
  falhas += 1;
  console.log(`  FALHA ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
}

type Slide = { elements: { type: string; text?: string }[] };

const texto = (slides: Slide[], i: number, tipo: string) =>
  slides[i]?.elements.find((e) => e.type === tipo)?.text ?? "";

const carrossel: Slide[] = [
  {
    elements: [
      { type: "Title", text: "Dia primeiro agenda vazia promoção no grupo depois de um mês" },
      { type: "Subtitle", text: "Arrasta pro lado para ver o resto da história toda agora" },
    ],
  },
  { elements: [{ type: "Title", text: "Miolo" }, { type: "Description", text: "corpo do slide dois" }] },
  { elements: [{ type: "Title", text: "Salve" }, { type: "Description", text: "salve para usar depois" }] },
];

console.log("\n1. Gancho com barra vira título + subtítulo");
{
  const saida = aplicarGanchoNaCapa(carrossel, "3 das 10 sessões e você parou de ir / O pacote continua pago");
  ok("título é a primeira parte", texto(saida, 0, "Title") === "3 das 10 sessões e você parou de ir", texto(saida, 0, "Title"));
  ok("subtítulo é a segunda parte", texto(saida, 0, "Subtitle") === "O pacote continua pago", texto(saida, 0, "Subtitle"));
  ok("miolo não muda", texto(saida, 1, "Title") === "Miolo");
  ok("número de slides preservado", saida.length === carrossel.length);
}

console.log("\n2. Gancho de uma frase mantém subtítulo curto e cortado");
{
  const saida = aplicarGanchoNaCapa(
    carrossel,
    "Ela desmarcou a terceira sessão e a clínica não ligou nenhuma vez depois disso",
  );
  const sub = texto(saida, 0, "Subtitle");
  ok("título recebe o gancho inteiro", texto(saida, 0, "Title").startsWith("Ela desmarcou a terceira"));
  ok("subtítulo fica com no máximo 6 palavras", sub.split(/\s+/).length <= 6, `${sub.split(/\s+/).length}`);
  ok("subtítulo não fica vazio", sub.length > 0);
}

console.log("\n3. Gancho com quebra de frase também é dividido");
{
  const saida = aplicarGanchoNaCapa(carrossel, "Sua pele não piorou. Você parou na terceira sessão.");
  ok("título é a primeira frase", texto(saida, 0, "Title") === "Sua pele não piorou.", texto(saida, 0, "Title"));
  ok("subtítulo é a segunda frase", texto(saida, 0, "Subtitle").includes("terceira sessão"), texto(saida, 0, "Subtitle"));
}

console.log("\n4. Capa sem subtítulo ganha um (o linter exige dois elementos)");
{
  const semSub: Slide[] = [
    { elements: [{ type: "Title", text: "capa antiga" }] },
    { elements: [{ type: "Title", text: "miolo" }, { type: "Description", text: "corpo" }] },
  ];
  const saida = aplicarGanchoNaCapa(semSub, "Ela parou na terceira e ninguém ligou / o pacote ficou pela metade");
  ok("subtítulo é criado", texto(saida, 0, "Subtitle") === "o pacote ficou pela metade", texto(saida, 0, "Subtitle"));
  ok("capa passa a ter dois elementos", (saida[0]?.elements.length ?? 0) >= 2);
}

console.log("\n5. Gancho vazio não destrói a capa");
{
  const saida = aplicarGanchoNaCapa(carrossel, "   ");
  ok("capa original é mantida", texto(saida, 0, "Title") === texto(carrossel, 0, "Title"));
  ok("lista vazia não estoura", aplicarGanchoNaCapa([], "x").length === 0);
}

console.log(falhas === 0 ? "\nTodos os casos passaram.\n" : `\n${falhas} caso(s) falharam.\n`);
process.exit(falhas === 0 ? 0 : 1);
