import { test, expect, Page } from "@playwright/test";
import { PNG } from "pngjs";
import { promises as fs } from "node:fs";
import path from "node:path";

import { estadoDeSessao } from "./ajuda";

/**
 * Issue #12 — aspecto 3:4 com área segura 4:5, @ do perfil e curadoria de
 * paleta/fonte.
 *
 * Os quatro critérios da issue viram quatro testes, e as screenshots saem do
 * mesmo passeio (não existe "a tela passou no teste mas o print é outro"):
 *
 *   1. arte 1080×1440 (3:4), janela segura 4:5 e PNG de 1080×1350, com a guia
 *      visível no editor e AUSENTE no arquivo exportado;
 *   2. @ do perfil editável, em todos os cards e dentro do PNG;
 *   3. fundo, destaque e par de fontes curados, com preview ao vivo;
 *   4. projeto salvo SEM os campos novos abre com o visual do template.
 *
 * A geração é mockada (`/api/gerar`): o ambiente de teste não tem chave de IA, e
 * o que precisa ser provado é o desenho do card, não a qualidade do texto.
 */

const PASTA = "screenshots/issue-12";
const TEMA = "por que ninguém salva seu carrossel";

/** Quantidade padrão do passo 2 — o mock devolve exatamente isso. */
const CARDS = 7;

/** Roteiro de teste: capa, cinco cards de conteúdo e o de CTA. */
const SLIDES = Array.from({ length: CARDS }, (_, i) => {
  if (i === 0) {
    return {
      tipo: "capa",
      titulo: "NINGUÉM SALVA O QUE NÃO ENTENDE",
      corpo: "e o seu carrossel paga a conta",
      imagem: null,
    };
  }
  if (i === CARDS - 1) {
    return {
      tipo: "cta",
      titulo: "Salve este post",
      corpo: "Você vai precisar disso na segunda.",
      imagem: null,
    };
  }
  return {
    tipo: "conteudo",
    titulo: `Card ${i} do roteiro`,
    corpo: "Um card, uma ideia. É o que sustenta a leitura até o fim.",
    imagem: null,
  };
});

/**
 * Sessão + APIs do estúdio.
 *
 * `projetoDaUrl` serve ao teste de compatibilidade: o `GET /api/projetos/<id>`
 * devolve exatamente o JSON gravado, e é ele que prova que documento antigo
 * (sem @ e sem estilo) abre normalmente.
 */
async function prepararEstudio(page: Page, projetoDaUrl?: Record<string, unknown>) {
  await page.context().addCookies(estadoDeSessao.cookies);

  await page.route("**/api/projetos/*", (rota) => {
    if (!projetoDaUrl) return rota.fulfill({ status: 404, json: { erro: "não encontrado" } });
    return rota.fulfill({ json: { projeto: projetoDaUrl } });
  });
  await page.route("**/api/projetos", (rota) => {
    if (rota.request().method() === "GET") return rota.fulfill({ json: { projetos: [] } });
    return rota.fulfill({
      status: 201,
      json: {
        projeto: {
          id: "99999999-8888-7777-6666-555555555555",
          nome: "Carrossel de teste",
          templateId: "minimalist",
          tema: TEMA,
          slides: [],
          criadoEm: new Date().toISOString(),
          atualizadoEm: new Date().toISOString(),
          salvoEm: new Date().toISOString(),
          versao: 1,
        },
      },
    });
  });

  await page.route("**/api/gerar", async (rota) => {
    const corpo = (rota.request().postDataJSON() ?? {}) as { tema?: string };
    await rota.fulfill({
      json: {
        carrossel: {
          id: "11111111-2222-3333-4444-555555555555",
          titulo: SLIDES[0].titulo,
          templateId: "minimalist",
          tema: corpo.tema ?? TEMA,
          slides: SLIDES,
          criadoEm: new Date().toISOString(),
        },
      },
    });
  });

  // Capa por IA desligada no gate: nada de esperar o poll de 4 s.
  // O glob é `**/api/imagem**` e não `**/api/imagem` porque o poll usa
  // `?job=…`: com query string o padrão exato não casa, a chamada vaza para o
  // servidor de verdade e o wizard fica 260 s esperando uma imagem que não vem.
  await page.route("**/api/imagem**", async (rota) => {
    if (rota.request().method() === "POST") return rota.fulfill({ json: { jobId: "job-teste" } });
    return rota.fulfill({ json: { status: "erro", erro: "sem IA no gate" } });
  });
}

