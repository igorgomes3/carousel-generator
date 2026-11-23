import { test, expect, Page } from "@playwright/test";
import { PNG } from "pngjs";
import { promises as fs } from "node:fs";

import { estadoDeSessao } from "./ajuda";

/**
 * Encaixe de texto no card — o gate do W98.
 *
 * O defeito que este arquivo tranca: texto **transbordando ou saindo** do card.
 * Medido no card de estouro antes da correção, no palco de export (tamanho real,
 * 1080×1440):
 *
 *   capa · manchete  97 px, 4 linhas, `scrollHeight` 412 × `clientHeight` 388 → 24 px cortados
 *   capa · corpo     34 px, 7 linhas, 314 × 140                            → 174 px perdidos (55% do texto)
 *   cta  · corpo     40 px, 8 linhas, 432 × 400                            → 32 px cortados
 *
 * Nenhum bloco tinha reticências: o `overflow: hidden` comia o texto em silêncio.
 *
 * ## O que o teste exige (e por que cada exigência)
 *
 * 1. **Teto de linhas por bloco** — manchete 3–4, corpo 5–6, conforme o tipo de
 *    card. Linha contada por CARACTERE, não por `Range` sobre o bloco: com
 *    `overflow: hidden` as caixas de linha que passam da caixa não são
 *    devolvidas, e a contagem mentia a favor do bug (dizia 4 onde havia 6).
 * 2. **Piso de fonte** — 28 px no corpo, 44 px na manchete. Abaixo disso o PNG
 *    de 1080 fica ilegível no celular.
 * 3. **Corte anunciado** — se o texto não couber nem no piso, a última linha
 *    termina em reticências. Nada de sumir com metade do corpo.
 * 4. **Dentro da janela 4:5** — o topo do bloco não entra na sangria de 45 px
 *    nem o pé passa de 1395 da arte.
 * 5. **O PNG sai igual** — fonte do template LEGÍVEL pelo rasterizador (a folha
 *    do Google precisa ser CORS-legível; sem isso o `html-to-image` embute
 *    fallback e o texto quebra diferente na imagem), arquivo de 1080×1350 e o
 *    texto desenhado no arquivo dentro da borda.
 *
 * A geração é mockada: o que se prova aqui é o desenho do card com texto de
 * estouro, não a qualidade do roteiro.
 */

const PASTA = "screenshots/w98";
const TEMA = "por que ninguém salva seu carrossel";
/** Sangria de 45 px no topo e no pé da arte de 1440: é o que o PNG 4:5 recorta. */
const SANGRIA = 45;

/** Manchete de 74 caracteres e corpo de 302 — o texto de estouro do relatório. */
const MANCHETE =
  "POR QUE NINGUÉM SALVA O SEU CARROSSEL MESMO QUANDO ELE ESTÁ BOM DE VERDADE";
const CORPO =
  "Você escreve, revisa, escolhe a fonte, monta os sete cards e publica. Aí o " +
  "post morre na terceira imagem, porque o texto do meio virou um bloco de " +
  "letra miúda que ninguém termina de ler no celular. O problema quase nunca é " +
  "o assunto: é o tamanho de cada card e a quantidade de palavras que você " +
  "tentou encaixar nele sem medir.";

const SLIDES = [
  { tipo: "capa", titulo: MANCHETE, corpo: CORPO, imagem: null },
  { tipo: "conteudo", titulo: MANCHETE, corpo: CORPO, imagem: null },
  { tipo: "cta", titulo: MANCHETE, corpo: CORPO, imagem: null },
];

/** Teto por tipo de card e bloco — espelho de `src/lib/estudio/encaixe.ts`. */
const TETO: Record<string, Record<string, { linhas: number; minimo: number; lineHeight: number }>> = {
  capa: {
    manchete: { linhas: 4, minimo: 44, lineHeight: 1 },
    corpo: { linhas: 5, minimo: 28, lineHeight: 1.32 },
  },
  conteudo: {
    manchete: { linhas: 3, minimo: 44, lineHeight: 1.06 },
    corpo: { linhas: 6, minimo: 28, lineHeight: 1.42 },
  },
  cta: {
    manchete: { linhas: 3, minimo: 44, lineHeight: 1.02 },
    corpo: { linhas: 6, minimo: 28, lineHeight: 1.35 },
  },
};

