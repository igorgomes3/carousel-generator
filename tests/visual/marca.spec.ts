import { test, expect, Page } from "@playwright/test";
import { abrirEditorLimpo, MARCA_MOCK } from "./ajuda";

/**
 * Marca da organização no slide — Fase 0.
 *
 * O que este teste protege, e por que ele é de pixel e não de unidade: antes de
 * hoje o nome e o @ vinham de `defaultValues` (`My name` / `@name`), então a peça
 * entregue ao cliente saía assinada com o placeholder. Hoje a marca vem das
 * configurações da organização (`GET /api/carrossel/marca`), e a única prova que
 * vale é o slide renderizado.
 *
 * Duas metades da mesma regra:
 *   1. com marca, o slide mostra nome e @ da organização;
 *   2. sem marca, o slide não mostra nada — e nunca o placeholder.
 */

async function abrirCom(page: Page, marca: typeof MARCA_MOCK | null) {
  await abrirEditorLimpo(page, marca);
}

test.describe("marca da organização no slide", () => {
  test("slide novo nasce com o nome e o @ da organização", async ({ page }) => {
    await abrirCom(page, MARCA_MOCK);

    const slide = page.locator('[id^="page-base-"]').first();
    await expect(slide.getByText(MARCA_MOCK.nome, { exact: true })).toBeVisible();
    await expect(slide.getByText(MARCA_MOCK.handle, { exact: true })).toBeVisible();
    await expect(slide.getByText("My name", { exact: true })).toHaveCount(0);
    await expect(slide.getByText("@name", { exact: true })).toHaveCount(0);
  });

  test("marca vazia não imprime placeholder", async ({ page }) => {
    await abrirCom(page, null);

    const slide = page.locator('[id^="page-base-"]').first();
    await expect(slide.getByText("My name", { exact: true })).toHaveCount(0);
    await expect(slide.getByText("@name", { exact: true })).toHaveCount(0);
    // A numeração do slide continua lá: o que sai de cena é só a assinatura.
    await expect(slide.getByText("1", { exact: true }).first()).toBeVisible();
  });
});
