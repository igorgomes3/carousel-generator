#!/usr/bin/env node
/**
 * Screenshots da direção A (Neutro denso) para docs/design/shots/impl-a/.
 *
 * Por que um script e não um teste: é evidência visual versionada, não um portão.
 * Ele também mede estouro horizontal em px em cada largura pedida — número, não
 * impressão — e é isso que o relatório cita.
 *
 * Uso:
 *   BASE=http://127.0.0.1:8110 node scripts/screenshots-impl-a.mjs
 *
 * Autenticação: o middleware exige o cookie `ac_sessao=1` para renderizar o
 * editor. O cookie aqui é só o marcador de "tem sessão" (ver src/middleware.ts);
 * a API é mockada nas rotas /api/ac/*, então nada toca o banco de verdade.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(__dirname, "..");
const saida = path.join(raiz, "docs", "design", "shots", "impl-a");
const BASE = process.env.BASE || "http://127.0.0.1:8110";

const PROJETOS = [
  {
    id: "p1",
    titulo: "Fiscalização na estética: 7 pontos que a Vigilância olha antes de autuar",
    versao_atual: 4,
    publico_ativo: true,
    atualizado_em: new Date(Date.now() - 2 * 3600_000).toISOString(),
    slides: 7,
    autor_nome: "Ana Prado",
    autor_email: "ana@autoclinic.com",
  },
  {
    id: "p2",
    titulo: "Harmonização facial: o que muda com a nova regra da Anvisa",
    versao_atual: 2,
    publico_ativo: false,
    atualizado_em: new Date(Date.now() - 26 * 3600_000).toISOString(),
    slides: 6,
    autor_nome: "Ana Prado",
    autor_email: "ana@autoclinic.com",
  },
  {
    id: "p3",
    titulo: "Precificação de protocolo: como parar de perder margem",
    versao_atual: 1,
    publico_ativo: false,
    atualizado_em: new Date(Date.now() - 3 * 86400_000).toISOString(),
    slides: 5,
    autor_nome: "Clécio Menezes",
    autor_email: "clecio@autoclinic.com",
  },
  {
    id: "p4",
    titulo: "Como responder avaliação negativa no Google sem parecer robô",
    versao_atual: 3,
    publico_ativo: true,
    atualizado_em: new Date(Date.now() - 5 * 86400_000).toISOString(),
    slides: 5,
    autor_nome: "Ana Prado",
    autor_email: "ana@autoclinic.com",
  },
  {
    id: "p5",
    titulo: "Retenção de paciente: o protocolo que faz voltar em 30 dias",
    versao_atual: 2,
    publico_ativo: false,
    atualizado_em: new Date(Date.now() - 6 * 86400_000).toISOString(),
    slides: 6,
    autor_nome: "Ana Prado",
    autor_email: "ana@autoclinic.com",
  },
  {
    id: "p6",
    titulo: "Sala de procedimento: o checklist da RDC 63",
    versao_atual: 1,
    publico_ativo: true,
    atualizado_em: new Date(Date.now() - 8 * 86400_000).toISOString(),
    slides: 5,
    autor_nome: "Clécio Menezes",
    autor_email: "clecio@autoclinic.com",
  },
];

const USUARIO = {
  usuario: {
    id: "u1",
    email: "ana@autoclinic.com",
    nome: "Ana Prado",
    papel: "admin",
    organization_id: "org-autoclinic",
    deve_trocar_senha: false,
  },
};

/** Mocka a API do AutoClinic: as telas não dependem do banco para renderizar. */
async function mockarApi(page) {
  await page.route("**/api/auth/refresh", async (rota) => {
    return rota.fulfill({ json: { access_token: "token-de-teste", refresh_token: "refresh-de-teste" } });
  });
  await page.route("**/api/ac/**", async (rota) => {
    const url = rota.request().url();
    if (url.includes("/me")) {
      return rota.fulfill({ json: USUARIO });
    }
    if (url.includes("/carrossel/projetos") && rota.request().method() === "GET") {
      return rota.fulfill({ json: { projetos: PROJETOS } });
    }
    if (url.includes("/conteudo/fila")) {
      return rota.fulfill({ json: { fila: [] } });
    }
    return rota.fulfill({ json: {} });
  });
}