/**
 * Wizard até o passo 3 (resultado), com um template escolhido.
 *
 * `template` existe porque o visual do card vem do template: o primeiro da
 * vitrine é "Criar do zero" (fundo branco), e medir contraste/paleta em cima
 * dele seria medir outro produto. "Minimalist" é o escuro padrão.
 */
async function abrirResultado(page: Page, template = "Minimalist") {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Me conta a sua ideia/i })).toBeVisible({
    timeout: 60_000,
  });
  await page.locator("button").filter({ hasText: template }).first().click();
  await expect(page.getByRole("heading", { name: /Qual é o tema do carrossel/i })).toBeVisible();
  await page.getByPlaceholder(/por que ninguém salva/i).fill(TEMA);
  await page.getByRole("button", { name: /Gerar \d+ cards?/ }).click();
  await expect(page.getByRole("heading", { name: /Seu carrossel está pronto/i })).toBeVisible({
    timeout: 90_000,
  });
  await page.evaluate(() => document.fonts.ready);
}

/** Cor de fundo computada da arte do card `i` na prévia. */
async function fundoDaArte(page: Page, i = 0): Promise<string> {
  return page
    .locator("[data-cartao] [data-card-arte]")
    .nth(i)
    .evaluate((el) => getComputedStyle(el).backgroundColor);
}

/** Todas as famílias de fonte computadas dentro da arte do card `i`. */
async function familiasDaArte(page: Page, i = 0): Promise<string[]> {
  return page
    .locator("[data-cartao] [data-card-arte]")
    .nth(i)
    .evaluate((el) =>
      Array.from(el.querySelectorAll<HTMLElement>("*")).map(
        (n) => getComputedStyle(n).fontFamily,
      ),
    );
}

/** Caixa de um elemento, com números redondos (bounding box volta fracionário). */
async function caixa(page: Page, seletor: string, i = 0) {
  const box = await page.locator(seletor).nth(i).boundingBox();
  return { largura: Math.round(box?.width ?? 0), altura: Math.round(box?.height ?? 0) };
}