/** Sessão + telas do estúdio. A conta é mockada porque o editor exige sessão. */
async function preparar(page: Page) {
  await page.context().addCookies(estadoDeSessao.cookies);
  await page.route("**/api/ac/**", (r) => {
    const url = r.request().url();
    if (url.includes("/me")) {
      return r.fulfill({
        json: {
          usuario: {
            id: "u1",
            email: "ana@autoclinic.com",
            nome: "Ana Prado",
            papel: "admin",
            organization_id: "org-autoclinic",
            deve_trocar_senha: false,
          },
        },
      });
    }
    if (url.includes("marca")) {
      return r.fulfill({
        json: { marca: { nome: "Clínica Aurora", handle: "@clinicaaurora", avatar_url: null } },
      });
    }
    return r.fulfill({ json: {} });
  });
  await page.route("**/api/auth/**", (r) =>
    r.fulfill({ json: { access_token: "token-de-teste", refresh_token: "refresh-de-teste" } }),
  );
  await page.route("**/api/projetos/*", (r) => r.fulfill({ status: 404, json: { erro: "não encontrado" } }));
  await page.route("**/api/projetos", (r) =>
    r.request().method() === "GET"
      ? r.fulfill({ json: { projetos: [] } })
      : r.fulfill({ status: 201, json: { projeto: { id: "p", nome: "n", slides: [] } } }),
  );
  await page.route("**/api/gerar", (r) =>
    r.fulfill({
      json: {
        carrossel: {
          id: "11111111-2222-3333-4444-555555555555",
          titulo: MANCHETE,
          templateId: "minimalist",
          tema: TEMA,
          slides: SLIDES,
          criadoEm: new Date().toISOString(),
        },
      },
    }),
  );
  await page.route("**/api/imagem**", (r) =>
    r.request().method() === "POST"
      ? r.fulfill({ json: { jobId: "job-teste" } })
      : r.fulfill({ json: { status: "erro", erro: "sem IA no gate" } }),
  );
}

/** Wizard até o resultado, com o template escuro padrão. */
async function abrirResultado(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Me conta a sua ideia/i })).toBeVisible({
    timeout: 90_000,
  });
  await page.locator("button").filter({ hasText: "Minimalist" }).first().click({ force: true });
  await expect(page.getByRole("heading", { name: /Qual é o tema do carrossel/i })).toBeVisible();
  await page.getByPlaceholder(/por que ninguém salva/i).fill(TEMA);
  await page.getByRole("button", { name: /Gerar \d+ cards?/ }).click();
  await expect(page.getByRole("heading", { name: /Seu carrossel está pronto/i })).toBeVisible({
    timeout: 90_000,
  });
  await page.evaluate(() => document.fonts.ready);
}

/**
 * Medição de cada bloco de texto, no palco de export (a arte em tamanho real).
 *
 * A contagem de linhas é por caractere: agrupa os caracteres por `top` arredondado
 * e conta grupos. Foi a única forma que não mentiu — `Range` sobre o bloco inteiro
 * respeita o recorte do `overflow: hidden` e esconde justamente as linhas que
 * estouravam.
 */
async function medirBlocos(page: Page) {
  return page.evaluate(() => {
    function linhasPorCaractere(node: Element) {
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      const linhas: string[] = [];
      let atualTopo: number | null = null;
      let atual = "";
      let t: Node | null;
      while ((t = walker.nextNode())) {
        const texto = t.textContent ?? "";
        for (let i = 0; i < texto.length; i += 1) {
          const r = document.createRange();
          r.setStart(t, i);
          r.setEnd(t, i + 1);
          const topo = Math.round(r.getBoundingClientRect().top);
          if (atualTopo === null || Math.abs(atualTopo - topo) > 2) {
            if (atual) linhas.push(atual);
            atual = "";
            atualTopo = topo;
          }
          atual += texto[i];
        }
      }
      if (atual) linhas.push(atual);
      return linhas.map((l) => l.trim()).filter(Boolean);
    }

    const arte = document.querySelector("[data-card-export] [data-card-arte]") as HTMLElement;
    const ra = arte.getBoundingClientRect();
    const cards = Array.from(
      document.querySelectorAll("[data-card-export] [data-card-arte]"),
    ) as HTMLElement[];
    return cards.map((card) => {
      const rc = card.getBoundingClientRect();
      return {
        tipo: card.getAttribute("data-tipo-card"),
        blocos: Array.from(card.querySelectorAll("[data-bloco]")).map((el) => {
          const r = el.getBoundingClientRect();
          const est = getComputedStyle(el);
          const linhas = linhasPorCaractere(el);
          return {
            bloco: el.getAttribute("data-bloco") ?? "",
            fontSize: Math.round(parseFloat(est.fontSize)),
            linhas: linhas.length,
            ultimaLinha: linhas[linhas.length - 1] ?? "",
            scrollHeight: el.scrollHeight,
            clientHeight: el.clientHeight,
            topoNaArte: Math.round(r.top - rc.top),
            peNaArte: Math.round(r.bottom - rc.top),
            largura: Math.round(r.width),
            cortado: el.getAttribute("data-bloco-cortado") === "true",
          };
        }),
      };
    });
  });
}

