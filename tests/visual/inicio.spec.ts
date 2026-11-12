import { test, expect, Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PNG } from "pngjs";

import {
  CARROSSEIS_MOCK,
  DOCUMENTO_MOCK,
  FUNDO_DO_SLIDE,
  ID_EDITOR,
  abrirLista,
  prepararSessao,
} from "./ajuda";

/**
 * Tela inicial — os dez critérios da §8.1 do plano de UI.
 *
 * Cada teste diz no nome qual item da lista ele cobre. Onde o critério não pode
 * ser provado só com a tela (o "SQL conferido" do item 5, por exemplo), o teste
 * prova a metade que é dele — a tela — e o número do banco está no relatório da
 * rodada, medido contra a API real.
 *
 * A API é mockada (`prepararSessao`): o ambiente de teste não tem AutoClinic, e
 * é o padrão desta suíte desde a direção A. O que muda aqui é o formato do mock,
 * que agora tem `estado`, `estado_em` e `capa`.
 */

const CHIP = (rotulo: string) =>
  `[role="group"][aria-label="Filtrar por aba"] button:has-text("${rotulo}")`;

/**
 * Cor de fundo de um elemento: MEDIANA de um quadrado de 12 px, não um pixel.
 *
 * O slide do editor tem textura de papel (`paper-noise`) por cima do fundo, o
 * que move pixels isolados em ~8/255. Um único pixel reprovaria a comparação
 * por causa do ruído do desenho, não por causa da cor — a mediana devolve o
 * fundo, que é o que o critério compara.
 */
async function pixelDoElemento(page: Page, seletor: string, x = 6, y = 6, lado = 12) {
  const alvo = page.locator(seletor).first();
  const buffer = await alvo.screenshot();
  const png = PNG.sync.read(buffer);
  const canais = [[], [], []] as number[][];

  for (let dx = 0; dx < lado; dx += 1) {
    for (let dy = 0; dy < lado; dy += 1) {
      const px = Math.min(Math.max(0, x + dx), png.width - 1);
      const py = Math.min(Math.max(0, y + dy), png.height - 1);
      const idx = (png.width * py + px) << 2;
      canais[0].push(png.data[idx]);
      canais[1].push(png.data[idx + 1]);
      canais[2].push(png.data[idx + 2]);
    }
  }

  const mediana = (valores: number[]) => {
    const ordenados = [...valores].sort((a, b) => a - b);
    return ordenados[Math.floor(ordenados.length / 2)];
  };

  return { r: mediana(canais[0]), g: mediana(canais[1]), b: mediana(canais[2]) };
}

function hexParaRgb(hex: string) {
  const limpo = hex.replace("#", "");
  return {
    r: parseInt(limpo.slice(0, 2), 16),
    g: parseInt(limpo.slice(2, 4), 16),
    b: parseInt(limpo.slice(4, 6), 16),
  };
}

