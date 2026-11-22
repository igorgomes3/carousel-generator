/**
 * Teste da compatibilidade do documento salvo (issue #8).
 *
 * O que este arquivo prova, em ordem de risco:
 *   1. carrossel salvo com paleta que saiu do produto abre com as cores e os
 *      textos dele — trocar catálogo de paleta não pode mexer em peça salva;
 *   2. documento sem `config`, com cor em `oklch()` ou com fonte que não existe
 *      neste build abre no padrão, sem lançar;
 *   3. elemento inválido custa só o campo inválido, nunca o texto do slide;
 *   4. lixo (null, string, número) vira documento padrão em vez de tela de erro.
 *
 * Roda sem navegador e sem API: `npx tsx src/lib/compat/documento-salvo.test.ts`
 */
import { normalizarDocumento } from "./documento-salvo";
import { defaultValues } from "@/lib/default-document";
import { fontIdToClassName } from "@/lib/fonts-map";

let falhas = 0;

function ok(nome: string, condicao: boolean, detalhe = "") {
  if (condicao) {
    console.log(`  ok   ${nome}`);
    return;
  }
  falhas += 1;
  console.log(`  FALHA ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
}

/** Documento de 2 slides, como o banco devolve. */
function documentoSalvo(config: unknown, slides?: unknown) {
  return {
    filename: "fiscalizacao",
    config,
    slides: slides ?? [
      {
        elements: [
          { type: "Title", text: "Fiscalização na estética", style: { fontSize: "Large", align: "Center" } },
          { type: "Description", text: "Sete pontos que a Vigilância olha antes de autuar.", style: {} },
        ],
        backgroundImage: { type: "Image", source: { src: "", type: "URL" }, style: { opacity: 30 } },
      },
      {
        elements: [{ type: "Title", text: "Anamnese que evita processo", style: {} }],
        backgroundImage: { type: "Image", source: { src: "", type: "URL" }, style: { opacity: 30 } },
      },
    ],
  };
}

const configCompleto = {
  brand: { name: "Clínica Aurora", handle: "@clinicaaurora" },
  theme: {
    primary: "#123B32",
    secondary: "#0b2a24",
    background: "#f7f5f2",
    isCustom: true,
    pallette: "aqua", // paleta daisyUI que não existe mais no produto
    backgroundStyle: "papel",
  },
  fonts: { elementFonts: { Title: "DM_Serif_Display" }, font1: "DM_Serif_Display", font2: "DM_Sans" },
  pageNumber: { showNumbers: true },
};

console.log("\n1. carrossel salvo com paleta removida do produto");
{
  const doc = normalizarDocumento(documentoSalvo(configCompleto));
  ok("abre com 2 slides", doc.slides.length === 2, String(doc.slides.length));
  ok("mantém o fundo gravado", doc.config.theme.background === "#f7f5f2", doc.config.theme.background);
  ok("mantém a cor primária gravada", doc.config.theme.primary === "#123B32", doc.config.theme.primary);
  ok("mantém o estilo de fundo", doc.config.theme.backgroundStyle === "papel");
  ok("mantém o nome da paleta no documento", doc.config.theme.pallette === "aqua");
  ok("mantém a marca", doc.config.brand.name === "Clínica Aurora");
  const titulo = doc.slides[0].elements.find((e) => e.type === "Title");
  ok(
    "mantém o texto do título",
    !!titulo && (titulo as { text?: string }).text === "Fiscalização na estética",
  );
}

console.log("\n2. documento sem config, cor inválida e fonte desconhecida");
{
  const semConfig = normalizarDocumento(documentoSalvo(undefined));
  ok("sem config ainda tem 2 slides", semConfig.slides.length === 2);
  ok("tema cai no padrão", semConfig.config.theme.background === defaultValues.config.theme.background);
  ok("numeração vira o padrão", semConfig.config.pageNumber.showNumbers === true);

  const corEstranha = normalizarDocumento(
    documentoSalvo({
      ...configCompleto,
      theme: { ...configCompleto.theme, primary: "oklch(73.95% 0.19 27.33)", background: "rgba(0,0,0,.4)" },
    }),
  );
  ok(
    "cor em oklch() cai no hex padrão",
    corEstranha.config.theme.primary === defaultValues.config.theme.primary,
    corEstranha.config.theme.primary,
  );
  ok(
    "cor em rgba() cai no hex padrão",
    corEstranha.config.theme.background === defaultValues.config.theme.background,
  );

  const fonteFora = normalizarDocumento(
    documentoSalvo({
      ...configCompleto,
      fonts: { font1: "Playfair_Display", font2: "DM_Sans", elementFonts: { Title: "Playfair_Display" } },
    }),
  );
  ok("fonte desconhecida cai no padrão", fonteFora.config.fonts.font1 === defaultValues.config.fonts.font1);
  ok(
    "fonte por elemento desconhecida cai no padrão",
    fonteFora.config.fonts.elementFonts.Title === defaultValues.config.fonts.elementFonts.Title,
  );
  ok("fontIdToClassName não lança com fonte desconhecida", fontIdToClassName("Playfair_Display") === "");
  ok("fontIdToClassName segue funcionando com fonte conhecida", fontIdToClassName("DM_Sans") === "font-dm-sans");
}

console.log("\n3. slide e elemento quebrados não custam o texto do usuário");
{
  const doc = normalizarDocumento(
    documentoSalvo(configCompleto, [
      {
        elements: [
          { type: "Title", text: "Título que sobrevive", color: "red" }, // cor inválida
          { type: "NaoExiste", text: "isto não é elemento" },
          { type: "Description", text: "Texto do corpo que sobrevive também.", style: {} },
        ],
      },
      "não é slide",
    ]),
  );
  const primeiro = doc.slides[0].elements;
  ok("slide com elemento inválido continua na tela", doc.slides.length === 2, String(doc.slides.length));
  ok("título preservado", primeiro.some((e) => e.type === "Title"));
  ok("descrição preservada", primeiro.some((e) => e.type === "Description"));
  ok("elemento de tipo desconhecido é descartado", primeiro.length === 2, String(primeiro.length));
  ok("slide de formato lixo vira slide vazio", doc.slides[1].elements.length === 0);
}

console.log("\n4. lixo não vira tela de erro");
{
  for (const entrada of [null, undefined, "texto", 42, [], { slides: "x", config: 7 }]) {
    const doc = normalizarDocumento(entrada);
    ok(
      `entrada ${JSON.stringify(entrada)} devolve documento desenhável`,
      Array.isArray(doc.slides) && doc.slides.length > 0 && typeof doc.config.theme.background === "string",
    );
  }
}

if (falhas > 0) {
  console.log(`\n${falhas} falha(s)`);
  process.exit(1);
}
console.log("\ntudo certo");