test.describe("W98 — encaixe de texto nos cards", () => {
  test("texto de estouro não vaza, não some e não corta letra", async ({ page }) => {
    await preparar(page);
    await abrirResultado(page);
    await fs.mkdir(PASTA, { recursive: true });

    const medidas = await medirBlocos(page);
    expect(medidas.length).toBeGreaterThanOrEqual(3);
    console.log("MEDIDAS:", JSON.stringify(medidas, null, 1));

    for (const card of medidas) {
      const tipo = card.tipo ?? "conteudo";
      const tetoDoTipo = TETO[tipo] ?? TETO.conteudo;
      expect(card.blocos.length, `${tipo}: card sem bloco de texto medido`).toBeGreaterThan(0);

      for (const b of card.blocos) {
        const teto = tetoDoTipo[b.bloco];
        expect(teto, `${tipo}.${b.bloco}: tipo de bloco sem teto declarado`).toBeTruthy();
        const etiqueta = `${tipo}.${b.bloco}`;

        // 1. teto de linhas
        expect(b.linhas, `${etiqueta}: ${b.linhas} linhas (teto ${teto.linhas})`).toBeLessThanOrEqual(
          teto.linhas,
        );
        // 2. piso de fonte
        expect(b.fontSize, `${etiqueta}: fonte ${b.fontSize}px abaixo do piso ${teto.minimo}`).toBeGreaterThanOrEqual(
          teto.minimo,
        );
        // 3. nenhuma linha escondida: a caixa é tão alta quanto as linhas desenhadas
        //    (`scrollHeight` não serve aqui: com `line-height` menor que a métrica
        //    da fonte, a tinta transborda a caixa em ~12 px sem nenhuma linha a
        //    mais — é bleeding tipográfico, não texto perdido).
        const alturaDasLinhas = Math.round(b.linhas * b.fontSize * teto.lineHeight);
        expect(
          b.clientHeight,
          `${etiqueta}: caixa de ${b.clientHeight}px para ${b.linhas} linhas (${alturaDasLinhas}px) — linha escondida`,
        ).toBeGreaterThanOrEqual(alturaDasLinhas - 2);
        // 4. o que foi cortado, foi cortado ANUNCIADO
        if (b.cortado) {
          expect(b.ultimaLinha, `${etiqueta}: texto cortado sem reticências`).toMatch(/…$/);
        }
        // 5. dentro da janela 4:5 (45 de sangria em cima, 1395 embaixo na arte de 1440)
        expect(b.topoNaArte, `${etiqueta}: bloco entra na sangria de cima`).toBeGreaterThanOrEqual(45);
        expect(b.peNaArte, `${etiqueta}: bloco passa da janela 4:5`).toBeLessThanOrEqual(1395);
      }
    }

    // O caso específico do relatório: corpo longo de capa tem que ANUNCIAR o corte.
    const capa = medidas.find((c) => c.tipo === "capa");
    const corpoDaCapa = capa?.blocos.find((b) => b.bloco === "corpo");
    expect(corpoDaCapa?.cortado, "capa: corpo de 302 caracteres precisa ser cortado com reticências").toBe(
      true,
    );
    expect(corpoDaCapa?.ultimaLinha).toMatch(/…$/);

    // --- Fontes do template legíveis pelo rasterizador ---
    // Sem isso o PNG sai com fonte substituta e o texto quebra diferente: era o
    // que fazia o arquivo exportado estourar mesmo com a tela certa.
    const regrasDaFonteGoogle = await page.evaluate(() => {
      const folhas = Array.from(document.styleSheets);
      const google = folhas.find((f) => (f.href ?? "").includes("fonts.googleapis.com"));
      if (!google) return -1;
      try {
        return google.cssRules.length;
      } catch {
        return -2; // folha opaca: falta crossOrigin="anonymous" no <link>
      }
    });
    expect(
      regrasDaFonteGoogle,
      "folha do Google precisa ser legível (crossOrigin=anonymous) para o PNG embutir a fonte",
    ).toBeGreaterThan(0);

    // --- Screenshots do antes/depois do texto de estouro: 1440 e 390 ---
    for (const [w, h] of [
      [1440, 1000],
      [390, 844],
    ] as const) {
      await page.setViewportSize({ width: w, height: h });
      await page.evaluate(() => document.fonts.ready);
      await page.locator("[data-cartao]").first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${PASTA}/gate-${w}.png`, fullPage: true });
      await page.locator("[data-cartao]").first().screenshot({ path: `${PASTA}/gate-${w}-card1.png` });
    }

    // --- PNG exportado pelo caminho real ---
    await page.setViewportSize({ width: 1440, height: 1000 });
    for (const rotulo of ["capa", "conteudo", "cta"] as const) {
      const i = medidas.findIndex((c) => c.tipo === rotulo);
      if (i < 0) continue;
      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 60_000 }),
        page.locator(`[aria-label^="Baixar card ${i + 1} de"]`).click(),
      ]);
      const destino = `${PASTA}/gate-png-${rotulo}.png`;
      await download.saveAs(destino);
      const buf = await fs.readFile(destino);
      const png = PNG.sync.read(buf);

      expect(png.width, `${rotulo}: PNG precisa ter 1080`).toBe(1080);
      expect(png.height, `${rotulo}: PNG precisa ter 1350`).toBe(1350);
      expect(buf.length, `${rotulo}: PNG vazio/truncado`).toBeGreaterThan(100_000);

      /**
       * Paridade prévia × arquivo, medida em pixel:
       *   - o retângulo de cada bloco (medido no DOM) tem tinta no PNG —
       *     prova que o raster desenhou o texto onde a tela mediu;
       *   - abaixo do PÉ do último bloco não há tinta — prova que nenhum texto
       *     escapou do bloco para fora (o defeito relatado).
       * A contagem de faixas por linha foi descartada: acento e descida criam
       * faixas extras e o número vira ruído, não medida.
       */
      const luminancia = (x: number, y: number) => {
        const idx = (png.width * y + x) << 2;
        return 0.299 * png.data[idx] + 0.587 * png.data[idx + 1] + 0.114 * png.data[idx + 2];
      };
      const tintaEm = (x0: number, y0: number, x1: number, y1: number) => {
        let n = 0;
        for (let y = Math.max(0, y0); y < Math.min(png.height, y1); y += 1) {
          for (let x = Math.max(0, x0); x < Math.min(png.width, x1); x += 1) {
            if (luminancia(x, y) > 120) n += 1;
          }
        }
        return n;
      };

      const card = medidas.find((c) => c.tipo === rotulo);
      for (const b of card?.blocos ?? []) {
        const tintaNoBloco = tintaEm(0, b.topoNaArte - SANGRIA, png.width, b.peNaArte - SANGRIA);
        console.log(
          `PNG ${rotulo}.${b.bloco}: ${buf.length} bytes, ${png.width}×${png.height}, tinta dentro do bloco=${tintaNoBloco}`,
        );
        expect(tintaNoBloco, `${rotulo}.${b.bloco}: nenhuma tinta no retângulo medido`).toBeGreaterThan(300);
      }

      const ultimo = card?.blocos[card.blocos.length - 1];
      if (ultimo) {
        const abaixo = tintaEm(0, ultimo.peNaArte - SANGRIA + 3, png.width, ultimo.peNaArte - SANGRIA + 25);
        expect(abaixo, `${rotulo}: texto vazando abaixo do último bloco`).toBe(0);
      }
    }
  });
});
