/**
 * Teste do passo 2 (issue #11): quantidade de cards e teto de arquivo.
 *
 * Roda sem navegador: `npx tsx src/lib/estudio/cards.test.ts`
 *
 * O que ele prova, e por que vale: o seletor da tela, o `POST /api/gerar` e o
 * salvamento leem as MESMAS funções daqui. Se o teto ou o intervalo mudarem em
 * um lugar só, este teste acusa antes de alguém receber 40 cards por 3.
 */
import type { SlideCarrossel } from "./tipos";
import {
  ACCEPT_IMAGEM,
  CARDS_PADRAO,
  MAX_CARDS,
  MIN_CARDS,
  RECUSA_APOS_REDUCAO,
  TAMANHO_MAX_BYTES,
  TAMANHO_MAX_MB,
  ajustarQuantidade,
  alvoDaImagem,
  limitarQuantidade,
  redimensionarImagens,
  rotuloDoCard,
  tamanhoLegivel,
  validarArquivo,
} from "./cards";

let falhas = 0;

function ok(nome: string, condicao: boolean, detalhe = "") {
  if (condicao) {
    console.log(`  ok   ${nome}`);
    return;
  }
  falhas += 1;
  console.log(`  FALHA ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
}

const carrossel = (n: number): SlideCarrossel[] =>
  Array.from({ length: n }, (_, i) => ({
    tipo: i === 0 ? "capa" : i === n - 1 ? "cta" : "conteudo",
    titulo: `t${i}`,
    corpo: `c${i}`,
    imagem: null,
  }));

console.log("\n1. intervalo de cards (3 a 10)");
{
  ok("padrão é 7", limitarQuantidade(undefined) === CARDS_PADRAO, String(CARDS_PADRAO));
  ok("3 é aceito", limitarQuantidade(3) === MIN_CARDS);
  ok("10 é aceito", limitarQuantidade(10) === MAX_CARDS);
  ok("0 vira o piso", limitarQuantidade(0) === MIN_CARDS);
  ok("-4 vira o piso", limitarQuantidade(-4) === MIN_CARDS);
  ok("999 vira o teto", limitarQuantidade(999) === MAX_CARDS);
  ok("string numérica é aceita", limitarQuantidade("6") === 6);
  ok("texto não vira 0 cards", limitarQuantidade("abc") === CARDS_PADRAO);
  ok("fracionário arredonda", limitarQuantidade(6.4) === 6);
  ok("NaN cai no padrão", limitarQuantidade(NaN) === CARDS_PADRAO);
}

console.log("\n2. o carrossel sai com exatamente N cards");
{
  const pedido7 = ajustarQuantidade(carrossel(10), 7);
  ok("10 slides viram 7", pedido7.length === 7, `veio ${pedido7.length}`);
  ok("primeiro é capa", pedido7[0].tipo === "capa");
  ok("último é CTA", pedido7[6].tipo === "cta");
  ok(
    "miolo é todo conteúdo",
    pedido7.slice(1, 6).every((s) => s.tipo === "conteudo"),
  );

  const pedido10 = ajustarQuantidade(carrossel(4), 10);
  ok("4 slides viram 10", pedido10.length === 10, `veio ${pedido10.length}`);
  ok("os cards originais foram preservados", pedido10[0].titulo === "t0" && pedido10[1].titulo === "t1" && pedido10[2].titulo === "t2");
  ok("o CTA antigo virou último", pedido10[9].tipo === "cta" && pedido10[9].titulo === "t3");
  ok(
    "os cards que faltam nascem vazios",
    pedido10.slice(4, 9).every((s) => s.titulo === "" && s.corpo === "" && s.imagem === null),
  );

  const vazio = ajustarQuantidade([], 3);
  ok("lista vazia vira 3 cards", vazio.length === 3 && vazio[0].tipo === "capa" && vazio[2].tipo === "cta");

  const um = ajustarQuantidade(carrossel(1), 5);
  ok("carrossel de 1 slide não inventa CTA", um.length === 5 && um[4].tipo === "conteudo");
  ok("e mantém a capa", um[0].tipo === "capa" && um[0].titulo === "t0");

  const semImagemPerdida = ajustarQuantidade(
    carrossel(6).map((s, i) => (i === 0 ? { ...s, imagem: "data:image/png;base64,AAA" } : s)),
    6,
  );
  ok("a foto da capa sobrevive ao ajuste", semImagemPerdida[0].imagem === "data:image/png;base64,AAA");
}

console.log("\n3. as fotos acompanham o número de cards");
{
  const fotos = ["data:a", "data:b", "data:c", "data:d"];
  ok("encolher corta o fim", redimensionarImagens(fotos, 3).join() === "data:a,data:b,data:c");
  const crescido = redimensionarImagens(fotos, 6);
  ok("crescer completa com null", crescido.length === 6 && crescido[5] === null);
  ok("crescer não perde foto", crescido[3] === "data:d");
  ok("quantidade fora do intervalo é travada", redimensionarImagens(fotos, 40).length === MAX_CARDS);
}

console.log("\n4. teto e formatos do arquivo");
{
  ok("jpg é aceito", validarArquivo({ nome: "foto.jpg", tipo: "image/jpeg", tamanho: 900_000 }).ok);
  ok("png é aceito", validarArquivo({ nome: "foto.png", tipo: "image/png", tamanho: 900_000 }).ok);
  ok("webp é aceito", validarArquivo({ nome: "foto.webp", tipo: "image/webp", tamanho: 900_000 }).ok);
  ok(
    "tipo vazio mas extensão .jpg é aceito",
    validarArquivo({ nome: "foto.JPG", tipo: "", tamanho: 900_000 }).ok,
  );

  const heic = validarArquivo({ nome: "IMG_0001.HEIC", tipo: "image/heic", tamanho: 900_000 });
  ok("HEIC é recusado", !heic.ok);
  ok(
    "a recusa de formato diz o que serve",
    !heic.ok && heic.motivo.includes("JPG") && heic.motivo.includes("WebP"),
    !heic.ok ? heic.motivo : "",
  );

  const pdf = validarArquivo({ nome: "contrato.pdf", tipo: "application/pdf", tamanho: 100 });
  ok("PDF é recusado", !pdf.ok);

  const grande = validarArquivo({ nome: "grande.jpg", tipo: "image/jpeg", tamanho: TAMANHO_MAX_BYTES + 1 });
  ok("acima do teto é recusado", !grande.ok);
  ok(
    "a recusa diz o dono do problema e o número",
    !grande.ok && grande.motivo.includes(`${TAMANHO_MAX_MB} MB`) && /\d/.test(grande.motivo),
    !grande.ok ? grande.motivo : "",
  );

  const borda = validarArquivo({ nome: "borda.jpg", tipo: "image/jpeg", tamanho: TAMANHO_MAX_BYTES });
  ok("exatamente no teto é aceito", borda.ok);

  ok("accept do input sai dos formatos", ACCEPT_IMAGEM === "image/jpeg,image/png,image/webp", ACCEPT_IMAGEM);
  ok("tamanho legível em MB", tamanhoLegivel(TAMANHO_MAX_BYTES) === "8,0 MB", tamanhoLegivel(TAMANHO_MAX_BYTES));
  ok("tamanho legível em KB", tamanhoLegivel(300 * 1024) === "300 KB", tamanhoLegivel(300 * 1024));
  ok("recusa pós-redução é uma frase de gente", RECUSA_APOS_REDUCAO.startsWith("Não conseguimos reduzir"));
}

console.log("\n5. rótulo do card na tela");
{
  ok("primeiro é Capa", rotuloDoCard(0, 7) === "Capa");
  ok("último é Último card", rotuloDoCard(6, 7) === "Último card");
  ok("miolo numera na ordem", rotuloDoCard(2, 7) === "Card 3");
  ok("carrossel de 2 não repete rótulo", rotuloDoCard(1, 2) === "Último card");
}

console.log("\n6. complemento do aria-label");
{
  ok("capa usa 'da capa'", alvoDaImagem(0, 7) === "da capa");
  ok("miolo usa 'do card N'", alvoDaImagem(2, 7) === "do card 3");
  ok("último usa 'do último card'", alvoDaImagem(6, 7) === "do último card");
  ok(
    "não sai 'do Capa' em lugar nenhum",
    [alvoDaImagem(0, 7), alvoDaImagem(1, 3), alvoDaImagem(2, 3)].every((a) => !/do (Capa|Último card)/.test(a)),
  );
}

if (falhas > 0) {
  console.log(`\n${falhas} falha(s)`);
  process.exit(1);
}
console.log("\ntudo certo");