test.describe("§8.1 — tela inicial", () => {
  test("1. `/` responde 200 com sessão e manda para /login?de=/ sem sessão", async ({
    page,
    browser,
  }) => {
    await abrirLista(page);
    expect(page.url()).toContain("127.0.0.1");
    await expect(page.getByRole("heading", { name: "Carrosséis", level: 1 })).toBeVisible();

    // Contexto novo, sem o cookie `ac_sessao`: é o visitante sem sessão.
    const semSessao = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const outra = await semSessao.newPage();
    const resposta = await outra.goto("/", { waitUntil: "domcontentloaded" });
    expect(resposta?.status()).toBe(200); // o 200 é da tela de login
    const url = new URL(outra.url());
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("de")).toBe("/");
    await semSessao.close();
  });

  test("2. `/projetos` responde 301 para `/`", async ({ page }) => {
    const resposta = await page.request.get("/projetos", { maxRedirects: 0 });
    expect(resposta.status()).toBe(301);
    const destino = resposta.headers()["location"] ?? "";
    expect(destino.endsWith("/") || destino === "/").toBeTruthy();
  });

  test(`3. \`/?projeto=<id>\` responde 301 para /carrossel/<id>`, async ({ page }) => {
    const resposta = await page.request.get(`/?projeto=${ID_EDITOR}`, { maxRedirects: 0 });
    expect(resposta.status()).toBe(301);
    expect(resposta.headers()["location"] ?? "").toContain(`/carrossel/${ID_EDITOR}`);
  });

  test("4. nenhuma rota mostra a palavra 'projeto' (varredura de DOM)", async ({ page }) => {
    const rotas = ["/", `/carrossel/${ID_EDITOR}`, "/sinais", "/configuracoes"];
    const problemas: { rota: string; onde: string; texto: string }[] = [];

    for (const rota of rotas) {
      if (rota === "/") {
        await abrirLista(page, {}, rota);
      } else {
        // `/carrossel/<id>` e `/sinais` não têm grid de cartões: abrir com o
        // helper da lista esperaria por um seletor que nunca aparece.
        await prepararSessao(page, {});
        await page.goto(rota, { waitUntil: "domcontentloaded" });
      }
      // Espera a tela assentar: `/sinais` e `/configuracoes` carregam por
      // requisição, e varrer antes de o texto existir passaria sem provar nada.
      await page.waitForTimeout(1200);

      const achados = await page.evaluate(() => {
        const suspeitos: { onde: string; texto: string }[] = [];
        const andador = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let nos = 0;
        while (andador.nextNode()) {
          nos += 1;
          const no = andador.currentNode as Text;
          const texto = (no.textContent ?? "").trim();
          if (!texto) continue;
          if (!/projetos?/i.test(texto)) continue;
          const pai = no.parentElement;
          if (!pai) continue;
          const estilo = getComputedStyle(pai);
          if (estilo.display === "none" || estilo.visibility === "hidden") continue;
          const caixa = pai.getBoundingClientRect();
          if (caixa.width === 0 || caixa.height === 0) continue;
          suspeitos.push({ onde: pai.tagName.toLowerCase(), texto: texto.slice(0, 80) });
        }
        return { suspeitos, nos };
      });

      // Se o walker não viu texto nenhum, a varredura não provou nada.
      expect(achados.nos, `varredura vazia em ${rota}`).toBeGreaterThan(3);
      for (const achado of achados.suspeitos) problemas.push({ rota, ...achado });
    }

    expect(
      problemas,
      `A palavra "projeto" aparece no texto visível:\n${JSON.stringify(problemas, null, 1)}`,
    ).toEqual([]);
  });

  test("5. aba Para aprovar mostra 3 e só os 3 aguardando aprovação", async ({ page }) => {
    // O cenário do critério: 3 `aguardando_aprovacao` + 2 `aprovada` — os
    // mesmos números que o SQL do relatório mostra para a mesma base.
    await abrirLista(page);

    const chip = page.locator(CHIP("Para aprovar"));
    await expect(chip).toHaveAttribute("aria-pressed", "true");
    await expect(chip).toContainText("3");

    const cartoes = page.locator("[data-carrossel]");
    await expect(cartoes).toHaveCount(3);
    const estados = await cartoes.evaluateAll((nos) =>
      nos.map((n) => n.getAttribute("data-estado")),
    );
    expect(estados).toEqual(["aguardando_aprovacao", "aguardando_aprovacao", "aguardando_aprovacao"]);

    // A aba Aprovadas conta 2, e é a mesma lista filtrada por outro estado.
    await page.locator(CHIP("Aprovadas")).click();
    await expect(page.locator(CHIP("Aprovadas"))).toContainText("2");
    await expect(page.locator("[data-carrossel]")).toHaveCount(2);
    const aprovadas = await page
      .locator("[data-carrossel]")
      .evaluateAll((nos) => nos.map((n) => n.getAttribute("data-estado")));
    expect(aprovadas).toEqual(["aprovada", "aprovada"]);
  });

  test("6. a miniatura pinta a cor do slide 1 (comparação de pixel)", async ({ page }) => {
    // 6a. A cor do slide 1, medida no editor onde ele é renderizado de verdade.
    await prepararSessao(page, {});
    await page.goto(`/carrossel/${ID_EDITOR}/editar`);
    await page.waitForSelector('[id^="page-base-"]', { timeout: 30_000 });
    await page.evaluate(() => document.fonts.ready);
    // Canto superior esquerdo do slide: fora do título e de qualquer elemento.
    const doSlide = await pixelDoElemento(page, '[id^="page-base-"]', 6, 6);

    // 6b. A mesma cor, medida na miniatura do cartão na tela inicial.
    await abrirLista(page);
    const cartao = page.locator('[data-carrossel="a1"] [data-capa-real]');
    const daMiniatura = await pixelDoElemento(page, '[data-carrossel="a1"] [data-capa-real]', 6, 6);

    // 1) O que o critério pede: miniatura × slide do editor, tolerância 2/255.
    for (const canal of ["r", "g", "b"] as const) {
      expect(
        Math.abs(daMiniatura[canal] - doSlide[canal]),
        `miniatura × slide ${canal} (miniatura ${JSON.stringify(daMiniatura)} slide ${JSON.stringify(doSlide)})`,
      ).toBeLessThanOrEqual(2);
    }
    // 2) E que os dois venham da cor de fundo do slide 1 (o que prova que a
    //    miniatura não é tom derivado do id): comparação com folga de 3 para o
    //    ruído de textura do slide.
    const esperado = hexParaRgb(FUNDO_DO_SLIDE);
    for (const canal of ["r", "g", "b"] as const) {
      expect(Math.abs(daMiniatura[canal] - esperado[canal]), `miniatura × capa ${canal}`).toBeLessThanOrEqual(2);
      expect(Math.abs(doSlide[canal] - esperado[canal]), `slide × capa ${canal}`).toBeLessThanOrEqual(3);
    }

    // A miniatura existe e é 4:5, com 78 px de largura (§2.2).
    const caixa = await cartao.boundingBox();
    expect(caixa?.width ?? 0).toBeGreaterThanOrEqual(77);
    expect(caixa?.width ?? 0).toBeLessThanOrEqual(79);
    expect(Math.abs((caixa!.width / caixa!.height) - 4 / 5)).toBeLessThan(0.02);
  });

  test("7. busca acha palavra que só existe na legenda", async ({ page }) => {
    await abrirLista(page);
    // "exagero" não está em nenhum título: só na legenda do carrossel a1.
    const soNaLegenda = CARROSSEIS_MOCK.filter((c) => /exagero/i.test(c.legenda ?? ""));
    expect(soNaLegenda).toHaveLength(1);
    expect(CARROSSEIS_MOCK.some((c) => /exagero/i.test(c.titulo))).toBeFalsy();

    await page.getByRole("searchbox", { name: /buscar título, legenda ou hashtag/i }).fill("exagero");
    // Debounce de 300 ms + troca de URL: espera o resultado aparecer.
    await expect(page.locator("[data-carrossel]")).toHaveCount(1, { timeout: 10_000 });
    await expect(page.locator("[data-carrossel]")).toHaveAttribute("data-carrossel", "a1");
    expect(new URL(page.url()).searchParams.get("q")).toBe("exagero");

    // E a busca vazia sem resultado mostra o vazio com o termo e o botão de limpar.
    await page.getByRole("searchbox").fill("forno de pizza");
    await expect(page.locator("[data-estado='vazio-busca']")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Limpar busca" }).click();
    await expect(page.locator("[data-carrossel]")).toHaveCount(3);
  });

  test("8. teto diário: 409 do servidor aparece na tela", async ({ page }) => {
    const limite = "Limite diário atingido: 3 gerações por dia (max_por_dia = 3)";
    await abrirLista(page, {
      carrosseis: [
        ...CARROSSEIS_MOCK,
        {
          id: "c1",
          titulo: "Carrossel recém-criado, sem slide",
          estado: "a_produzir",
          estado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
          criado_em: new Date().toISOString(),
          versao_atual: 1,
          slides: 0,
          publico_ativo: false,
          capa: null,
        },
      ],
      geracao: { status: 409, corpo: { erro: limite } },
    });

    await page.locator(CHIP("A produzir")).click();
    await expect(page.locator("[data-carrossel]")).toHaveCount(1);
    await page.getByRole("button", { name: "Gerar" }).click();

    const faixa = page.locator("[data-estado='erro']");
    await expect(faixa).toBeVisible({ timeout: 10_000 });
    await expect(faixa).toContainText(limite);
  });

  test("9. os quatro estados: vazio, carregando, erro e lista", async ({ page }) => {
    // Lista
    await abrirLista(page);
    await expect(page.locator("[data-lista]")).toBeVisible();

    // Carregando
    await abrirLista(page, {}, "/?estado=carregando");
    await expect(page.locator("[data-estado='carregando']")).toBeVisible();
    await expect(page.locator("[data-estado='carregando'] > div")).toHaveCount(6);
    await expect(page.locator("[data-lista]")).toHaveCount(0);

    // Erro — faixa com o texto do servidor e "Tentar de novo"
    await abrirLista(page, {}, "/?estado=erro");
    const faixa = page.locator("[data-estado='erro']");
    await expect(faixa).toBeVisible();
    await expect(faixa.getByRole("button", { name: "Tentar de novo" })).toBeVisible();

    // Vazio de organização — borda tracejada, dois caminhos
    await abrirLista(page, {}, "/?estado=vazio");
    const vazio = page.locator("[data-estado='vazio']");
    await expect(vazio).toBeVisible();
    await expect(vazio).toContainText("Nenhum carrossel ainda");
    await expect(vazio.getByRole("link", { name: "Ver sinais" })).toBeVisible();
    await expect(vazio.getByRole("button", { name: "Novo" })).toBeVisible();

    // Vazio de aba — com peças em outra aba
    await abrirLista(page, {}, "/?aba=aprovadas&estado=publicada");
    await expect(page.locator("[data-estado='vazio-aba']")).toBeVisible();
    await expect(page.locator("[data-estado='vazio-aba']")).toContainText("Nada em");
  });

  for (const largura of [390, 1280]) {
    test(`10. axe sem violação crítica/séria em / a ${largura}px`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: largura === 390 ? 844 : 900 });
      await abrirLista(page);

      const resultado = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const bloqueantes = resultado.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );

      expect(
        bloqueantes,
        `Violações em ${largura}px:\n${bloqueantes
          .map((v) => `[${v.impact}] ${v.id}: ${v.help}\n  ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join("\n  ")}`)
          .join("\n\n")}`,
      ).toHaveLength(0);

      // Alvo de toque de 44 px no mobile (§8.1 item 10 + critério de acessibilidade).
      if (largura === 390) {
        const pequenos = await page.evaluate(() => {
          const problemas: { alvo: string; h: number; w: number }[] = [];
          document
            .querySelectorAll("button, a, input, select, [role='button']")
            .forEach((el) => {
              if (el.closest("[data-preview]")) return;
              const r = el.getBoundingClientRect();
              if (r.width === 0 || r.height === 0) return;
              const estilos = getComputedStyle(el);
              if (estilos.display === "none" || estilos.visibility === "hidden") return;
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
        expect(pequenos, `Alvos abaixo de 44px:\n${JSON.stringify(pequenos, null, 1)}`).toEqual([]);
      }
    });
  }
});

