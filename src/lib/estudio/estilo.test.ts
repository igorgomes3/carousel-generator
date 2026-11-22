/**
 * Teste da geometria 3:4/4:5, da curadoria de estilo e do @ (issue #12).
 *
 * Roda sem navegador e sem API: `npx tsx src/lib/estudio/estilo.test.ts`
 * (mesmo padrão de `src/lib/carrosseis/lista.test.ts` — um arquivo de script que
 * imprime `ok`/`FALHA` e sai com código 1 se algo falhar).
 *
 * O que ele prova, critério por critério da issue #12:
 *   1. arte 3:4, janela 4:5 e PNG 1080×1350 saem da MESMA conta — e a sangria
 *      de 45 px é derivada, não digitada;
 *   4. projeto sem `estro`/`arroba` resolve para o template, byte por byte.
 *
 * O que ele NÃO prova (é o job do Playwright, `tests/visual/issue-12-aspecto`):
 * card desenhado, guia na tela, PNG de verdade no disco.
 */
import {
  ART_H,
  ART_W,
  BLEED_Y,
  EXPORT_H,
  EXPORT_W,
  SAFE_AREA,
  SAFE_H,
  SAFE_W,
  dentroDaAreaSegura,
  doPeDaJanela,
  dentroDaJanela,
} from "./area-segura";
import { LIMITE_ARROBA, arrobaVisivel, limparArroba, normalizarArroba } from "./arroba";
import {
  CONTRASTE_MINIMO_DESTAQUE,
  DESTAQUES,
  FUNDOS,
  PARES_DE_FONTES,
  combina,
  contraste,
  corLegivelSobre,
  estiloVazio,
  normalizarEstilo,
  resolverAparencia,
} from "./estilo";
import { temPilhaPropria } from "@/lib/templates";

let falhas = 0;

