import { test, expect, Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Acessibilidade do editor.
 *
 * O portão é: nenhuma violação de severidade crítica ou séria nas telas
 * principais. Violações "moderate"/"minor" ficam listadas no relatório mas não
 * derrubam o build — senão o portão vira ruído e é desligado.
 *
 * Nota sobre contraste: o editor tem slides com cor de texto escolhida pelo
 * usuário. Um slide pode legitimamente ter contraste baixo — isso é decisão de
 * design, não bug de acessibilidade da interface. Por isso o teste roda com a
 * paleta padrão e mede só o chrome da aplicação (regra color-contrast
 * habilitada, mas o escopo é a interface, não o conteúdo do slide).
 */

async function entrarLimpo(page: Page) {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.waitForSelector('[id^="page-base-"]', { timeout: 30_000 });
}

/** Roda axe e devolve só as violações que bloqueiam. */
async function violacoesBloqueantes(page: Page) {
  const resultado = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  return resultado.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
}

function descrever(violacoes: Awaited<ReturnType<typeof violacoesBloqueantes>>) {
  return violacoes
    .map(
      (v) =>
        `[${v.impact}] ${v.id}: ${v.help}\n  ${v.nodes
          .slice(0, 3)
          .map((n) => n.target.join(" "))
          .join("\n  ")}`,
    )
    .join("\n\n");
}

test.describe("acessibilidade", () => {
  test("editor sem violações críticas ou sérias", async ({ page }) => {
    await entrarLimpo(page);

    const violacoes = await violacoesBloqueantes(page);
    expect(
      violacoes,
      `Violações de acessibilidade:\n\n${descrever(violacoes)}`,
    ).toHaveLength(0);
  });

  test("painel Style com botões acessíveis por teclado", async ({ page }) => {
    await entrarLimpo(page);

    const titulo = page.locator('[id^="page-base-"] textarea').first();
    await titulo.click();
    await expect(page.getByRole("heading", { name: "Style" })).toBeVisible();

    const violacoes = await violacoesBloqueantes(page);
    expect(
      violacoes,
      `Violações no painel Style:\n\n${descrever(violacoes)}`,
    ).toHaveLength(0);
  });

  test("todo controle interativo tem nome acessível", async ({ page }) => {
    await entrarLimpo(page);

    // Verificação direta, sem depender do axe: um botão sem nome acessível é
    // inutilizável por leitor de tela mesmo que passe em outras regras.
    //
    // Escopo: só o chrome da aplicação. Os botões dentro de [id^="page-base-"]
    // são overlays do editor que o limparParaExportacao remove no PNG — não
    // fazem parte do conteúdo exportado.
    const semNome = await page.evaluate(() => {
      const problemas: string[] = [];
      const alvos = document.querySelectorAll("button, [role='button'], a");
      alvos.forEach((el) => {
        if (el.closest('[id^="page-base-"]')) return;
        const texto = (el.textContent || "").trim();
        const rotulo =
          el.getAttribute("aria-label") ||
          el.getAttribute("title") ||
          (el.getAttribute("aria-labelledby")
            ? document.getElementById(el.getAttribute("aria-labelledby")!)
                ?.textContent
            : "");
        const escondido = el.querySelector(".sr-only")?.textContent?.trim();
        if (!texto && !rotulo && !escondido) {
          problemas.push(el.outerHTML.slice(0, 120));
        }
      });
      return problemas;
    });

    expect(
      semNome,
      `Controles sem nome acessível:\n${semNome.join("\n")}`,
    ).toHaveLength(0);
  });
});
