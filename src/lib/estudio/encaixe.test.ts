/**
 * Teste da regra de encaixe de texto (W98).
 *
 * Roda sem navegador: `npx tsx src/lib/estudio/encaixe.test.ts` (mesmo padrão de
 * `cards.test.ts` — imprime `ok`/`FALHA` e sai com código 1 se algo falhar).
 *
 * O que ele prova, e por que vale: o teto de linhas, o piso de fonte e a escada
 * de tamanhos são os números que decidem se o texto de um card encolhe, corta ou
 * vaza. Eles moram num lugar só (`encaixe.ts`) porque a prévia e o PNG são o
 * mesmo componente; se o piso cair abaixo de 28 px, o export de 1080 vira letra
 * miúda — e é o tipo de regressão que passa despercebida na tela grande.
 *
 * O que ele NÃO prova: quantas linhas o texto REAL ocupa com a fonte REAL. Isso
 * só existe medindo no navegador, e é o job de `tests/visual/texto-encaixe`.
 */
import {
  ENCAIXE,
  alturaDaLinha,
  alturaDoTeto,
  cabeNoTeto,
  cortarComReticencias,
  tamanhosCandidatos,
  tetoLegivel,
  type RegraDeTexto,
} from "./encaixe";

let falhas = 0;

function ok(nome: string, condicao: boolean, detalhe = "") {
  if (condicao) {
    console.log(`ok   ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
  } else {
    falhas += 1;
    console.log(`FALHA ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
  }
}

function lanca(fn: () => unknown) {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
}

// ---------- Pisos de fonte: o export de 1080 não aceita letra miúda ----------
const todas: Array<[string, RegraDeTexto]> = Object.entries(ENCAIXE).flatMap(([tipo, blocos]) =>
  Object.entries(blocos).map(([bloco, regra]): [string, RegraDeTexto] => [
    `${tipo}.${bloco}`,
    regra as RegraDeTexto,
  ]),
);

for (const [nome, regra] of todas) {
  ok(`${nome}: piso de fonte >= 28 px`, regra.minimo >= 28, `${regra.minimo} px`);
  ok(`${nome}: teto de linhas entre 3 e 6`, regra.tetoLinhas >= 3 && regra.tetoLinhas <= 6, `${regra.tetoLinhas}`);
  ok(`${nome}: base acima do piso`, regra.base > regra.minimo, `${regra.base} > ${regra.minimo}`);
}

ok(
  "manchete de capa aceita 4 linhas",
  ENCAIXE.capa.manchete.tetoLinhas === 4,
  String(ENCAIXE.capa.manchete.tetoLinhas),
);
ok(
  "corpo de card de conteúdo aceita 6 linhas",
  ENCAIXE.conteudo.corpo.tetoLinhas === 6,
  String(ENCAIXE.conteudo.corpo.tetoLinhas),
);

// ---------- `tetoLegivel` é guarda, não decoração ----------
ok(
  "piso abaixo de 28 px é recusado",
  lanca(() => tetoLegivel({ ...ENCAIXE.capa.corpo, minimo: 24 })),
);
ok(
  "teto de zero linhas é recusado",
  lanca(() => tetoLegivel({ ...ENCAIXE.capa.corpo, tetoLinhas: 0 })),
);

// ---------- Altura de linha: arredonda para CIMA ----------
// 32 px × 1.35 = 43,2 px. Para baixo (43) o teto de 6 linhas ficaria 1 px menor
// que o conteúdo e a última linha era fatiada — o defeito medido em 16/11.
ok("altura de linha arredonda para cima", alturaDaLinha(32, 1.35) === 44, String(alturaDaLinha(32, 1.35)));
ok("altura de linha inteira não muda", alturaDaLinha(40, 1) === 40, String(alturaDaLinha(40, 1)));
ok(
  "altura do teto do corpo de conteúdo = 6 linhas",
  alturaDoTeto(ENCAIXE.conteudo.corpo, 38) === 6 * 54,
  `${alturaDoTeto(ENCAIXE.conteudo.corpo, 38)} px`,
);

// ---------- Escada de tamanhos ----------
const escada = tamanhosCandidatos(ENCAIXE.conteudo.corpo);
ok("escada começa na base", escada[0] === 38, String(escada[0]));
ok("escada termina no piso", escada[escada.length - 1] === 28, String(escada[escada.length - 1]));
ok(
  "escada é estritamente decrescente",
  escada.every((t, i) => i === 0 || t < escada[i - 1]),
  escada.join(" > "),
);
ok("escada respeita o piso", escada.every((t) => t >= ENCAIXE.conteudo.corpo.minimo));
// Base já no piso (manchete curta resolvida por `corpoDaManchete`) não pode
// entrar em laço: a escada devolve um único degrau.
const escadaCurta = tamanhosCandidatos({ ...ENCAIXE.capa.manchete, base: 44 });
ok("base igual ao piso devolve um degrau", escadaCurta.length === 1 && escadaCurta[0] === 44, escadaCurta.join(","));

// ---------- `cabeNoTeto` ----------
const regraCorpo = ENCAIXE.conteudo.corpo;
ok("6 linhas no tamanho base cabem", cabeNoTeto(6, 38, regraCorpo));
ok("7 linhas no tamanho base NÃO cabem", !cabeNoTeto(7, 38, regraCorpo));
ok("7 linhas no piso NÃO cabem (teto de linhas vence)", !cabeNoTeto(7, 28, regraCorpo));

// Teto em px manda quando é menor que o de linhas: capa tem 4 linhas de manchete
// mas só 640 px reservados; a 116 px, 4 linhas dariam 464 — cabe. A 97 px e
// `tetoPx` de 200, não cabe, mesmo com 2 linhas.
ok("teto em px vence quando é menor", !cabeNoTeto(2, 100, { ...regraCorpo, tetoPx: 150 }));
ok("sem teto em px, só o de linhas conta", cabeNoTeto(6, 38, { ...regraCorpo, tetoPx: undefined }));

// ---------- Corte com reticências ----------
ok(
  "corta na palavra inteira",
  cortarComReticencias("um dois três quatro", 2) === "um dois…",
  cortarComReticencias("um dois três quatro", 2),
);
ok(
  "texto que cabe volta inteiro",
  cortarComReticencias("um dois três", 5) === "um dois três",
);
ok(
  "zero palavras ainda devolve sinal de corte",
  cortarComReticencias("palavra", 0) === "p…",
  cortarComReticencias("palavra", 0),
);

if (falhas > 0) {
  console.log(`\n${falhas} falha(s)`);
  process.exit(1);
}
console.log("\ntudo certo");
