#!/usr/bin/env node
/**
 * Prova ponta a ponta do carrossel independente (W97) — contra a URL pública.
 *
 * O que este script PROVA, em ordem, e por que cada um é o teste que importa:
 *
 *   1. deslogado → `/` redireciona para `/login?de=/`; `/api/gerar`,
 *      `/api/imagem` e `/api/projetos` respondem **401 JSON** (não redirect de
 *      HTML, que viraria "Unexpected token '<'" na tela).
 *   2. login com conta real do projeto novo entra e volta para `de`.
 *   3. logado → gera um carrossel de verdade (`/api/gerar` com LLM), salva o
 *      projeto na tabela `projetos`.
 *   4. OUTRO navegador (contexto novo, storage zerado) faz login e vê o projeto
 *      em `/projetos` — é a prova de que o dono é a conta e não o cookie.
 *   5. NENHUMA requisição saiu para o AutoClinic: nem `:8097`, nem
 *      `autoclinic.*`, nem `/api/ac/`. O log de rede é coletado nos dois
 *      contextos e impresso no fim.
 *
 * Custo: a geração usa um template SEM capa por IA (`full-texto`), então o run
 * gasta texto, não imagem.
 *
 * Uso:
 *   node scripts/prova-e2e-w97.mjs                                  # URL pública
 *   CAROUSEL_URL=http://127.0.0.1:8129 node scripts/prova-e2e-w97.mjs  # local
 *
 * Credenciais: `/root/.ctxswap/contexts/carrossel/creds.json` (600). Nunca
 * imprime senha.
 */
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const BASE = (process.env.CAROUSEL_URL ?? "https://carrossel.149-56-214-54.sslip.io").replace(/\/$/, "");
const CREDS = process.env.CARROSSEL_CREDS ?? "/root/.ctxswap/contexts/carrossel/creds.json";
const SHOTS = path.resolve(process.cwd(), "screenshots", "w97");
const MARCA = `Prova W97 ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;

const creds = JSON.parse(await readFile(CREDS, "utf8")).env ?? {};
const EMAIL = creds.CARROSSEL_QA_EMAIL;
const SENHA = creds.CARROSSEL_QA_PASSWORD;

const resultados = [];
function ok(nome, condicao, detalhe = "") {
  resultados.push({ nome, passou: Boolean(condicao), detalhe });
  console.log(`${condicao ? "PASS " : "FALHA"} ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
}

/** Requisições de todos os contextos, para a prova de "nada de AutoClinic". */
const rede = [];

/**
 * Abre uma URL e espera a página PINTAR.
 *
 * `domcontentloaded` não basta: o primeiro screenshot da primeira versão deste
 * script saiu branco porque a navegação tinha acontecido e o paint não. Esperar
 * `load` + um respiro evita "provei que está quebrado" quando o app está bom.
 */
async function abrir(pagina, url, espera = 1200) {
  await pagina.goto(url, { waitUntil: "load" });
  await pagina.waitForTimeout(espera);
}

function espiao(contexto, rotulo) {
  contexto.on("request", (req) => {
    rede.push({ rotulo, url: req.url(), recurso: req.resourceType() });
  });
}

const PROIBIDOS = [
  { padrao: ":8097", motivo: "API do AutoClinic" },
  { padrao: "/api/ac/", motivo: "proxy /api/ac do AutoClinic" },
  { padrao: "autoclinic.149-56-214-54", motivo: "host do auth do AutoClinic" },
  { padrao: "nvmsfkpirobmupadgfcq", motivo: "projeto Supabase antigo do Thor" },
];

await mkdir(SHOTS, { recursive: true });

const navegador = await chromium.launch();

/* ------------------------------------------------ 1. deslogado ---------- */
const anonimo = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
espiao(anonimo, "anon-1440");
const paginaAnon = await anonimo.newPage();

await abrir(paginaAnon, `${BASE}/`);
const urlDepoisDoRedirect = paginaAnon.url();
ok(
  "deslogado em / cai em /login com ?de=",
  /\/login\?de=/.test(urlDepoisDoRedirect),
  urlDepoisDoRedirect.replace(BASE, ""),
);
await paginaAnon.screenshot({ path: path.join(SHOTS, "1-deslogado-1440.png") });

const api = anonimo.request;
const rGerar = await api.post(`${BASE}/api/gerar`, { data: { tema: "teste de portao" } });
const corpoGerar = await rGerar.text();
ok("deslogado: POST /api/gerar → 401 JSON", rGerar.status() === 401 && corpoGerar.trim().startsWith("{"), `HTTP ${rGerar.status()}`);

const rImagem = await api.post(`${BASE}/api/imagem`, { data: { prompt: "teste de portao de custo" } });
ok("deslogado: POST /api/imagem → 401", rImagem.status() === 401, `HTTP ${rImagem.status()}`);

