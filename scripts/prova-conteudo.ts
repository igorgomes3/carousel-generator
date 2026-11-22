/**
 * Prova de que o conteúdo melhorou: gera carrosséis reais com o prompt novo.
 *
 * Uso: npx tsx scripts/prova-conteudo.ts
 * Custo: 3 carrosséis (5 chamadas de modelo cada) pelo 9Router. Sem imagem.
 *
 * Imprime, para cada tema: o formato escolhido, o gancho final, os três
 * candidatos que a etapa 1 devolveu e os slides. Salva tudo em
 * saida/prova-conteudo.json para o relatório.
 */
import "./env"; // PRIMEIRO: carrega .env.local antes dos módulos que leem env
import { mkdirSync, writeFileSync } from "node:fs";
import { gerarDocumentoCompleto } from "../src/lib/gerar-documento";
import { escolherGancho, resolverFormato } from "../src/lib/conteudo";

const TEMAS = [
  {
    tema: "Como fidelizar seus clientes da sua clínica de estética",
    nicho: "clinica-saude",
    formato: "",
    nota: "o mesmo tema do teste do Igor (o hook ruim original)",
  },
  {
    tema: "5 erros que fazem a cliente não voltar na clínica de estética",
    nicho: "clinica-saude",
    formato: "",
    nota: "tema com número — deve cair em lista",
  },
  {
    tema: "Por que a cliente some depois da terceira sessão de limpeza de pele",
    nicho: "clinica-saude",
    formato: "",
    nota: "tema com 'por que' — deve cair em opinião",
  },
];

interface Elemento {
  type?: string;
  text?: string;
}

function lerSlide(slide: { elements?: Elemento[] }) {
  const porTipo = (tipo: string) =>
    (slide.elements ?? []).filter((e) => e.type === tipo).map((e) => (e.text ?? "").trim()).filter(Boolean);
  return {
    titulo: porTipo("Title")[0] ?? "",
    subtitulo: porTipo("Subtitle").join(" "),
    descricao: porTipo("Description").join(" "),
  };
}

async function main() {
  const chave = process.env.OPENAI_API_KEY;
  if (!chave) throw new Error("OPENAI_API_KEY não configurada em .env.local");
  console.log("modelo:", process.env.OPENAI_MODEL, "| base:", process.env.OPENAI_BASE_URL);

  const saida: unknown[] = [];

  for (const caso of TEMAS) {
    const formato = resolverFormato({
      tema: caso.tema,
      slides: 8,
      nicho: caso.nicho,
      formato: caso.formato || undefined,
    });
    console.log(`\n\n================ ${caso.tema}`);
    console.log(`formato: ${formato?.nome} | ${caso.nota}`);

    const gerado = await gerarDocumentoCompleto(caso.tema, chave, 8, {
      nicho: caso.nicho,
      formato: caso.formato || undefined,
    });

    if (!gerado) {
      console.log("!!! geração falhou");
      saida.push({ ...caso, erro: "geração falhou" });
      continue;
    }

    const ganchoFinal = gerado.estrategia.ideia.gancho;
    console.log(`\nGANCHO (escolhido em código): "${ganchoFinal}"`);
    console.log("candidatos da etapa 1:", gerado.estrategia.ideia.ganchos);
    console.log("escolha do modelo era:", gerado.estrategia.ideia.gancho ===
      escolherGancho([...(gerado.estrategia.ideia.ganchos ?? []), ganchoFinal], formato)
      ? "(igual ao filtro)" : "(descartada pelo filtro)");
    console.log(`público (quem LÊ): ${gerado.estrategia.ideia.publico}`);
    console.log("tom:", gerado.estrategia.ideia.tom, "| tentativas de copy:", gerado.tentativas);
    if (gerado.problemas.length) console.log("problemas de lint:", gerado.problemas);
    if (gerado.avisos.length) console.log("avisos:", gerado.avisos);

    console.log("\nslides:");
    const slides = (gerado.documento.slides as { elements?: Elemento[] }[]).map(lerSlide);
    slides.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.titulo}`);
      const corpo = [s.subtitulo, s.descricao].filter(Boolean).join(" ");
      if (corpo) console.log(`     ${corpo}`);
    });

    saida.push({
      ...caso,
      formato: gerado.formato,
      gancho: ganchoFinal,
      candidatos: gerado.estrategia.ideia.ganchos,
      publico: gerado.estrategia.ideia.publico,
      dor: gerado.estrategia.ideia.dor,
      angulo: gerado.estrategia.ideia.angulo,
      tentativas: gerado.tentativas,
      problemas: gerado.problemas,
      avisos: gerado.avisos,
      slides,
    });
  }

  mkdirSync("saida", { recursive: true });
  writeFileSync("saida/prova-conteudo.json", JSON.stringify(saida, null, 2));
  console.log("\n\nsalvo em saida/prova-conteudo.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
