/**
 * Teste da publicação (legenda, hashtags, reserva).
 *
 * Roda no gate `pnpm test:lib` (tsx, sem framework — mesmo estilo dos outros
 * testes de lib do repo). O que importa provar: nada de hashtag malformada
 * chegando ao Instagram, legenda nunca passando do limite e a reserva existindo
 * quando a etapa 6 do pipeline falha.
 */
import {
  LIMITE_LEGENDA,
  hashtagsDeReserva,
  legendaDeReserva,
  normalizarHashtags,
  normalizarLegenda,
  textoParaColar,
} from "./publicacao";
import type { SlideCarrossel } from "./tipos";

let falhas = 0;
function ok(nome: string, condicao: boolean, detalhe?: string) {
  if (condicao) {
    console.log("  ok  ", nome);
  } else {
    falhas += 1;
    console.error("  FAIL", nome, detalhe ?? "");
  }
}

// hashtags: um #, minúsculo, sem espaço nem pontuação
const tags = normalizarHashtags(["#Estética", "anvisa", "#  marketing digital ", "#a", 42, "#estetica"]);
ok("dedup + minúsculo + sem acento", tags.join(" ") === "#estetica #anvisa #marketingdigital", tags.join(" "));
ok("descarta curta e não-string", !tags.includes("#a") && tags.length === 3, String(tags.length));
ok("teto de 30", normalizarHashtags(Array.from({ length: 60 }, (_, i) => `#tag${i}`)).length === 30);

// legenda: espaço duplo colapsa, quebra de linha dupla sobrevive, limite respeitado
ok("colapsa espaço", normalizarLegenda("a   b") === "a b");
ok("mantém parágrafo", normalizarLegenda("a\n\nb") === "a\n\nb");
ok("corta em 2200", normalizarLegenda("x".repeat(3000)).length === LIMITE_LEGENDA);
ok("não-string vira vazio", normalizarLegenda(undefined) === "");

// reserva: usa o que está no carrossel, sem inventar fato
const slides: SlideCarrossel[] = [
  { tipo: "capa", titulo: "Três erros de precificação", corpo: "o que ninguém te conta", imagem: null },
  { tipo: "conteudo", titulo: "Cobra por hora", corpo: "x", imagem: null },
  { tipo: "conteudo", titulo: "Esquece o escopo", corpo: "y", imagem: null },
  { tipo: "cta", titulo: "Salve este post", corpo: "", imagem: null },
];
const reserva = legendaDeReserva(slides);
ok("reserva abre no gancho", reserva.startsWith("Três erros de precificação"));
ok("reserva lista os cards", reserva.includes("• Cobra por hora") && reserva.includes("• Esquece o escopo"));
ok("reserva fecha no CTA", reserva.trim().endsWith("Salve este post"));

// hashtags de reserva: mínimo útil de 3, teto de 12, sem tag genérica de viralização
const base = hashtagsDeReserva(null);
ok("reserva tem pelo menos 3", base.length >= 3, String(base.length));
ok("reserva não tem #fyp", !base.some((t) => t === "#fyp" || t === "#viral"));

ok(
  "textoParaColar junta legenda e tags",
  textoParaColar("olá", ["#a1", "#b2"]) === "olá\n\n#a1 #b2",
);
ok("textoParaColar sem tags", textoParaColar("olá", []) === "olá");

if (falhas > 0) {
  console.error(`\n${falhas} falha(s)`);
  process.exit(1);
}
console.log("\ntudo certo");
