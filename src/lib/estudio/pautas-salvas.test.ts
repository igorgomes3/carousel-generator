/**
 * Teste de "Minhas pautas" (issue #8): a substituição da pauta por notícia.
 *
 * Roda sem navegador: `npx tsx src/lib/estudio/pautas-salvas.test.ts`
 */
import { adicionarPauta, lerPautas, MAX_PAUTAS, removerPauta } from "./pautas-salvas";

let falhas = 0;

function ok(nome: string, condicao: boolean, detalhe = "") {
  if (condicao) {
    console.log(`  ok   ${nome}`);
    return;
  }
  falhas += 1;
  console.log(`  FALHA ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
}

console.log("\n1. leitura tolerante do que está gravado");
{
  ok("string JSON vira lista", lerPautas('["a ideia um","a ideia dois"]').length === 2);
  ok("array já parseado é aceito", lerPautas(["ideia boa"]).length === 1);
  ok("JSON inválido devolve vazio", lerPautas("{quebrado").length === 0);
  ok("null devolve vazio", lerPautas(null).length === 0);
  ok("não-array devolve vazio", lerPautas('{"a":1}').length === 0);
  ok("item que não é string é descartado", lerPautas(["ok ideia", 7, null]).length === 1);
  ok("espaço nas pontas é aparado", lerPautas(["  ideia aparada  "])[0] === "ideia aparada");
  ok("pauta curta demais é descartada", lerPautas(["ab"]).length === 0);
  ok("duplicata sem caixa é descartada", lerPautas(["Ideia X", "ideia x"]).length === 1);
  const muitas = lerPautas(Array.from({ length: 20 }, (_, i) => `pauta numero ${i}`));
  ok("respeita o teto de atalhos", muitas.length === MAX_PAUTAS, String(muitas.length));
}

console.log("\n2. guardar e remover");
{
  const uma = adicionarPauta([], "5 erros que fazem seu carrossel não ser salvo");
  ok("guardar devolve a pauta", uma.length === 1);
  const duas = adicionarPauta(uma, "o que ninguém conta sobre anamnese");
  ok("mais recente vem primeiro", duas[0] === "o que ninguém conta sobre anamnese", duas[0]);
  const repetida = adicionarPauta(duas, "O QUE NINGUÉM CONTA SOBRE ANAMNESE");
  ok("repetida não duplica", repetida.length === 2, String(repetida.length));
  ok("repetida sobe para o topo", repetida[0] === "O QUE NINGUÉM CONTA SOBRE ANAMNESE");
  ok("pauta curta não entra", adicionarPauta(duas, "ab").length === 2);
  ok("texto vazio não entra", adicionarPauta(duas, "   ").length === 2);
  ok("teto respeitado ao adicionar", adicionarPauta(
    Array.from({ length: MAX_PAUTAS }, (_, i) => `pauta numero ${i}`),
    "pauta nova de verdade",
  ).length === MAX_PAUTAS);
  ok("remover tira pelo texto", removerPauta(duas, "5 erros que fazem seu carrossel não ser salvo").length === 1);
  ok("remover ignora caixa", removerPauta(duas, "O QUE NINGUÉM CONTA SOBRE ANAMNESE").length === 1);
  ok("remover o que não existe não muda nada", removerPauta(duas, "inexistente").length === 2);
}

if (falhas > 0) {
  console.log(`\n${falhas} falha(s)`);
  process.exit(1);
}
console.log("\ntudo certo");
