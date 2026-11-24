/**
 * Teste da sanidade de frase. Gate: `pnpm test:lib`.
 *
 * O caso que motivou: capa saiu com "O número final não é o" — truncada pelo
 * modelo e publicada como se fosse texto.
 */
import { corpoSeFechar, fraseCompleta } from "./frase";

let falhas = 0;
function ok(nome: string, condicao: boolean, detalhe?: string) {
  if (condicao) console.log("  ok  ", nome);
  else {
    falhas += 1;
    console.error("  FAIL", nome, detalhe ?? "");
  }
}

ok("frase com ponto fecha", fraseCompleta("O preço não é o mesmo."));
ok("frase com interrogação fecha", fraseCompleta("Você cobra por hora?"));
ok("frase sem pontuação mas com palavra forte fecha", fraseCompleta("O número final muda tudo"));
ok("vazio conta como completo", fraseCompleta(""));

// os casos que reprovam
ok("artigo no fim reprova", !fraseCompleta("O número final não é o"));
ok("preposição no fim reprova", !fraseCompleta("O custo real está em"));
ok("conjunção no fim reprova", !fraseCompleta("Você cobra por hora e"));
ok("número solto no fim reprova", !fraseCompleta("Três motivos para 2"));

ok("corpoSeFechar corta truncado", corpoSeFechar("O número final não é o") === "");
ok("corpoSeFechar mantém completo", corpoSeFechar("O número final muda tudo.") === "O número final muda tudo.");
ok("corpoSeFechar em vazio", corpoSeFechar(null) === "");

if (falhas > 0) {
  console.error(`\n${falhas} falha(s)`);
  process.exit(1);
}
console.log("\ntudo certo");