test.describe("§2.5 — ações em lote", () => {
  test("selecionar troca o cabeçalho e aprova pelos ids", async ({ page }) => {
    const pedidos: { url: string; corpo: string | null }[] = [];
    await abrirLista(page, {
      aprovacao: {
        status: 200,
        corpo: { aprovados: ["a1", "a2"], ignorados: [{ id: "a3", motivo: "estado `pronta` sem legenda" }] },
      },
    });
    page.on("request", (r) => {
      if (r.url().includes("/aprovar")) pedidos.push({ url: r.url(), corpo: r.postData() });
    });

    await page.locator('[data-carrossel="a1"] [role="checkbox"]').check();
    await page.locator('[data-carrossel="a2"] [role="checkbox"]').check();
    await page.locator('[data-carrossel="a3"] [role="checkbox"]').check();

    const barra = page.locator("[data-selecao]");
    await expect(barra).toBeVisible();
    await expect(barra).toContainText("3 selecionados");

    await barra.getByRole("button", { name: "Aprovar 3", exact: true }).click();
    await expect.poll(() => pedidos.length).toBe(1);
    expect(JSON.parse(pedidos[0].corpo ?? "{}").ids).toEqual(["a1", "a2", "a3"]);
  });

  test("excluir em lote pede confirmação e mostra o aviso do card", async ({ page }) => {
    await abrirLista(page);
    // b1 está `aprovada`: a aba padrão é "Para aprovar", onde ele não aparece.
    await page.locator(CHIP("Aprovadas")).click();
    await page.locator('[data-carrossel="b1"] [role="checkbox"]').check();
    await page.locator("[data-selecao]").getByRole("button", { name: "Excluir 1", exact: true }).click();

    const barra = page.locator("[data-selecao]");
    await expect(barra).toContainText("apaga o carrossel e todo o histórico");
    await expect(barra.getByRole("button", { name: "Excluir de vez" })).toBeVisible();
    await barra.getByRole("button", { name: "Cancelar" }).click();
    await expect(barra).toContainText("1 selecionado");
  });

  test("a barra some quando a seleção é limpa", async ({ page }) => {
    await abrirLista(page);
    await page.locator('[data-carrossel="a1"] [role="checkbox"]').check();
    await expect(page.locator("[data-selecao]")).toBeVisible();
    await page.getByRole("button", { name: "Limpar seleção" }).click();
    await expect(page.locator("[data-selecao]")).toHaveCount(0);
  });
});

