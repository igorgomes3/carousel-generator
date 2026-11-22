/**
 * Prova visual da issue #13 — "Salvar projeto e Meus projetos".
 *
 * Sobe contra um servidor já rodando (padrão `http://127.0.0.1:8098`) e percorre
 * o caminho do usuário de verdade: lista vazia → salvar → lista com itens →
 * renomear → apagar com confirmação → abrir no estúdio → editar → salvar com
 * hora na tela. Cada passo tem asserção; se algo não acontecer, o script falha
 * em vez de gerar screenshot bonito de tela quebrada.
 *
 * As capturas saem em 1440 e 390 (`screenshots/projetos/`), que é o par que o
 * CEO pede: desktop e celular.
 *
 * Requisito de ambiente: `ESTUDIO_DADOS` apontando para um diretório VAZIO —
 * o estado inicial é "nenhum projeto salvo" e ele precisa ser verdade.
 *
 *   ESTUDIO_DADOS=$(mktemp -d) BASE=http://127.0.0.1:8098 node scripts/prova-projetos.mjs
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

const BASE = process.env.BASE ?? "http://127.0.0.1:8098";
const SAIDA = process.env.SAIDA ?? "screenshots/projetos";
mkdirSync(SAIDA, { recursive: true });

/* ------------------------------------------------------------------ */
/* Payload de prova (dado real, não placeholder na tela)               */
/* ------------------------------------------------------------------ */

/** PNG 8×8 gerado aqui mesmo: serve para provar que a capa grava em arquivo. */
function pngDeProva([r, g, b]) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (tipo, dados) => {
    const tam = Buffer.alloc(4);
    tam.writeUInt32BE(dados.length);
    const corpo = Buffer.concat([Buffer.from(tipo), dados]);
    const fim = Buffer.alloc(4);
    fim.writeUInt32BE(crc(corpo));
    return Buffer.concat([tam, corpo, fim]);
  };
  const w = 8;
  const h = 8;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const linhas = [];
  for (let y = 0; y < h; y += 1) linhas.push(Buffer.from([0, r, g, b, r, g, b, r, g, b, r, g, b, r, g, b, r, g, b, r, g, b, r, g, b]));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.concat(linhas))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const CAPA = `data:image/png;base64,${pngDeProva([20, 60, 50]).toString("base64")}`;

const PROJETOS = [
  {
    nome: "5 erros que matam seu carrossel",
    templateId: "minimalist",
    tema: "5 erros que fazem seu carrossel não ser salvo",
    slides: [
      { tipo: "capa", titulo: "5 ERROS QUE MATAM SEU CARROSSEL", corpo: "", imagem: CAPA },
      { tipo: "conteudo", titulo: "1. Texto demais", corpo: "Ninguém lê. Uma ideia por card.", imagem: null },
      { tipo: "cta", titulo: "Salve este post", corpo: "Comenta o que você faria diferente.", imagem: null },
    ],
  },
  {
    nome: "Checklist do perfil que vende",
    templateId: "impacto",
    tema: "checklist de perfil profissional que vende",
    slides: [
      { tipo: "capa", titulo: "CHECKLIST DO PERFIL QUE VENDE", corpo: "", imagem: null },
      { tipo: "conteudo", titulo: "Bio com promessa", corpo: "Diga o que a pessoa ganha em uma linha.", imagem: null },
      { tipo: "conteudo", titulo: "Destaques com 3 temas", corpo: "Prova, processo e bastidor.", imagem: null },
      { tipo: "cta", titulo: "Salve para não esquecer", corpo: "", imagem: null },
    ],
  },
  {
    nome: "Antes e depois de um carrossel",
    templateId: "autoral",
    tema: "antes e depois de um carrossel bem feito",
    slides: [
      { tipo: "capa", titulo: "ANTES E DEPOIS", corpo: "", imagem: null },
      { tipo: "conteudo", titulo: "Antes", corpo: "Texto corrido, sem pausa visual.", imagem: null },
      { tipo: "cta", titulo: "Qual dos dois você salvaria?", corpo: "", imagem: null },
    ],
  },
];

/* ------------------------------------------------------------------ */

async function novoContexto(browser, width, height) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  });
  // O app inteiro mora atrás do marcador de sessão (src/middleware.ts).
  await ctx.addCookies([{ name: "ac_sessao", value: "1", domain: "127.0.0.1", path: "/" }]);
  return ctx;
}

async function criarProjetos(ctx, quantos) {
  const criados = [];
  for (const projeto of PROJETOS.slice(0, quantos)) {
    const res = await ctx.request.post(`${BASE}/api/projetos`, { data: projeto });
    if (res.status() !== 201) throw new Error(`POST /api/projetos → ${res.status()}: ${await res.text()}`);
    criados.push((await res.json()).projeto);
  }
  return criados;
}

async function listaTem(page, quantidade) {
  await page.waitForFunction(
    (n) => document.querySelectorAll("article").length === n,
    quantidade,
    { timeout: 15_000 },
  );
}