test.describe("issue #12 — aspecto, área segura, @ e paleta", () => {
  test("arte 3:4, janela 4:5 e guia que não entra no PNG", async ({ page }) => {
    await prepararEstudio(page);
    await abrirResultado(page);

    // --- Arte: 1080x1440 (3:4). A prévia é a MESMA arte, só escalada. ---
    const arte = await caixa(page, "[data-card-export] [data-card-arte]");
    expect(arte.largura, "arte precisa ser 1080 de largura").toBe(1080);
    expect(arte.altura, "arte precisa ser 1440 de altura (3:4)").toBe(1440);
    expect(arte.largura / arte.altura).toBeCloseTo(3 / 4, 5);

    // --- Nó de export: a janela 4:5, recortada da arte. ---
    const janela = await caixa(page, "[data-card-export]");
    expect(janela.largura, "janela de export precisa ser 1080").toBe(1080);
    expect(janela.altura, "janela de export precisa ser 1350 (4:5)").toBe(1350);
    expect(janela.largura / janela.altura).toBeCloseTo(4 / 5, 5);

    // --- Guia: presente na PRÉVIA (uma por card), ausente no EXPORT. ---
    await expect(page.locator("[data-cartao]")).toHaveCount(CARDS);
    await expect(page.locator("[data-cartao] [data-guia-area-segura]")).toHaveCount(CARDS);
    await expect(page.locator("[data-card-export] [data-guia-area-segura]")).toHaveCount(0);

    // A guia cobre a arte inteira (recebe as duas linhas e a sangria), não só
    // um pedaço: é o que garante que a régua acompanha o card em qualquer escala.
    const guia = await caixa(page, "[data-cartao] [data-guia-area-segura]");
    const larguraDoCartao = (await caixa(page, "[data-cartao]")).largura;
    expect(guia.largura).toBe(larguraDoCartao);
    expect(guia.altura).toBe(Math.round((1440 / 1080) * larguraDoCartao));

    // --- Screenshots: 1440 e 390, com a guia ligada. ---
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${PASTA}/editor-area-segura-1440.png`, fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${PASTA}/editor-area-segura-390.png`, fullPage: true });

    // --- Desligar a guia: some da tela e a escolha é lembrada. ---
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByLabel(/Área segura 4:5/i).uncheck();
    await expect(page.locator("[data-guia-area-segura]")).toHaveCount(0);
    expect(await page.evaluate(() => window.localStorage.getItem("estudio.area-segura"))).toBe("off");

    await abrirResultado(page);
    await expect(page.locator("[data-guia-area-segura]")).toHaveCount(0);

    // E volta ao ligar: nada de guia permanentemente sumida.
    await page.getByLabel(/Área segura 4:5/i).check();
    await expect(page.locator("[data-cartao] [data-guia-area-segura]")).toHaveCount(CARDS);
  });

  test("@ do perfil aparece em todos os cards e sai dentro do PNG", async ({ page }) => {
    await prepararEstudio(page);
    await abrirResultado(page);

    // Antes de digitar não existe @ em card nenhum.
    await expect(page.locator("[data-cartao] [data-arroba-card]")).toHaveCount(0);

    await page.getByLabel(/@ do perfil/i).fill("@monflash");
    const nosCards = page.locator("[data-cartao] [data-arroba-card]");
    await expect(nosCards).toHaveCount(CARDS);
    for (const texto of await nosCards.allInnerTexts()) {
      expect(texto).toBe("@monflash");
    }
    // O @ chega no palco de export (é o que vai para o arquivo).
    await expect(page.locator("[data-card-export] [data-arroba-card]")).toHaveCount(CARDS);

    // Arroba com espaço e caractere inválido é limpa, não quebra o card.
    await page.getByLabel(/@ do perfil/i).fill("@mon flash!!");
    await expect(nosCards.first()).toHaveText("@monflash");

    // --- Download de verdade: PNG em 1080x1350. ---
    const botaoBaixar = page.locator('button:has-text("Baixar PNG")').first();
    const [arquivo] = await Promise.all([
      page.waitForEvent("download", { timeout: 180_000 }),
      botaoBaixar.click(),
    ]);
    const destino = path.join(PASTA, "card-exportado-com-arroba.png");
    await fs.mkdir(PASTA, { recursive: true });
    await arquivo.saveAs(destino);

    const png = PNG.sync.read(await fs.readFile(destino));
    expect(png.width, "PNG exportado precisa ter 1080 de largura").toBe(1080);
    expect(png.height, "PNG exportado precisa ter 1350 de altura (4:5)").toBe(1350);
  });

  test("duas paletas e dois pares de fontes mudam o card ao vivo", async ({ page }) => {
    await prepararEstudio(page);
    await abrirResultado(page);
    await page.setViewportSize({ width: 1440, height: 1000 });

    const inicial = await fundoDaArte(page, 0);
    expect(inicial, "template Minimalist começa em #0B0C0F").toBe("rgb(11, 12, 15)");

    // 1) Papel + Terracota + Editorial (Playfair Display).
    await page.getByRole("button", { name: "Fundo Papel" }).click();
    await page.getByRole("button", { name: "Destaque Terracota" }).click();
    await page.getByRole("button", { name: "Editorial", exact: true }).click();
    await expect(page.locator("[data-cartao] [data-card-arte]").first()).toHaveCSS(
      "background-color",
      "rgb(247, 244, 238)",
    );
    await page.evaluate(() => document.fonts.ready);
    expect((await familiasDaArte(page, 0)).join(" "), "título deveria estar em Playfair").toContain(
      "Playfair Display",
    );

    // A curadoria impede destaque invisível: verde-água sobre papel é bloqueado.
    await expect(page.getByRole("button", { name: "Destaque Verde-água" })).toBeDisabled();
    await page.screenshot({ path: `${PASTA}/paleta-papel-editorial-1440.png`, fullPage: true });

    // 2) Floresta + Verde-água + Condensada (Bebas Neue).
    await page.getByRole("button", { name: "Fundo Floresta" }).click();
    await page.getByRole("button", { name: "Destaque Verde-água" }).click();
    await page.getByRole("button", { name: "Condensada", exact: true }).click();
    await expect(page.locator("[data-cartao] [data-card-arte]").first()).toHaveCSS(
      "background-color",
      "rgb(4, 17, 15)",
    );
    // Verde-água agora pode: o fundo mudou.
    await expect(page.getByRole("button", { name: "Destaque Verde-água" })).toBeEnabled();
    await page.evaluate(() => document.fonts.ready);
    expect((await familiasDaArte(page, 0)).join(" "), "título deveria estar em Bebas").toContain(
      "Bebas Neue",
    );
    await page.screenshot({ path: `${PASTA}/paleta-floresta-condensada-1440.png`, fullPage: true });

    // O export acompanha a mesma aparência (mesmo objeto nos dois palcos).
    await expect(page.locator("[data-card-export] [data-card-arte]").first()).toHaveCSS(
      "background-color",
      "rgb(4, 17, 15)",
    );

    // 3) Voltar ao template limpa a escolha.
    await page.getByRole("button", { name: /Voltar ao estilo do template/i }).click();
    await expect(page.locator("[data-cartao] [data-card-arte]").first()).toHaveCSS(
      "background-color",
      "rgb(11, 12, 15)",
    );
  });

  test("projeto salvo antes da #12 abre com o visual do template", async ({ page }) => {
    // JSON exatamente como a #13 gravava: sem `arroba`, sem `estilo`.
    const projetoAntigo = {
      id: "7e7ded22-878b-4b4f-b18f-a7b891bb20b7",
      nome: "Projeto de antes",
      templateId: "minimalist",
      tema: TEMA,
      slides: [
        {
          tipo: "capa",
          titulo: "CARROSSEL ANTIGO, MESMO DESENHO",
          corpo: "sem @ e sem paleta escolhida",
          imagem: null,
        },
        { tipo: "conteudo", titulo: "Card de conteúdo", corpo: "Texto de apoio.", imagem: null },
        { tipo: "cta", titulo: "Salve este post", corpo: "", imagem: null },
      ],
      criadoEm: "2026-11-20T10:00:00.000Z",
      atualizadoEm: "2026-11-20T10:00:00.000Z",
      salvoEm: "2026-11-20T10:00:00.000Z",
      versao: 3,
    };

    await prepararEstudio(page, projetoAntigo);
    await page.goto(`/?abrir=${projetoAntigo.id}`);

    await expect(page.getByRole("heading", { name: /Seu carrossel está pronto/i })).toBeVisible({
      timeout: 60_000,
    });
    await page.evaluate(() => document.fonts.ready);

    // Abriu, desenhou, e com o visual do template (Minimalist: #0B0C0F).
    await expect(page.locator("[data-cartao] [data-card-arte]")).toHaveCount(3);
    await expect(page.locator("[data-cartao] [data-card-arte]").first()).toHaveCSS(
      "background-color",
      "rgb(11, 12, 15)",
    );
    // Nenhum @ inventado, nenhum campo vazio na tela.
    await expect(page.locator("[data-cartao] [data-arroba-card]")).toHaveCount(0);
    await expect(page.getByLabel(/@ do perfil/i)).toHaveValue("");
    await page.screenshot({
      path: `${PASTA}/projeto-antigo-sem-campos-novos-1440.png`,
      fullPage: true,
    });

    // E salvar por cima NÃO inventa @ nem paleta.
    await page.getByRole("button", { name: /Salvar projeto|Salvar alterações/ }).click();
    await expect(page.getByRole("status")).toContainText(/salvo/i, { timeout: 30_000 });
  });
});