test.describe("§2.2 — o que o cartão mostra", () => {
  test("título, densidade, estado, pauta e resumo da peça", async ({ page }) => {
    await abrirLista(page);
    const cartao = page.locator('[data-carrossel="a1"]');
    await expect(cartao.locator("h3")).toContainText("Fiscalização na estética");
    await expect(cartao).toContainText("7 slides · 1080×1350 · há 2 h");
    await expect(cartao).toContainText("Aguardando aprovação");
    await expect(cartao).toContainText("pauta: Vigilância sanitária");
    const legendaEsperada = `legenda ${(CARROSSEIS_MOCK[0].legenda ?? "").trim().length}/2200 · 2 hashtags · 2 fotos`;
    await expect(cartao).toContainText(legendaEsperada);
    // Autor não aparece no cartão (usuário único).
    await expect(cartao).not.toContainText("Ana Prado");
    await expect(cartao).not.toContainText("autor");
  });

  test("linha 4 não aparece quando não há legenda, hashtag nem foto", async ({ page }) => {
    await abrirLista(page);
    const cartao = page.locator('[data-carrossel="a2"]');
    await expect(cartao).not.toContainText("legenda");
    await expect(cartao).not.toContainText("hashtag");
  });
});

test.describe("§2.6 — paginação", () => {
  test("rodapé diz 1–24 de 58 e a segunda página continua a lista", async ({ page }) => {
    const muitos = Array.from({ length: 58 }, (_, i) => ({
      ...CARROSSEIS_MOCK[3],
      id: `p${i}`,
      titulo: `Carrossel número ${i}`,
      atualizado_em: new Date(Date.now() - i * 3_600_000).toISOString(),
      capa: { titulo: `Capa ${i}`, fundo: "#123B32", cor_texto: "#ffffff", slides: 6 },
    }));
    await abrirLista(page, { carrosseis: muitos });
    await page.locator(CHIP("Aprovadas")).click();

    await expect(page.locator("nav[aria-label='Paginação']")).toContainText("1–24 de 58");
    await expect(page.locator("[data-carrossel]")).toHaveCount(24);
    await page.getByRole("button", { name: "Próxima" }).click();
    await expect(page.locator("nav[aria-label='Paginação']")).toContainText("25–48 de 58");
    expect(new URL(page.url()).searchParams.get("pagina")).toBe("2");
  });
});

