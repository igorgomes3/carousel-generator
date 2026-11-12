import { test, expect, Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { abrirEditorLimpo, abrirGaleria } from "./ajuda";

/**
 * Portões da direção A (Neutro denso).
 *
 * O que este arquivo mede, em número e não em impressão:
 *   1. estouro horizontal em px, em 360/390/768/1024/1280/1440, no editor e na
 *      galeria — precisa ser exatamente 0;
 *   2. alvo de toque de 44 px no mobile para todo controle do chrome;
 *   3. piso tipográfico: 12 px para metadado, 14 px para corpo/controle;
 *   4. foco de teclado visível, com o anel de 2 px do acento;
 *   5. contraste AA na galeria (o editor já é coberto por acessibilidade.spec).
 *
 * Fora do escopo de propósito, com motivo:
 *   - `[data-preview]`: miniatura de slide em escala (7,5 px), igual ao mockup.
 *     É prévia de conteúdo, não texto de interface;
 *   - `[id^="page-base-"]`: o slide em si. O conteúdo é do usuário (fonte e cor
 *     escolhidas por ele) e o slide roda em escala 65–89%, então medida em px
 *     de tela não diz nada sobre o CSS do produto;
 *   - `[data-alvo-menor]`: controles do menu do slide (mover/duplicar/excluir),
 *     que vivem DENTRO do slide escalado. Ver docs/design/impl-a-divergencias.md.
 */

const LARGURAS = [360, 390, 768, 1024, 1280, 1440];

async function estouroHorizontal(page: Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return Math.max(
      doc.scrollWidth - doc.clientWidth,
      document.body.scrollWidth - document.body.clientWidth,
    );
  });
}

test.describe("responsivo", () => {
  for (const largura of LARGURAS) {
    test(`editor sem estouro horizontal em ${largura}px`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: 900 });
      await abrirEditorLimpo(page);
      expect(await estouroHorizontal(page)).toBe(0);
    });

    test(`galeria sem estouro horizontal em ${largura}px`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: 900 });
      await abrirGaleria(page);
      expect(await estouroHorizontal(page)).toBe(0);
    });
  }
});

/** Controles do chrome com o menor alvo de toque, em px. */
async function alvosPequenos(page: Page) {
  return page.evaluate(() => {
    const problemas: { alvo: string; h: number; w: number }[] = [];
    const seletores = "button, a[role='button'], input, select, textarea, [role='button']";
    document.querySelectorAll(seletores).forEach((el) => {
      if (el.closest('[id^="page-base-"]')) return;
      if (el.closest("[data-alvo-menor]")) return;
      if (el.closest("[aria-hidden='true']")) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const estilos = getComputedStyle(el);
      if (estilos.display === "none" || estilos.visibility === "hidden") return;
      // Link dentro de parágrafo é texto, não alvo isolado.
      if (el.tagName === "A" && el.closest("p")) return;
      if (r.height < 44 || r.width < 44) {
        problemas.push({
          alvo: `${el.tagName.toLowerCase()}:${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 28)}`,
          h: Math.round(r.height),
          w: Math.round(r.width),
        });
      }
    });
    return problemas;
  });
}

test.describe("alvo de toque no mobile", () => {
  test("editor em 390px: todo controle do chrome tem 44×44", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await abrirEditorLimpo(page);
    const problemas = await alvosPequenos(page);
    expect(problemas, `Alvos abaixo de 44px:\n${JSON.stringify(problemas, null, 1)}`).toEqual([]);
  });

  test("galeria em 390px: todo controle do chrome tem 44×44", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await abrirGaleria(page);
    const problemas = await alvosPequenos(page);
    expect(problemas, `Alvos abaixo de 44px:\n${JSON.stringify(problemas, null, 1)}`).toEqual([]);
  });
});

/** Menor tamanho de fonte do chrome, com o elemento culpado. */
async function menoresFontes(page: Page) {
  return page.evaluate(() => {
    const achados: { texto: string; px: number; tag: string }[] = [];
    const alvos = document.querySelectorAll("body *");
    alvos.forEach((el) => {
      if (el.closest('[id^="page-base-"]')) return;
      if (el.closest("[data-preview]")) return;
      // Miniatura de slide/tema: `aria-hidden` não é texto de interface.
      if (el.closest("[aria-hidden='true']")) return;
      const temTextoProprio = Array.from(el.childNodes).some(
        (n) => n.nodeType === Node.TEXT_NODE && (n.textContent || "").trim().length > 0,
      );
      if (!temTextoProprio) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const px = parseFloat(getComputedStyle(el).fontSize);
      achados.push({
        texto: (el.textContent || "").trim().slice(0, 24),
        px,
        tag: el.tagName.toLowerCase(),
      });
    });
    achados.sort((a, b) => a.px - b.px);
    return achados;
  });
}

test.describe("piso tipográfico", () => {
  test("editor: nenhum texto de chrome abaixo de 12px, corpo e controles em 14px", async ({
    page,
  }) => {
    await abrirEditorLimpo(page);
    const fontes = await menoresFontes(page);
    const abaixoDe12 = fontes.filter((f) => f.px < 12);
    expect(abaixoDe12, `Texto abaixo de 12px:\n${JSON.stringify(abaixoDe12.slice(0, 8), null, 1)}`).toEqual(
      [],
    );

    // Corpo, botão e input: 14 px. O mockup usa 13 px em botão; subir 1 px
    // resolve "nada abaixo de 14 no corpo" sem mexer na densidade das linhas.
    const corpo = await page.evaluate(() => {
      const medir = (sel: string) =>
        Array.from(document.querySelectorAll(sel))
          .filter((el) => !el.closest('[id^="page-base-"]'))
          .map((el) => ({
            sel,
            px: parseFloat(getComputedStyle(el).fontSize),
            texto: (el.textContent || "").trim().slice(0, 20),
          }))
          .filter((x) => x.px > 0 && x.px < 14);
      return [...medir("p"), ...medir("button"), ...medir("input"), ...medir("textarea")];
    });
    expect(corpo, `Corpo/controle abaixo de 14px:\n${JSON.stringify(corpo.slice(0, 8), null, 1)}`).toEqual(
      [],
    );
  });
});

test.describe("foco de teclado", () => {
  test("o primeiro controle focável desenha anel de 2px do acento", async ({ page }) => {
    await abrirEditorLimpo(page);
    await page.keyboard.press("Tab");
    const foco = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        outlineStyle: cs.outlineStyle,
        outlineWidth: cs.outlineWidth,
        outlineColor: cs.outlineColor,
        outlineOffset: cs.outlineOffset,
      };
    });
    expect(foco).not.toBeNull();
    expect(foco!.outlineStyle).toBe("solid");
    expect(parseFloat(foco!.outlineWidth)).toBeGreaterThanOrEqual(2);
    // Acento indigo #5E6AD2 = rgb(94, 106, 210). O token é HSL e o arredondamento
    // do navegador pode andar 2 pontos por canal; a tolerância é por isso.
    const canais = foco!.outlineColor.match(/\d+/g)!.map(Number);
    const esperado = [94, 106, 210];
    canais.slice(0, 3).forEach((canal, i) => {
      expect(Math.abs(canal - esperado[i])).toBeLessThanOrEqual(3);
    });
  });
});

test.describe("acessibilidade da galeria", () => {
  test("galeria sem violações críticas ou sérias", async ({ page }) => {
    await abrirGaleria(page);
    const resultado = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const bloqueantes = resultado.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(
      bloqueantes.map((v) => `${v.id}: ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" | ")}`),
    ).toEqual([]);
  });
});
