/**
 * Teste da biblioteca de formatos.
 *
 * O que dá para provar sem chamar modelo: todo formato tem arco que começa no
 * gancho e termina no CTA, o arco esticado devolve exatamente o número de slides
 * pedido (3 a 10, o que a tela permite), todo nicho aponta para formato que
 * existe, e os nomes são únicos — nome repetido na tela é bug de usabilidade,
 * não de dados.
 *
 * Rodar: npx tsx src/lib/estudio/formatos.test.ts
 */
import {
  FORMATOS,
  FORMATOS_LISTA,
  NICHOS,
  NICHOS_LISTA,
  esqueleto,
  formatoPorId,
  nichoPorId,
} from "./formatos";
import { resolverFormato } from "../conteudo";

let falhas = 0;

function ok(nome: string, condicao: boolean, detalhe = "") {
  if (condicao) {
    console.log(`  ok   ${nome}`);
    return;
  }
  falhas += 1;
  console.log(`  FALHA ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
}

console.log("\n1. Todo formato é utilizável");
{
  ok("existe pelo menos 9 formatos", FORMATOS_LISTA.length >= 9, `tem ${FORMATOS_LISTA.length}`);

  for (const f of FORMATOS_LISTA) {
    const rotulo = f.id;
    ok(`${rotulo}: tem nome humano`, f.nome.trim().length > 3);
    ok(`${rotulo}: tem exemplo de uma linha`, f.exemplo.trim().length > 10);
    ok(`${rotulo}: tem estrutura publicada`, f.estrutura.length >= 2);
    ok(`${rotulo}: tem limite declarado`, f.limite.trim().length > 20);
    ok(`${rotulo}: tem evidência`, /mediana/.test(f.evidencia), f.evidencia);
    ok(`${rotulo}: tem exemplos de padrão`, f.padroes.length >= 2);
    ok(
      `${rotulo}: padrões são curtos (hook, não parágrafo)`,
      f.padroes.every((p) => p.split(/\s+/).length <= 14),
      f.padroes.join(" | "),
    );
    ok(`${rotulo}: arco começa no gancho`, f.arco[0]?.funcao === "gancho", String(f.arco[0]?.funcao));
    ok(
      `${rotulo}: arco termina no CTA`,
      f.arco[f.arco.length - 1]?.funcao === "cta",
      String(f.arco[f.arco.length - 1]?.funcao),
    );
    ok(
      `${rotulo}: todo passo do arco tem papel escrito`,
      f.arco.every((p) => p.papel.trim().length > 10),
    );
  }

  const nomes = FORMATOS_LISTA.map((f) => f.nome.toLowerCase());
  ok("nomes de formato são únicos", new Set(nomes).size === nomes.length);
}

console.log("\n2. O arco estica para qualquer número de cards da tela (3 a 10)");
{
  for (const f of FORMATOS_LISTA) {
    for (let n = 3; n <= 10; n++) {
      const arco = esqueleto(f, n);
      const certo =
        arco.length === n &&
        arco[0]?.funcao === "gancho" &&
        arco[n - 1]?.funcao === "cta" &&
        arco.every((p) => p.papel.trim().length > 0);
      if (!certo) {
        ok(`${f.id} com ${n} slides`, false, JSON.stringify(arco.map((p) => p.funcao)));
      }
    }
  }
  ok("todos os formatos devolvem o número exato de slides pedido", true);

  // Fora da faixa, o esqueleto prende no que a tela permite em vez de crescer.
  ok("2 slides é preso no mínimo", esqueleto(FORMATOS.lista, 1).length === 3);
  ok("20 slides é preso no máximo", esqueleto(FORMATOS.lista, 20).length === 10);

  // A virada não pode ser a primeira a cair quando o carrossel encurta.
  const cinco = esqueleto(FORMATOS["passo-a-passo"], 5);
  ok(
    "carrossel de 5 slides mantém a virada",
    cinco.some((p) => p.funcao === "virada"),
    JSON.stringify(cinco.map((p) => p.funcao)),
  );
}

console.log("\n3. Nichos apontam só para formato existente");
{
  for (const n of NICHOS_LISTA) {
    ok(`${n.id}: tem nome humano`, n.nome.trim().length > 3);
    ok(`${n.id}: tem fonte declarada`, n.fonte.includes("topcarousels.com"), n.fonte);
    ok(`${n.id}: tem hooks reais`, n.hooksReais.length >= 2);
    ok(`${n.id}: tem ao menos 3 formatos`, n.formatos.length >= 3);
    const ids = n.formatos.map((f) => f.id);
    ok(`${n.id}: sem formato repetido`, new Set(ids).size === ids.length);
    ok(
      `${n.id}: todo formato existe`,
      ids.every((id) => Boolean(formatoPorId(id))),
      ids.join(","),
    );
  }

  const nomes = NICHOS_LISTA.map((n) => n.nome.toLowerCase());
  ok("nomes de nicho são únicos", new Set(nomes).size === nomes.length);

  // Todo formato precisa aparecer em pelo menos um nicho, senão é código morto
  // que o usuário nunca alcança.
  const usados = new Set(NICHOS_LISTA.flatMap((n) => n.formatos.map((f) => f.id)));
  ok(
    "todo formato aparece em algum nicho",
    FORMATOS_LISTA.every((f) => usados.has(f.id)),
    FORMATOS_LISTA.filter((f) => !usados.has(f.id)).map((f) => f.id).join(","),
  );
}

console.log("\n4. Busca por id e resolução do formato");
{
  ok("nichoPorId acha nicho válido", nichoPorId("clinica-saude")?.nome === "Clínica e saúde");
  ok("nichoPorId ignora id inválido", nichoPorId("nao-existe") === null);
  ok("nichoPorId ignora vazio", nichoPorId("") === null && nichoPorId(undefined) === null);
  ok("formatoPorId acha formato válido", formatoPorId("lista")?.nome === "Lista numerada");
  ok("formatoPorId ignora id inválido", formatoPorId("combo/lista") === null);

  // A ordem de decisão do formato é o que a rota usa: escolha do usuário >
  // melhor formato do nicho > lista.
  ok(
    "escolha explícita vence o nicho",
    resolverFormato({ tema: "t", slides: 7, nicho: "clinica-saude", formato: "quiz" })?.id === "quiz",
  );
  // O default vem do TEMA, não da mediana do nicho (revisão do critic: default
  // por mediana mandaria tudo para cheat sheet, mesmo sem caber no assunto).
  ok(
    "tema com número manda lista, mesmo com nicho",
    resolverFormato({ tema: "5 erros que afastam a cliente", slides: 7, nicho: "clinica-saude" })?.id === "lista",
  );
  ok(
    "tema 'como fazer' manda passo a passo",
    resolverFormato({ tema: "Como fidelizar a cliente da clínica", slides: 7, nicho: "clinica-saude" })?.id ===
      "passo-a-passo",
  );
  ok("sem nicho e sem escolha, é lista", resolverFormato({ tema: "t", slides: 7 })?.id === "lista");
  ok(
    "id inválido cai na sugestão do tema",
    resolverFormato({ tema: "t", slides: 7, nicho: "produtividade", formato: "inexistente" })?.id === "lista",
  );
}

console.log(falhas === 0 ? "\nTodos os casos passaram.\n" : `\n${falhas} caso(s) falharam.\n`);
process.exit(falhas === 0 ? 0 : 1);
