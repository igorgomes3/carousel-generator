import { test, expect, Page } from "@playwright/test";
import { PNG } from "pngjs";

import { estadoDeSessao } from "./ajuda";

/**
 * Passo 2 do wizard — número de cards e foto por card (issue #11).
 *
 * Por que este arquivo é um teste e não só um script de screenshot: os cinco
 * critérios da issue são verificáveis — 3 a 10 sem valor absurdo, upload com
 * troca e remoção, foto dentro do card 1080x1350, mensagem clara na recusa e
 * alvo de 44 px com `aria-label`. As screenshots são consequência do mesmo
 * passeio, então não existe "a tela passou no teste mas o print saiu outro".
 *
 * A geração é MOCKADA (`/api/gerar`): o ambiente de teste não tem chave de IA, e
 * o que precisa ser provado aqui é o contrato — quantos cards voltam e para onde
 * vai a foto —, não a qualidade do texto.
 */

const PASTA = "screenshots/issue-11";
const TEMA = "por que ninguém salva seu carrossel";

/** PNG sólido com um bloco de outra cor: o `object-fit: cover` fica visível no print. */
function pngDeTeste(largura = 900, altura = 1125): Buffer {
  const png = new PNG({ width: largura, height: altura });
  for (let y = 0; y < altura; y += 1) {
    for (let x = 0; x < largura; x += 1) {
      const idx = (largura * y + x) << 2;
      const faixa = y > altura * 0.55 && y < altura * 0.8;
      png.data[idx] = faixa ? 244 : 32 + Math.round((x / largura) * 60);
      png.data[idx + 1] = faixa ? 81 : 60 + Math.round((y / altura) * 90);
      png.data[idx + 2] = faixa ? 30 : 110;
      png.data[idx + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

const FOTO = { name: "foto-card.png", mimeType: "image/png", buffer: pngDeTeste() };

/**
 * Sessão + APIs do estúdio.
 *
 * `/api/gerar` devolve SEMPRE três slides a mais do que foi pedido, de
 * propósito: é o caso em que o pipeline escreve mais do que a pessoa escolheu,
 * e o contrato do seletor tem que vencer.
 */
async function prepararEstudio(page: Page, pedidoEsperado: { valor: number } = { valor: 7 }) {
  await page.context().addCookies(estadoDeSessao.cookies);

  await page.route("**/api/projetos", (rota) => rota.fulfill({ json: { projetos: [] } }));

  await page.route("**/api/gerar", async (rota) => {
    const corpo = (rota.request().postDataJSON() ?? {}) as { tema?: string; slides?: number };
    pedidoEsperado.valor = Number(corpo.slides ?? 0);
    const quantidade = Math.min(10, Math.max(3, pedidoEsperado.valor)) + 3;
    const slides = Array.from({ length: quantidade }, (_, i) => ({
      tipo: i === 0 ? "capa" : i === quantidade - 1 ? "cta" : "conteudo",
      titulo: i === 0 ? "NINGUÉM SALVA O QUE NÃO ENTENDE" : `Card ${i + 1} do roteiro`,
      corpo: i === 0 ? "e o seu carrossel paga a conta" : "Texto curto, de apoio ao título.",
      imagem: null,
    }));
    await rota.fulfill({
      json: {
        carrossel: {
          id: "11111111-2222-3333-4444-555555555555",
          titulo: slides[0].titulo,
          templateId: "minimalist",
          tema: corpo.tema ?? TEMA,
          slides,
          criadoEm: new Date().toISOString(),
        },
      },
    });
  });

  // Capa por IA: sucesso imediato, para o teste não esperar 40 s de poll.
  await page.route("**/api/imagem", async (rota) => {
    if (rota.request().method() === "POST") return rota.fulfill({ json: { jobId: "job-teste" } });
    return rota.fulfill({
      json: { status: "done", imagem: `data:image/png;base64,${pngDeTeste(600, 750).toString("base64")}` },
    });
  });
}

async function abrirPasso2(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Me conta a sua ideia/i })).toBeVisible({
    timeout: 60_000,
  });
  await page.locator('button:has-text("Usar")').first().click();
  await expect(page.getByRole("heading", { name: /Qual é o tema do carrossel/i })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

test.describe("passo 2 — cards e foto", () => {
  test("quantidade: 3 a 10, número visível e sem digitação livre", async ({ page }) => {
    await prepararEstudio(page);
    await abrirPasso2(page);

    const numero = page.locator("[data-quantidade-cards]");
    await expect(numero).toHaveText("7 cards");

    // Não existe campo de digitação para a quantidade em lugar nenhum da tela.
    await expect(page.locator('input[type="number"]')).toHaveCount(0);

    const mais = page.locator("[data-mais-cards]");
    const menos = page.locator("[data-menos-cards]");

    for (let i = 0; i < 3; i += 1) await mais.click();
    await expect(numero).toHaveText("10 cards");
    await expect(mais).toBeDisabled();

    for (let i = 0; i < 7; i += 1) await menos.click();
    await expect(numero).toHaveText("3 cards");
    await expect(menos).toBeDisabled();
  });

  test("screenshots do passo 2 vazio, com foto e depois de remover", async ({ page }) => {
    await prepararEstudio(page);

    for (const largura of [390, 1440]) {
      await page.setViewportSize({ width: largura, height: largura === 390 ? 844 : 1000 });
      await abrirPasso2(page);

      // 1) Vazio: nenhuma foto em nenhum card.
      await expect(page.locator("[data-tem-foto='1']")).toHaveCount(0);
      await page.screenshot({ path: `${PASTA}/passo2-vazio-${largura}.png`, fullPage: true });

      // 2) Com 1 foto, no card 3 (índice 2).
      await page.locator("[data-card-foto='2'] input[type='file']").setInputFiles(FOTO);
      await expect(page.locator("[data-card-foto='2']")).toHaveAttribute("data-tem-foto", "1", {
        timeout: 30_000,
      });
      await expect(page.getByText("1 de 7 com foto")).toBeVisible();
      await page.screenshot({ path: `${PASTA}/passo2-1-imagem-${largura}.png`, fullPage: true });

      // 3) Depois de remover: volta ao estado vazio com a mensagem de ajuda.
      await page.getByRole("button", { name: /Remover a imagem do card 3/ }).click();
      await expect(page.locator("[data-tem-foto='1']")).toHaveCount(0);
      await expect(page.getByText("Nenhuma foto ainda: o carrossel funciona igual")).toBeVisible();
      await page.screenshot({ path: `${PASTA}/passo2-sem-imagem-${largura}.png`, fullPage: true });
    }
  });

  test("alvos de 44 px e aria nos controles de upload", async ({ page }) => {
    await prepararEstudio(page);
    await abrirPasso2(page);

    const tiles = page.locator("[data-card-foto]");
    await expect(tiles).toHaveCount(7);

    for (let i = 0; i < 7; i += 1) {
      const tile = tiles.nth(i);
      const botao = tile.getByRole("button").first();
      const rotulo = await botao.getAttribute("aria-label");
      expect(rotulo, `card ${i + 1} sem aria-label`).toBeTruthy();
      expect(rotulo).toContain("até 8 MB");
      const caixa = await botao.boundingBox();
      expect(caixa?.height ?? 0, `botão de upload do card ${i + 1} abaixo de 44 px`).toBeGreaterThanOrEqual(
        44,
      );
      // O input de arquivo correspondente também tem nome acessível.
      const entrada = tile.locator("input[type='file']");
      await expect(entrada).toHaveAttribute("aria-label", /Arquivo de imagem d[ao] .+/i);
      await expect(entrada).toHaveAttribute("accept", "image/jpeg,image/png,image/webp");
    }

    // O botão de remover (que só existe com foto) também precisa dos 44 px.
    await page.locator("[data-card-foto='0'] input[type='file']").setInputFiles(FOTO);
    const remover = page.getByRole("button", { name: /Remover a imagem da capa/ });
    await expect(remover).toBeVisible({ timeout: 30_000 });
    const caixaRemover = await remover.boundingBox();
    expect(caixaRemover?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  test("recusa arquivo grande e formato errado com mensagem de gente", async ({ page }) => {
    await prepararEstudio(page);
    await abrirPasso2(page);

    const entrada = page.locator("[data-card-foto='1'] input[type='file']");
    const aviso = page.locator("[data-erro-fotos]");

    await entrada.setInputFiles({
      name: "contrato.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 nada de imagem"),
    });
    await expect(aviso).toContainText("JPG, PNG ou WebP");

    await entrada.setInputFiles({
      name: "foto-grande.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.alloc(9 * 1024 * 1024, 7),
    });
    await expect(aviso).toContainText("limite é 8 MB");

    // Nada foi gravado no card errado.
    await expect(page.locator("[data-card-foto='1']")).toHaveAttribute("data-tem-foto", "0");
  });

  test("a foto entra no card 1080x1350 e o card sem foto não quebra", async ({ page }) => {
    const pedido = { valor: 7 };
    await prepararEstudio(page, pedido);
    await abrirPasso2(page);

    // 4 cards escolhidos; o mock devolve 7 para provar que o seletor vence.
    const menos = page.locator("[data-menos-cards]");
    for (let i = 0; i < 3; i += 1) await menos.click();
    await expect(page.locator("[data-quantidade-cards]")).toHaveText("4 cards");

    await page.locator("[data-card-foto='0'] input[type='file']").setInputFiles(FOTO);
    await expect(page.locator("[data-card-foto='0']")).toHaveAttribute("data-tem-foto", "1", {
      timeout: 30_000,
    });
    // Uma foto também num card de CONTEÚDO: é ele que mudou de layout (a foto
    // deixou de ser faixa no meio do texto e virou fundo).
    await page.locator("[data-card-foto='1'] input[type='file']").setInputFiles(FOTO);
    await expect(page.locator("[data-card-foto='1']")).toHaveAttribute("data-tem-foto", "1", {
      timeout: 30_000,
    });

    await page.getByPlaceholder(/por que ninguém salva/i).fill(TEMA);
    await page.getByRole("button", { name: /Gerar 4 cards/ }).click();

    await expect(page.getByRole("heading", { name: /Seu carrossel está pronto/i })).toBeVisible({
      timeout: 60_000,
    });
    expect(pedido.valor, "a quantidade escolhida precisa ir no POST").toBe(4);

    const cards = page.locator("[data-card-export]");
    await expect(cards).toHaveCount(4);
    await expect(page.getByText("4 cards em 1080×1350", { exact: false })).toBeVisible();

    // A capa e o card 2 têm a foto como fundo; os outros caem no gradiente do template.
    const capa = cards.nth(0);
    await expect(capa.locator("img")).toHaveCount(1);
    await expect(capa.locator("img")).toHaveAttribute("src", /^data:image\//);
    const caixaCapa = await capa.locator("img").boundingBox();
    expect(Math.round(caixaCapa?.width ?? 0)).toBe(1080);
    expect(Math.round(caixaCapa?.height ?? 0)).toBe(1350);

    const conteudo = cards.nth(1);
    await expect(conteudo.locator("img")).toHaveCount(1);
    const caixaConteudo = await conteudo.locator("img").boundingBox();
    expect(Math.round(caixaConteudo?.width ?? 0)).toBe(1080);
    expect(Math.round(caixaConteudo?.height ?? 0)).toBe(1350);

    for (const i of [2, 3]) {
      await expect(cards.nth(i).locator("img")).toHaveCount(0);
      await expect(cards.nth(i)).toContainText(/Card \d|Salve este post/);
    }

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${PASTA}/resultado-com-foto-1440.png`, fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `${PASTA}/resultado-com-foto-390.png`, fullPage: true });
  });
});