function ok(nome: string, condicao: boolean, detalhe = "") {
  if (condicao) {
    console.log(`  ok   ${nome}`);
    return;
  }
  falhas += 1;
  console.log(`  FALHA ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
}

/* ------------------------------------------------------------------ */
/* 1. Geometria                                                        */
/* ------------------------------------------------------------------ */

console.log("\ngeometria 3:4 / janela 4:5");
ok("arte é 1080×1440 (3:4)", ART_W === 1080 && ART_H === 1440, `${ART_W}×${ART_H}`);
ok("janela segura é 1080×1350 (4:5)", SAFE_W === 1080 && SAFE_H === 1350);
ok("PNG exportado é 1080×1350", EXPORT_W === 1080 && EXPORT_H === 1350);
ok("arte e janela têm a mesma largura", ART_W === SAFE_W);
ok("razão da arte é 3:4", Math.abs(ART_W / ART_H - 3 / 4) < 1e-9);
ok("razão da janela é 4:5", Math.abs(SAFE_W / SAFE_H - 4 / 5) < 1e-9);
ok("sangria é (1440-1350)/2 = 45", BLEED_Y === 45 && (ART_H - SAFE_H) / 2 === BLEED_Y);
ok("sangria simétrica: janela centrada", SAFE_AREA.y === BLEED_Y && SAFE_AREA.y * 2 + SAFE_H === ART_H);
ok("janela começa em y=45 e termina em y=1395", SAFE_AREA.y === 45 && SAFE_AREA.y + SAFE_AREA.height === 1395);

// O deslocamento é a única conversão de coordenada do desenho. Se ele mudar de
// sinal, todo layout do card sai 90 px fora — por isso o teste, e não um
// comentário.
ok("dentroDaJanela(80) = 125", dentroDaJanela(80) === 125);
ok("doPeDaJanela(48) = 93", doPeDaJanela(48) === 93);
ok("janela termina a 45 px do pé da arte", doPeDaJanela(0) === 45);

// Layouts reais do card (números de antes da issue, medidos na janela de 1350).
ok(
  "título do capa: topo 125 + 640 de altura fica dentro",
  dentroDaAreaSegura(dentroDaJanela(386), 640),
  `${dentroDaJanela(386)}+640`,
);
ok("bloco inteiro da capa cabe na janela", dentroDaAreaSegura(dentroDaJanela(386), 884));
ok("rodapé do conteúdo fica a 93 px do pé da arte", doPeDaJanela(48) === 93);
ok("bloco do conteúdo começa em 141 e termina em 1263", dentroDaJanela(96) === 141 && ART_H - doPeDaJanela(132) === 1263);
ok("sangria do topo está FORA da área segura", dentroDaAreaSegura(0, 44) === false);
ok("primeira linha da arte não é área segura", dentroDaAreaSegura(0, BLEED_Y) === false);

/* ------------------------------------------------------------------ */
/* 4. Compatibilidade: documento sem os campos novos                   */
/* ------------------------------------------------------------------ */

console.log("\ncompatibilidade com projeto salvo antes da #12");

const TEMPLATE = {
  palette: { bg: "#0B0C0F", text: "#FFFFFF", muted: "#99A1AC", accent: "#E5342B" },
  fontDisplay: "Anton",
  fontBody: "Inter",
};

const semEscolha = resolverAparencia(TEMPLATE, undefined);
ok("sem estilo: fundo do template", semEscolha.palette.bg === TEMPLATE.palette.bg);
ok("sem estilo: texto do template", semEscolha.palette.text === TEMPLATE.palette.text);
ok("sem estilo: secundária do template", semEscolha.palette.muted === TEMPLATE.palette.muted);
ok("sem estilo: destaque do template", semEscolha.palette.accent === TEMPLATE.palette.accent);
ok("sem estilo: fonte de título do template", semEscolha.fontDisplay === TEMPLATE.fontDisplay);
ok("sem estilo: fonte de corpo do template", semEscolha.fontBody === TEMPLATE.fontBody);

const estiloVazioGravado = resolverAparencia(TEMPLATE, normalizarEstilo({}));
ok("estilo vazio gravado = template", estiloVazioGravado.palette.bg === TEMPLATE.palette.bg);
ok("estiloVazio({}) é verdadeiro", estiloVazio({}) === true);
ok("estiloVazio(undefined) é verdadeiro", estiloVazio(undefined) === true);
ok("estiloVazio({fundoId}) é falso", estiloVazio({ fundoId: "papel" }) === false);

// Id de outra versão / texto colado no lugar do id: descarta, não estoura.
ok("id desconhecido é descartado", estiloVazio(normalizarEstilo({ fundoId: "verde-limao-2020" })) === true);
ok("id não-string é descartado", estiloVazio(normalizarEstilo({ fundoId: 42, fonteId: null })) === true);
ok("lixo no campo inteiro é descartado", estiloVazio(normalizarEstilo("papel")) === true);
ok("estilo parcial mantém só o que é válido", normalizarEstilo({ fundoId: "preto", destaqueId: "nao-existe" }).destaqueId === undefined);
ok("estilo parcial mantém o que é válido", normalizarEstilo({ fundoId: "preto" }).fundoId === "preto");

// Escolha parcial: fundo define bg/text/muted, destaque sozinho não mexe no fundo.
const soFundo = resolverAparencia(TEMPLATE, { fundoId: "papel" });
ok("só fundo: bg vem da curadoria", soFundo.palette.bg === "#F7F4EE");
ok("só fundo: texto acompanha o fundo", soFundo.palette.text === "#16110C");
ok("só fundo: destaque continua o do template", soFundo.palette.accent === TEMPLATE.palette.accent);

const soDestaque = resolverAparencia(TEMPLATE, { destaqueId: "ouro" });
ok("só destaque: bg continua o do template", soDestaque.palette.bg === TEMPLATE.palette.bg);
ok("só destaque: accent trocado", soDestaque.palette.accent === "#D9A521");

const soFonte = resolverAparencia(TEMPLATE, { fonteId: "editorial" });
ok("só fonte: display do par", soFonte.fontDisplay === "Playfair Display");
ok("só fonte: corpo do par", soFonte.fontBody === "Inter");
ok("só fonte: paleta intocada", soFonte.palette.bg === TEMPLATE.palette.bg);

/* ------------------------------------------------------------------ */
/* 3. Curadoria                                                        */
/* ------------------------------------------------------------------ */

console.log("\ncuradoria de fundo, destaque e fonte");

ok("8 fundos", FUNDOS.length === 8, String(FUNDOS.length));
ok("8 destaques", DESTAQUES.length === 8, String(DESTAQUES.length));
ok("6 pares de fonte", PARES_DE_FONTES.length === 6, String(PARES_DE_FONTES.length));
ok("ids de fundo únicos", new Set(FUNDOS.map((f) => f.id)).size === FUNDOS.length);
ok("ids de destaque únicos", new Set(DESTAQUES.map((d) => d.id)).size === DESTAQUES.length);
ok("ids de fonte únicos", new Set(PARES_DE_FONTES.map((p) => p.id)).size === PARES_DE_FONTES.length);

// Curadoria que não carrega é curadoria quebrada: o PNG sairia em Arial.
for (const par of PARES_DE_FONTES) {
  ok(`fonte "${par.nome}" carrega (${par.display})`, temPilhaPropria(par.display));
  ok(`corpo de "${par.nome}" carrega (${par.body})`, temPilhaPropria(par.body));
}

// Texto do fundo tem que ler sobre o próprio fundo: é a razão de fundo e texto
// viajarem juntos na curadoria.
for (const f of FUNDOS) {
  ok(`texto de "${f.nome}" tem contraste >= 4.5`, contraste(f.bg, f.text) >= 4.5, contraste(f.bg, f.text).toFixed(2));
  ok(`secundária de "${f.nome}" tem contraste >= 3`, contraste(f.bg, f.muted) >= 3, contraste(f.bg, f.muted).toFixed(2));
}

// Todo fundo precisa de pelo menos 4 destaques utilizáveis — curadoria que
// oferece 1 opção não é escolha.
for (const f of FUNDOS) {
  const usaveis = DESTAQUES.filter((d) => combina(f, d)).length;
  ok(`"${f.nome}" tem >= 4 destaques com contraste`, usaveis >= 4, String(usaveis));
}

const branco = FUNDOS.find((f) => f.id === "branco");
const preto = FUNDOS.find((f) => f.id === "preto");
const agua = DESTAQUES.find((d) => d.id === "agua");
const lima = DESTAQUES.find((d) => d.id === "lima");
ok("verde-água NÃO combina com fundo branco", branco && agua ? !combina(branco, agua) : false);
ok("verde-água combina com fundo preto", preto && agua ? combina(preto, agua) : false);
ok("lima NÃO combina com fundo branco", branco && lima ? !combina(branco, lima) : false);
ok("piso de contraste é 1.8", CONTRASTE_MINIMO_DESTAQUE === 1.8);

// CTA pinta o card inteiro com o destaque: é aqui que a cor do texto importa.
ok("texto branco sobre preto", corLegivelSobre("#000000") === "#FFFFFF");
ok("texto escuro sobre lima", corLegivelSobre("#B4E33D") === "#0B0B0C");
ok("texto escuro sobre verde-água", corLegivelSobre("#2BE0C8") === "#0B0B0C");
ok("texto branco sobre azul", corLegivelSobre("#3B82F6") === "#FFFFFF");

/* ------------------------------------------------------------------ */
/* 2. @ do perfil                                                      */
/* ------------------------------------------------------------------ */

console.log("\n@ do perfil");

ok("limparArroba tira o @", limparArroba("@monflash") === "monflash");
ok("limparArroba tira @ duplicado", limparArroba("@@monflash") === "monflash");
ok("limparArroba tira espaço", limparArroba("  @ monflash  ") === "monflash");
ok("limparArroba tira caractere inválido", limparArroba("@mon flash!") === "monflash");
ok("limparArroba mantém ponto e sublinhado", limparArroba("@mon.flash_br") === "mon.flash_br");
ok("limparArroba de null é vazio", limparArroba(null) === "");

ok("arrobaVisivel põe o @", arrobaVisivel("monflash") === "@monflash");
ok("arrobaVisivel não duplica o @", arrobaVisivel("@monflash") === "@monflash");
ok("arrobaVisivel vazio é vazio", arrobaVisivel("") === "");
ok("arrobaVisivel de null é vazio", arrobaVisivel(null) === "");

ok("normalizarArroba guarda o handle", normalizarArroba("@monflash") === "monflash");
ok("normalizarArroba de vazio é null", normalizarArroba("") === null);
ok("normalizarArroba de '@' é null", normalizarArroba("@") === null);
ok("normalizarArroba corta ponto do começo", normalizarArroba(".monflash") === "monflash");
ok("normalizarArroba corta ponto do fim", normalizarArroba("monflash.") === "monflash");
ok("normalizarArroba corta ponto duplo", normalizarArroba("mon..flash") === "mon.flash");
ok("normalizarArroba respeita 30 caracteres", (normalizarArroba("a".repeat(50)) ?? "").length === LIMITE_ARROBA);
ok("normalizarArroba de número é null", normalizarArroba(42) === null);

const arrobaLonga = normalizarArroba(`${"a".repeat(29)}.`) ?? "";
ok("corte de 30 não deixa ponto no fim", !arrobaLonga.endsWith("."), arrobaLonga);

/* ------------------------------------------------------------------ */

if (falhas > 0) {
  console.log(`\n${falhas} falha(s).`);
  process.exit(1);
}
console.log("\nTudo certo.");