test.describe("§2.4 — ordenação", () => {
  test("“Mais antigo parado” ordena por estado_em ascendente", async ({ page }) => {
    await abrirLista(page);
    await page.locator(CHIP("Todas")).click();
    await page.getByRole("combobox", { name: "Ordenar carrosséis" }).selectOption("parado");
    // A ordenação passa pela URL (`?ordem=`); medir antes do `router.replace`
    // terminar lê a lista na ordem antiga e o teste reprova por corrida.
    await expect.poll(() => new URL(page.url()).searchParams.get("ordem")).toBe("parado");
    await expect
      .poll(() =>
        page
          .locator("[data-carrossel]")
          .evaluateAll((nos) => nos.map((n) => n.getAttribute("data-carrossel")).join(",")),
      )
      .toBe("a3,a2,b2,b1,a1");
    const ids = await page
      .locator("[data-carrossel]")
      .evaluateAll((nos) => nos.map((n) => n.getAttribute("data-carrossel")));
    // a3 (50 h) → b2 (9 h) → b1 (4 h) → a2 (26 h) não entra: a ordem é por
    // estado_em asc, então fica a3, a2(26h), b2(9h), b1(4h), a1(2h).
    expect(ids).toEqual(["a3", "a2", "b2", "b1", "a1"]);
  });
});

test("o documento mockado e o fundo da capa saem da mesma fonte", () => {
  // Guarda contra a armadilha de escrever o hex duas vezes e o teste passar
  // sem provar nada: `DOCUMENTO_MOCK` é a única definição de `FUNDO_DO_SLIDE`.
  expect(DOCUMENTO_MOCK.config.theme.background).toBe(FUNDO_DO_SLIDE);
  expect((CARROSSEIS_MOCK[0].capa as { fundo: string }).fundo).toBe(FUNDO_DO_SLIDE);
});