/** Mede estouro horizontal em px: documento e elementos que passam da viewport. */
async function medirEstouro(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const estouroDocumento = Math.max(
      doc.scrollWidth - doc.clientWidth,
      document.body.scrollWidth - document.body.clientWidth,
    );
    const largura = doc.clientWidth;
    const culpados = [];
    /** Um elemento dentro de um trilho com overflow cortado não estoura a tela. */
    const cortadoPorAncestral = (el) => {
      let pai = el.parentElement;
      while (pai && pai !== document.body) {
        const estilo = getComputedStyle(pai);
        if (
          estilo.overflowX === "hidden" ||
          estilo.overflowX === "auto" ||
          estilo.overflowX === "scroll" ||
          estilo.overflow === "hidden"
        ) {
          return true;
        }
        pai = pai.parentElement;
      }
      return false;
    };
    document.querySelectorAll("body *").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const passa = Math.round(r.right - largura);
      if (passa > 1 && !cortadoPorAncestral(el)) {
        culpados.push({
          tag: el.tagName.toLowerCase(),
          classe: (el.className || "").toString().slice(0, 60),
          passa,
        });
      }
    });
    culpados.sort((a, b) => b.passa - a.passa);
    return { estouroDocumento, culpados: culpados.slice(0, 5) };
  });
}

const LARGURAS = [360, 390, 768, 1024, 1280, 1440];

async function main() {
  fs.mkdirSync(saida, { recursive: true });
  const navegador = await chromium.launch();
  const relatorio = { editor: {}, galeria: {}, estouro: [] };

  for (const largura of LARGURAS) {
    const altura = largura <= 430 ? 844 : 900;
    const contexto = await navegador.newContext({
      viewport: { width: largura, height: altura },
      deviceScaleFactor: 1,
    });
    await contexto.addCookies([
      { name: "ac_sessao", value: "1", domain: "127.0.0.1", path: "/" },
    ]);
    // Marcador de sessão no localStorage: `garantirSessao()` tenta renovar antes
    // de renderizar tela privada, e sem refresh token ela cai no /login.
    await contexto.addInitScript(() => {
      window.localStorage.setItem("ac_refresh", "refresh-de-teste");
    });

    // ---- editor ----
    const editor = await contexto.newPage();
    await mockarApi(editor);
    await editor.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await editor.evaluate(() => window.localStorage.clear());
    await editor.reload({ waitUntil: "domcontentloaded" });
    await editor.waitForSelector('[id^="page-base-"]', { timeout: 30_000 });
    await editor.evaluate(() => document.fonts.ready);
    await editor.waitForTimeout(600);
    relatorio.estouro.push({
      tela: "editor",
      largura,
      ...(await medirEstouro(editor)),
    });
    if (largura === 1280 || largura === 390) {
      const arquivo = path.join(saida, `editor-${largura}.png`);
      await editor.screenshot({ path: arquivo });
      relatorio.editor[largura] = path.relative(raiz, arquivo);
    }
    await editor.close();

    // ---- galeria ----
    const galeria = await contexto.newPage();
    await mockarApi(galeria);
    await galeria.goto(`${BASE}/projetos`, { waitUntil: "domcontentloaded" });
    // O editor desta mesma sessão gravou um rascunho no localStorage; na captura
    // da galeria ele não deve aparecer (o mockup não tem a faixa de importação).
    await galeria.evaluate(() => window.localStorage.removeItem("documentFormKey"));
    await galeria.reload({ waitUntil: "domcontentloaded" });
    await galeria.waitForSelector("article", { timeout: 30_000 });
    await galeria.evaluate(() => document.fonts.ready);
    await galeria.waitForTimeout(600);
    relatorio.estouro.push({
      tela: "galeria",
      largura,
      ...(await medirEstouro(galeria)),
    });
    if (largura === 1280 || largura === 390) {
      const arquivo = path.join(saida, `galeria-${largura}.png`);
      await galeria.screenshot({ path: arquivo, fullPage: false });
      relatorio.galeria[largura] = path.relative(raiz, arquivo);
    }
    await galeria.close();
    await contexto.close();
  }

  await navegador.close();
  const arquivoRelatorio = path.join(saida, "medicoes.json");
  fs.writeFileSync(arquivoRelatorio, JSON.stringify(relatorio, null, 2));
  console.log(JSON.stringify(relatorio, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