async function cenario(width, height, browser) {
  const sufixo = width === 390 ? "390" : "1440";
  const ctx = await novoContexto(browser, width, height);
  const page = await ctx.newPage();
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") erros.push(m.text());
  });

  /* 1. Lista vazia ------------------------------------------------ */
  await page.goto(`${BASE}/projetos`, { waitUntil: "networkidle" });
  await page.getByText("Você ainda não salvou nenhum projeto").waitFor({ timeout: 15_000 });
  await page.screenshot({ path: `${SAIDA}/01-lista-vazia-${sufixo}.png`, fullPage: false });
  console.log(`✓ ${sufixo} lista vazia`);

  /* 2. Lista com itens -------------------------------------------- */
  const criados = await criarProjetos(ctx, 3);
  await page.reload({ waitUntil: "networkidle" });
  await listaTem(page, 3);
  for (const projeto of criados) {
    await page.getByRole("heading", { name: projeto.nome, exact: true }).waitFor();
  }
  await page.screenshot({ path: `${SAIDA}/02-lista-${sufixo}.png`, fullPage: false });
  console.log(`✓ ${sufixo} lista com 3 projetos`);

  /* 3. Renomear --------------------------------------------------- */
  const alvo = criados[0];
  const linha = page.locator("article", { hasText: alvo.nome });
  await linha.getByRole("button", { name: "Renomear" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.waitFor();
  const campo = dialogo.getByLabel("Nome do projeto");
  await campo.fill("Carrossel de novembro — versão final");
  await page.screenshot({ path: `${SAIDA}/03-renomear-${sufixo}.png`, fullPage: false });
  await dialogo.getByRole("button", { name: "Salvar nome" }).click();
  await page.getByRole("heading", { name: "Carrossel de novembro — versão final" }).waitFor();
  const persistido = await ctx.request.get(`${BASE}/api/projetos/${alvo.id}`);
  const corpo = await persistido.json();
  if (corpo.projeto?.nome !== "Carrossel de novembro — versão final") {
    throw new Error(`renomear não persistiu: ${corpo.projeto?.nome}`);
  }
  console.log(`✓ ${sufixo} renomear (persistido no servidor)`);

  /* 4. Apagar com confirmação ------------------------------------- */
  const descartavel = criados[2];
  await page.locator("article", { hasText: descartavel.nome }).getByRole("button", { name: "Apagar" }).click();
  await dialogo.waitFor();
  await dialogo.getByText("Não tem como desfazer").waitFor();
  await page.screenshot({ path: `${SAIDA}/04-apagar-${sufixo}.png`, fullPage: false });

  // Primeiro "Manter projeto": nada pode ser apagado.
  await dialogo.getByRole("button", { name: "Manter projeto" }).click();
  await listaTem(page, 3);

  // Agora sim: apagar de verdade.
  await page.locator("article", { hasText: descartavel.nome }).getByRole("button", { name: "Apagar" }).click();
  await dialogo.waitFor();
  await dialogo.getByRole("button", { name: "Apagar projeto" }).click();
  await listaTem(page, 2);
  const depois = await ctx.request.get(`${BASE}/api/projetos/${descartavel.id}`);
  if (depois.status() !== 404) throw new Error(`apagar não removeu: HTTP ${depois.status()}`);
  console.log(`✓ ${sufixo} apagar (cancelar mantém, confirmar remove)`);

  /* 5. Abrir no estúdio + salvar com hora na tela ------------------ */
  await page.locator("article", { hasText: "Carrossel de novembro — versão final" })
    .getByRole("button", { name: "Abrir" })
    .click();
  await page.getByRole("heading", { name: "Seu carrossel está pronto" }).waitFor({ timeout: 20_000 });
  const status = page.getByRole("status").filter({ hasText: /Salvo/ });
  await status.waitFor({ timeout: 15_000 });
  await page.screenshot({ path: `${SAIDA}/05-estudio-aberto-${sufixo}.png`, fullPage: false });
  console.log(`✓ ${sufixo} abrir no estúdio (status: ${(await status.innerText()).trim()})`);

  // Editar um card suja o projeto: a tela precisa dizer isso.
  await page.getByRole("button", { name: "Editar" }).first().click();
  const titulo = page.locator("section textarea").first();
  await titulo.fill("5 ERROS QUE MATAM SEU CARROSSEL (editado)");
  await page.getByRole("status").filter({ hasText: "Alterações não salvas" }).waitFor();
  await page.screenshot({ path: `${SAIDA}/06-nao-salvo-${sufixo}.png`, fullPage: false });
  console.log(`✓ ${sufixo} edição marca "alterações não salvas"`);

  // Salvar explícito: a hora aparece e a alteração vai para o servidor.
  await page.getByRole("button", { name: /Salvar alterações/ }).click();
  const salvo = page.getByRole("status").filter({ hasText: /Salvo às \d\d:\d\d/ });
  await salvo.waitFor({ timeout: 20_000 });
  await page.screenshot({ path: `${SAIDA}/07-salvo-${sufixo}.png`, fullPage: false });
  const textoSalvo = (await salvo.innerText()).trim();

  const conferido = await (await ctx.request.get(`${BASE}/api/projetos/${alvo.id}`)).json();
  if (conferido.projeto?.slides?.[0]?.titulo !== "5 ERROS QUE MATAM SEU CARROSSEL (editado)") {
    throw new Error("o card editado não foi salvo no servidor");
  }
  console.log(`✓ ${sufixo} salvar explícito ("${textoSalvo}") e persistido`);

  const erroReal = erros.filter((e) => !/favicon|ResizeObserver|401/.test(e));
  if (erroReal.length) console.warn(`⚠ ${sufixo} erros de console:`, erroReal.slice(0, 5));

  await ctx.close();
  return criados.length;
}

const browser = await chromium.launch();
try {
  const t1440 = await cenario(1440, 900, browser);
  const t390 = await cenario(390, 844, browser);
  console.log(`\nPronto: ${t1440} e ${t390} projetos por cenário; capturas em ${SAIDA}/`);
} finally {
  await browser.close();
}