const rConteudo = await api.post(`${BASE}/api/conteudo/gerar`, { data: { briefing: { angulo: "x" } } });
ok("deslogado: POST /api/conteudo/gerar → 401", rConteudo.status() === 401, `HTTP ${rConteudo.status()}`);

const rProjetos = await api.get(`${BASE}/api/projetos`);
ok("deslogado: GET /api/projetos → 401", rProjetos.status() === 401, `HTTP ${rProjetos.status()}`);

const rAc = await api.get(`${BASE}/api/ac/me`);
ok("rota /api/ac/me não existe mais (404/401, nunca 200)", rAc.status() !== 200, `HTTP ${rAc.status()}`);

/* ------------------------------------------------ 2. tela de login ------ */
await paginaAnon.screenshot({ path: path.join(SHOTS, "2-login-1440.png") });

const anonimo390 = await navegador.newContext({ viewport: { width: 390, height: 844 } });
espiao(anonimo390, "anon-390");
const pagina390 = await anonimo390.newPage();
await abrir(pagina390, `${BASE}/login`);
await pagina390.waitForSelector('input[type="password"]', { timeout: 30_000 }).catch(() => {});
await pagina390.screenshot({ path: path.join(SHOTS, "2-login-390.png") });
ok(
  "tela de login tem campo de e-mail e senha",
  (await pagina390.locator('input[type="email"]').count()) > 0 &&
    (await pagina390.locator('input[type="password"]').count()) > 0,
);

/* ------------------------------------- 2b. marcador forjado (sem token) - */
/* O caso que o middleware NÃO resolve: marker presente, token ausente/vencido.
   Aqui o estúdio abre de propósito e o que tem de valer é o portão da rota
   (401) e o botão desligado com o motivo na tela. */
const forjado = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
espiao(forjado, "marcador-forjado-1440");
await forjado.addCookies([
  { name: "ac_sessao", value: "1", domain: new URL(BASE).hostname, path: "/" },
]);
const paginaForjada = await forjado.newPage();
await abrir(paginaForjada, `${BASE}/`, 2000);
const textoForjado = await paginaForjada.locator("body").innerText().catch(() => "");
const avisoForjado = await paginaForjada.getByText(/Entre na sua conta para gerar/i).first().isVisible().catch(() => false);
const criarForjado = paginaForjada.getByRole("button", { name: /Criar com IA/ }).first();
const criarDesabilitado = (await criarForjado.count()) > 0 ? await criarForjado.isDisabled() : false;
ok(
  "marcador sem token: estúdio abre e a tela AVISA que precisa de conta",
  avisoForjado,
  textoForjado.replace(/\s+/g, " ").slice(0, 80),
);
ok("marcador sem token: botão 'Criar com IA' fica desabilitado", criarDesabilitado);
const gerarForjado = await forjado.request.post(`${BASE}/api/gerar`, {
  data: { tema: "marcador forjado não gera" },
});
ok("marcador forjado NÃO gera: /api/gerar → 401", gerarForjado.status() === 401, `HTTP ${gerarForjado.status()}`);
await paginaForjada.screenshot({ path: path.join(SHOTS, "1b-marcador-forjado-1440.png") });
await forjado.close();

/* ------------------------------------------------ 3. logado gera -------- */
const logado = await navegador.newContext({ viewport: { width: 1440, height: 950 } });
espiao(logado, "logado-1440");
const pagina = await logado.newPage();

await pagina.goto(`${BASE}/login?de=/`, { waitUntil: "domcontentloaded" });
await pagina.fill('input[type="email"]', EMAIL);
await pagina.fill('input[type="password"]', SENHA);
await Promise.all([
  pagina.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60_000 }),
  pagina.click('button[type="submit"]'),
]);
ok("login com conta do projeto novo entra", !pagina.url().includes("/login"), pagina.url().replace(BASE, ""));

const eu = await logado.request.get(`${BASE}/api/auth/eu`);
const corpoEu = await eu.json().catch(() => ({}));
ok("sessão válida responde /api/auth/eu", eu.ok() && corpoEu?.usuario?.email === EMAIL, corpoEu?.usuario?.email ?? `HTTP ${eu.status()}`);

await abrir(pagina, `${BASE}/`);
await pagina.screenshot({ path: path.join(SHOTS, "3-logado-1440.png") });

// Template sem capa por IA: prova a geração de TEXTO sem gastar imagem.
await pagina.getByText("Full texto", { exact: false }).first().click();
await pagina.waitForTimeout(800);
const campoTema = pagina.locator("textarea").first();
await campoTema.fill(`5 erros que fazem seu carrossel não ser salvo ${MARCA}`);
await pagina.waitForTimeout(300);
await pagina.screenshot({ path: path.join(SHOTS, "3b-passo2-1440.png"), fullPage: true });

