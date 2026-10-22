#!/usr/bin/env node
/**
 * Gera o CSS de tokens a partir de design-tokens.json.
 *
 * Por que um gerador próprio em vez do style-dictionary: o projeto já usa as
 * variáveis shadcn (`--primary: hsl(...)`), e o style-dictionary produziria
 * nomes e formatos diferentes. Aqui a saída é exatamente o bloco `:root` /
 * `.dark` que o globals.css consome, e o teste de CI confere que os dois estão
 * em sincronia — token alterado sem regenerar falha o build.
 *
 * Uso:
 *   node scripts/build-tokens.mjs          # escreve src/app/tokens.css
 *   node scripts/build-tokens.mjs --check   # falha se tokens.css estiver velho
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(__dirname, "..");
const arquivoTokens = path.join(raiz, "design-tokens.json");
const arquivoSaida = path.join(raiz, "src", "app", "tokens.css");

const tokens = JSON.parse(fs.readFileSync(arquivoTokens, "utf8"));

/** Resolve referências no formato {radius.base}. */
function resolver(valor, escopo = "light", pilha = []) {
  if (typeof valor !== "string") return String(valor);
  return valor.replace(/\{([^}]+)\}/g, (_, caminho) => {
    if (pilha.includes(caminho)) {
      throw new Error(`Referência circular em ${caminho}: ${pilha.join(" -> ")}`);
    }
    const [grupo, ...resto] = caminho.split(".");
    let alvo = tokens[grupo];
    for (const parte of resto) alvo = alvo?.[parte];
    if (!alvo || alvo.value === undefined) {
      throw new Error(`Token inexistente: {${caminho}}`);
    }
    return resolver(alvo.value, escopo, [...pilha, caminho]);
  });
}

function blocoCores(escopo) {
  const cores = tokens.color[escopo];
  if (!cores) throw new Error(`Escopo de cor inexistente: ${escopo}`);
  return Object.entries(cores)
    .map(([nome, token]) => `    --${nome}: ${token.value};`)
    .join("\n");
}

function blocoRaio() {
  return Object.entries(tokens.radius)
    .map(([nome, token]) => {
      const chave = nome === "base" ? "radius" : `radius-${nome}`;
      return `    --${chave}: ${resolver(token.value)};`;
    })
    .join("\n");
}

const cabecalho = `/* GERADO POR scripts/build-tokens.mjs — NÃO EDITAR À MÃO.
 * Fonte da verdade: design-tokens.json
 * Regenerar: node scripts/build-tokens.mjs
 */
`;

const conteudo = `${cabecalho}
:root {
${blocoCores("light")}
${blocoRaio()}
}

.dark {
${blocoCores("dark")}
}
`;

const novo = conteudo.replace(/\n+$/, "\n");

if (process.argv.includes("--check")) {
  const atual = fs.existsSync(arquivoSaida)
    ? fs.readFileSync(arquivoSaida, "utf8")
    : "";
  if (atual.replace(/\n+$/, "\n") !== novo) {
    console.error(
      "src/app/tokens.css está desatualizado em relação a design-tokens.json.\n" +
        "Rode: node scripts/build-tokens.mjs",
    );
    process.exit(1);
  }
  console.log("tokens.css em sincronia com design-tokens.json");
  process.exit(0);
}

fs.writeFileSync(arquivoSaida, novo);
console.log(`Escreveu ${path.relative(raiz, arquivoSaida)}`);
