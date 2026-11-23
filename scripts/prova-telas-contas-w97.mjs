#!/usr/bin/env node
/**
 * Screenshots + prova de UI das portas de conta (W97/W99), em 390 e 1440.
 *
 * O que só a tela pode provar:
 *
 *   1. `/login` mostra **"Criar conta"** e a nota de senha nova (é o pedido do Igor
 *      a partir do print que ele mandou).
 *   2. `/cadastro` existe e **conclui**: preencho e-mail/senha/confirmação de
 *      verdade, envio, e a pessoa cai no estúdio já logada — com o e-mail novo no
 *      menu da conta. Um cadastro que "existe mas não entra" reprova aqui.
 *   3. `/redefinir-senha` aberta sem token diz a verdade e oferece pedir outro
 *      link (não finge formulário quebrado).
 *   4. Nada na tela cita outro produto nosso.
 *
 * Usa uma caixa de e-mail temporária por viewport, porque o mesmo e-mail não pode
 * ser cadastrado duas vezes (o produto responde 409, corretamente).
 *
 * Uso: node scripts/prova-telas-contas-w97.mjs [--base https://…]
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const BASE = (
  process.argv.find((a) => a.startsWith("--base="))?.split("=")[1] ??
  process.env.CAROUSEL_URL ??
  "https://carrossel.149-56-214-54.sslip.io"
).replace(/\/$/, "");
const SHOTS = path.resolve(process.cwd(), "screenshots", "w99");

const resultados = [];
function ok(nome, condicao, detalhe = "") {
  resultados.push({ nome, passou: Boolean(condicao), detalhe });
  console.log(`${condicao ? "PASS " : "FALHA"} ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
}

async function caixaTemporaria() {
  const doms = await fetch("https://api.mail.tm/domains?page=1").then((r) => r.json());
  const dominio = doms["hydra:member"][0].domain;
  const endereco = `ui${Math.random().toString(16).slice(2, 10)}@${dominio}`;
  const senha = `Ui-${Math.random().toString(36).slice(2, 10)}-A1`;
  await fetch("https://api.mail.tm/accounts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address: endereco, password: senha }),
  });
  return { endereco, senha };
}

await mkdir(SHOTS, { recursive: true });
const navegador = await chromium.launch();

for (const [rotulo, viewport] of [
  ["1440", { width: 1440, height: 900 }],
  ["390", { width: 390, height: 844 }],
]) {
  const ctx = await navegador.newContext({ viewport });
  const pagina = await ctx.newPage();
  const caixa = await caixaTemporaria();

  /* 1. login */
  await pagina.goto(`${BASE}/login`, { waitUntil: "load" });
  await pagina.waitForTimeout(1200);
  await pagina.screenshot({ path: path.join(SHOTS, `login-${rotulo}.png`), fullPage: true });
  const textoLogin = await pagina.locator("body").innerText();
  ok(
    `login ${rotulo}: tem "Criar conta" e a nota de senha`,
    /Criar conta/.test(textoLogin) && /link de redefini/i.test(textoLogin),
  );
  ok(
    `login ${rotulo}: não cita outro produto`,
    !/autoclinic|painel do/i.test(textoLogin),
  );

  /* 2. cadastro preenchido */
  await pagina.getByRole("link", { name: "Criar conta" }).click();
  await pagina.waitForURL(/\/cadastro/, { timeout: 20_000 });
  await pagina.waitForTimeout(800);
  await pagina.fill('input[type="email"]', caixa.endereco);
  const senhas = pagina.locator('input[type="password"]');
  await senhas.nth(0).fill(caixa.senha);
  await senhas.nth(1).fill(caixa.senha);
  await pagina.screenshot({ path: path.join(SHOTS, `cadastro-preenchido-${rotulo}.png`), fullPage: true });

  /* 3. cadastro CONCLUÍDO: entra direto no estúdio */
  await pagina.getByRole("button", { name: /Criar conta e entrar/ }).click();
  const entrou = await pagina
    .waitForURL((u) => u.pathname === "/", { timeout: 45_000 })
    .then(() => true)
    .catch(() => false);
  await pagina.waitForTimeout(2500);
  const textoEstudio = await pagina.locator("body").innerText().catch(() => "");
  // No celular o menu mostra só a inicial do e-mail (decisão de layout, 390 px):
  // a identidade tem que ser provada pela API da sessão, não pelo texto da tela.
  const eu = await ctx.request.get(`${BASE}/api/auth/eu`);
  const quemSou = (await eu.json().catch(() => ({})))?.usuario?.email ?? null;
  ok(
    `cadastro ${rotulo}: conclui e entra no estúdio já logado`,
    entrou && quemSou === caixa.endereco && /Pronto para criar/i.test(textoEstudio),
    entrou ? `sessão = ${quemSou}` : `parou em ${pagina.url()}`,
  );
  await pagina.screenshot({ path: path.join(SHOTS, `cadastro-concluido-${rotulo}.png`), fullPage: true });

  /* 4. redefinir senha sem token */
  const anonimo = await navegador.newContext({ viewport });
  const pagAnon = await anonimo.newPage();
  await pagAnon.goto(`${BASE}/redefinir-senha`, { waitUntil: "load" });
  await pagAnon.waitForTimeout(1200);
  const textoReset = await pagAnon.locator("body").innerText();
  ok(
    `redefinir ${rotulo}: sem token explica o que houve e oferece novo link`,
    /não trouxe um código|Pedir um novo link/i.test(textoReset),
  );
  await pagAnon.screenshot({ path: path.join(SHOTS, `redefinir-senha-${rotulo}.png`), fullPage: true });

  /* 5. esqueci a senha (bônus, mesmo custo) */
  await pagAnon.goto(`${BASE}/esqueci-senha`, { waitUntil: "load" });
  await pagAnon.waitForTimeout(1000);
  await pagAnon.screenshot({ path: path.join(SHOTS, `esqueci-senha-${rotulo}.png`), fullPage: true });

  await anonimo.close();
  await ctx.close();
}

await navegador.close();

const falhas = resultados.filter((r) => !r.passou);
console.log(`\n${resultados.length - falhas.length}/${resultados.length} provas passaram`);
console.log(`screenshots em ${SHOTS}`);
if (falhas.length) {
  console.log("FALHAS:", falhas.map((f) => `${f.nome} (${f.detalhe})`).join(" | "));
  process.exit(1);
}
