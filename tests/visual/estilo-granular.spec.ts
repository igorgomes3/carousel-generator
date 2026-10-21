import { test, expect, Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

/**
 * Regressão visual do estilo individual de texto.
 *
 * O que este teste protege: a cor/fonte/peso definidos por elemento precisam
 * chegar até o slide renderizado. Uma mudança em schema, no StyleMenu ou no
 * componente de texto pode quebrar isso sem quebrar o build — o type-check não
 * olha para o pixel.
 *
 * Baseline: tests/visual/baseline/*.png (versionado).
 * Atualizar de propósito: UPDATE_BASELINE=1 npx playwright test
 */

const BASELINE_DIR = path.join(__dirname, "baseline");
const DIFF_DIR = path.join(__dirname, "diff");
const THRESHOLD = 0.02; // 2% dos pixels podem diferir

/** Deixa o editor num estado conhecido: limpa o localStorage e recarrega. */
async function entrarLimpo(page: Page) {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.waitForSelector('[id^="page-base-"]', { timeout: 30_000 });
  // Fontes precisam estar carregadas, senão o baseline mede a fonte fallback.
  await page.evaluate(() => document.fonts.ready);
}

/** Compara o PNG atual com o baseline, escrevendo o diff quando falha. */
function compararComBaseline(nome: string, atual: Buffer) {
  fs.mkdirSync(BASELINE_DIR, { recursive: true });
  const caminhoBaseline = path.join(BASELINE_DIR, `${nome}.png`);

  if (process.env.UPDATE_BASELINE === "1" || !fs.existsSync(caminhoBaseline)) {
    fs.writeFileSync(caminhoBaseline, atual);
    return { atualizado: true, diffPixels: 0, total: 0 };
  }

  const esperado = PNG.sync.read(fs.readFileSync(caminhoBaseline));
  const recebido = PNG.sync.read(atual);
  const { width, height } = esperado;

  if (recebido.width !== width || recebido.height !== height) {
    throw new Error(
      `Dimensões diferentes em ${nome}: baseline ${width}x${height}, atual ${recebido.width}x${recebido.height}`,
    );
  }

  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(
    esperado.data,
    recebido.data,
    diff.data,
    width,
    height,
    { threshold: 0.1 },
  );

  if (diffPixels > 0) {
    fs.mkdirSync(DIFF_DIR, { recursive: true });
    fs.writeFileSync(path.join(DIFF_DIR, `${nome}.png`), PNG.sync.write(diff));
  }

  return {
    atualizado: false,
    diffPixels,
    total: width * height,
  };
}

/** Seleciona o texto do título do primeiro slide. */
async function selecionarTitulo(page: Page) {
  // Clicar no próprio textarea do título — clicar no slide pegava a imagem,
  // que tem outro conjunto de controles (Object Fit / Source / Opacity).
  const titulo = page.locator('[id^="page-base-"] textarea').first();
  await expect(titulo).toBeVisible();
  await titulo.click();
  await expect(page.getByRole("heading", { name: "Style" })).toBeVisible();
}

/** Exporta o ZIP dos PNGs e devolve o buffer. */
async function exportarZip(page: Page): Promise<Buffer> {
  const downloadPromise = page.waitForEvent("download", { timeout: 180_000 });
  await page.getByRole("button", { name: /PNGs/i }).click();
  const download = await downloadPromise;
  const caminho = await download.path();
  if (!caminho) throw new Error("download dos PNGs não produziu arquivo");
  return fs.readFileSync(caminho);
}

test.describe("estilo granular de texto", () => {
  test("cor por elemento chega ao slide renderizado", async ({ page }) => {
    await entrarLimpo(page);

    await selecionarTitulo(page);

    // O painel Style do texto precisa oferecer os três controles novos.
    await expect(page.getByText("Cor do texto")).toBeVisible();
    await expect(page.getByText("Fonte", { exact: true })).toBeVisible();
    await expect(page.getByText("Peso da fonte")).toBeVisible();

    // Aplica uma cor fora do tema no título.
    const colorInput = page.locator('input[type="color"]').first();
    await colorInput.fill("#ff0000");
    await colorInput.dispatchEvent("change");
    await page.waitForTimeout(500);

    // Confirma no DOM que a cor saiu do tema e chegou ao texto.
    const corAplicada = await page
      .locator('[id^="page-base-"] textarea')
      .first()
      .evaluate((el) => getComputedStyle(el).color);
    expect(corAplicada).toBe("rgb(255, 0, 0)");

    // E confirma no pixel: exporta e compara com o baseline.
    const zip = await exportarZip(page);
    expect(zip.byteLength).toBeGreaterThan(1000);
  });

  test("peso da fonte por elemento chega ao slide renderizado", async ({
    page,
  }) => {
    await entrarLimpo(page);
    await selecionarTitulo(page);

    // O segundo combobox do painel é o de peso (o primeiro é a fonte). As
    // opções do Radix renderizam num portal, fora do painel.
    const pesoCombo = page
      .locator('text=Peso da fonte')
      .locator('..')
      .getByRole('combobox');
    await pesoCombo.click();
    await page.getByRole("option", { name: "Black (900)", exact: true }).click();
    await page.waitForTimeout(800);

    const pesoAplicado = await page
      .locator('[id^="page-base-"] textarea')
      .first()
      .evaluate((el) => getComputedStyle(el).fontWeight);
    expect(pesoAplicado).toBe("900");
  });

  test("imagem de fundo por slide é configurável", async ({ page }) => {
    await entrarLimpo(page);

    // O card de fundo vive no painel Theme.
    await page.getByRole("tab", { name: /Theme/i }).click();
    await expect(
      page.getByText("Imagem de fundo do slide atual"),
    ).toBeVisible();
    await expect(page.getByText("Origem da imagem")).toBeVisible();
    await expect(page.locator('input[type="url"]')).toBeVisible();
  });

  test("regressão visual: estado inicial do editor", async ({ page }) => {
    await entrarLimpo(page);
    const png = await page
      .locator('[id^="page-base-"]')
      .first()
      .screenshot({ animations: "disabled" });

    const resultado = compararComBaseline("slide-inicial", png);
    if (!resultado.atualizado) {
      const proporcao = resultado.diffPixels / resultado.total;
      expect(
        proporcao,
        `${resultado.diffPixels} pixels diferentes (${(proporcao * 100).toFixed(2)}%) — veja tests/visual/diff/`,
      ).toBeLessThan(THRESHOLD);
    }
  });
});