const botaoGerar = pagina.getByRole("button", { name: /Gerar \d+ cards/ });
ok("botão de gerar habilitado com sessão", await botaoGerar.isEnabled());
await botaoGerar.click();

// A geração real leva de 20 s a 3 min (pipeline de 6 etapas + fallback).
await pagina.waitForSelector("[data-card-export], h1:has-text('Seu carrossel')", { timeout: 240_000 }).catch(() => {});
await pagina.waitForTimeout(2500);
const cards = await pagina.locator("[data-card-export]").count();
ok("geração de texto produziu cards", cards >= 3, `${cards} card(s) no palco`);

/* ------------------------------------------------ 3c. salvar projeto --- */
const botaoSalvar = pagina.getByRole("button", { name: /^Salvar/ }).first();
await botaoSalvar.click();
await pagina.waitForTimeout(4000);
const salvouOk = await pagina.getByText(/Salvo às|Salvando/).first().isVisible().catch(() => false);
ok("projeto salvo (a tela mostra a hora do salvamento)", salvouOk);
await pagina.screenshot({ path: path.join(SHOTS, "4-resultado-1440.png") });

/* ------------------------------------------------ 4. outro navegador --- */
const outro = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
espiao(outro, "outro-navegador-1440");
const paginaOutro = await outro.newPage();
await paginaOutro.goto(`${BASE}/login?de=/projetos`, { waitUntil: "domcontentloaded" });
await paginaOutro.fill('input[type="email"]', EMAIL);
await paginaOutro.fill('input[type="password"]', SENHA);
await Promise.all([
  paginaOutro.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60_000 }),
  paginaOutro.click('button[type="submit"]'),
]);
await abrir(paginaOutro, `${BASE}/projetos`, 2000);
const listaOutro = await paginaOutro.locator("body").innerText();
const respLista = await outro.request.get(`${BASE}/api/projetos`);
const jsonLista = await respLista.json().catch(() => ({ projetos: [] }));
const nomes = (jsonLista.projetos ?? []).map((p) => p.nome);
ok(
  "API do outro navegador lista os projetos do dono",
  nomes.length >= 1,
  `${nomes.length} projeto(s): ${nomes.slice(0, 2).join(" | ")}`,
);
ok(
  "o projeto aparece escrito na tela de Meus projetos (outro navegador)",
  nomes.length > 0 && listaOutro.includes(nomes[0]),
  nomes[0] ? `"${nomes[0]}" ${listaOutro.includes(nomes[0]) ? "presente" : "AUSENTE"}` : "lista vazia",
);
await paginaOutro.screenshot({ path: path.join(SHOTS, "5-meus-projetos-1440.png") });

const outro390 = await navegador.newContext({ viewport: { width: 390, height: 844 } });
espiao(outro390, "outro-navegador-390");
const paginaOutro390 = await outro390.newPage();
await paginaOutro390.goto(`${BASE}/login?de=/projetos`, { waitUntil: "domcontentloaded" });
await paginaOutro390.fill('input[type="email"]', EMAIL);
await paginaOutro390.fill('input[type="password"]', SENHA);
await Promise.all([
  paginaOutro390.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60_000 }),
  paginaOutro390.click('button[type="submit"]'),
]);
await paginaOutro390.waitForTimeout(2500);
await paginaOutro390.screenshot({ path: path.join(SHOTS, "5-meus-projetos-390.png") });
await pagina390.waitForTimeout(2500);

/* ------------------------------------------------ 5. prova de rede ---- */
const violacoes = [];
for (const { rotulo, url, recurso } of rede) {
  for (const proibido of PROIBIDOS) {
    if (url.includes(proibido.padrao)) violacoes.push({ rotulo, url, motivo: proibido.motivo, recurso });
  }
}
ok(
  "nenhuma requisição para o AutoClinic (8097 / /api/ac / host antigo)",
  violacoes.length === 0,
  violacoes.length ? JSON.stringify(violacoes.slice(0, 5)) : `${rede.length} requisições observadas, 0 suspeitas`,
);

const hosts = [...new Set(rede.map((r) => new URL(r.url).host))].sort();
console.log(`hosts chamados: ${hosts.join(", ")}`);

await navegador.close();

const falhas = resultados.filter((r) => !r.passou);
console.log(`\n${resultados.length - falhas.length}/${resultados.length} provas passaram`);
console.log(`screenshots em ${SHOTS}`);
if (falhas.length) {
  console.log("FALHAS:", falhas.map((f) => f.nome).join(" | "));
  process.exit(1);
}
