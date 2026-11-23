#!/usr/bin/env node
/**
 * Prova das portas de conta do carrossel (W97): cadastro, esqueci a senha e
 * redefinição por e-mail — o ciclo inteiro, com HTTP status de cada passo.
 *
 * Por que este script existe: "tem tela de recuperação" não é prova de nada. O
 * que precisa ser verdade é:
 *
 *   1. cadastro self-serve cria conta no Supabase do carrossel e devolve sessão
 *      (`autoconfirm` ligado) — 201 + access_token;
 *   2. com esse token, `/api/auth/eu` responde o e-mail criado;
 *   3. pedir o link devolve 200 e **o e-mail chega de verdade** numa caixa real
 *      (mail.tm, temporária) — sem isso, a recuperação é promessa;
 *   4. o link do e-mail abre `/redefinir-senha` e grava a senha nova;
 *   5. a senha NOVA entra e a senha ANTIGA não entra mais (401).
 *
 * Se o e-mail não chegar em `ESPERA_EMAIL` segundos, o script falha dizendo que
 * ficou pendente de SMTP — não "passa" por omissão.
 *
 * Uso: node scripts/prova-contas-w97.mjs [--base https://…]
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const BASE = (
  process.argv.find((a) => a.startsWith("--base="))?.split("=")[1] ??
  process.env.CAROUSEL_URL ??
  "https://carrossel.149-56-214-54.sslip.io"
).replace(/\/$/, "");
const CREDS = process.env.CARROSSEL_CREDS ?? "/root/.ctxswap/contexts/carrossel/creds.json";
const SHOTS = path.resolve(process.cwd(), "screenshots", "w97");
const ESPERA_EMAIL = Number(process.env.ESPERA_EMAIL ?? 180);

const resultados = [];
function ok(nome, condicao, detalhe = "") {
  resultados.push({ nome, passou: Boolean(condicao), detalhe });
  console.log(`${condicao ? "PASS " : "FALHA"} ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
}

/* ---------------------------------------------------------------- mail.tm */
const MAILBOX_API = "https://api.mail.tm";

async function caixaTemporaria() {
  // Caixa NOVA a cada execução: a mesma já foi usada em run anterior e o cadastro
  // responderia 409 (que é o comportamento certo do produto, mas invalida a prova).
  const doms = await fetch(`${MAILBOX_API}/domains?page=1`).then((r) => r.json());
  const dominio = doms["hydra:member"][0].domain;
  const endereco = `carrossel${Math.random().toString(16).slice(2, 12)}@${dominio}`;
  const senha = `Prova-${Math.random().toString(36).slice(2, 12)}-A1`;
  const conta = await fetch(`${MAILBOX_API}/accounts`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address: endereco, password: senha }),
  }).then((r) => r.json());
  const token = await fetch(`${MAILBOX_API}/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address: conta.address, password: senha }),
  }).then((r) => r.json());
  return { endereco: conta.address, token: token.token };
}

async function esperarEmail(token, desdeMs) {
  const limite = Date.now() + ESPERA_EMAIL * 1000;
  while (Date.now() < limite) {
    const lista = await fetch(`${MAILBOX_API}/messages?page=1`, {
      headers: { authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    for (const msg of lista?.["hydra:member"] ?? []) {
      if (new Date(msg.createdAt).getTime() + 5000 < desdeMs) continue;
      const detalhe = await fetch(`${MAILBOX_API}/messages/${msg.id}`, {
        headers: { authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      if (!detalhe) continue;
      const corpo = [
        ...(detalhe.html ?? []),
        detalhe.text ?? "",
      ].join("\n");
      const link = /https:\/\/[^"'\s<>]+(?:auth\/v1\/verify|\/redefinir-senha)[^"'\s<>]*/.exec(corpo);
      if (link) return { assunto: msg.subject, link: link[0].replace(/&amp;/g, "&") };
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  return null;
}

/* ---------------------------------------------------------------- fluxo */
const caixa = await caixaTemporaria();
console.log(`caixa de teste: ${caixa.endereco}`);
const senhaInicial = `Inicial-${Math.random().toString(36).slice(2, 10)}-A1`;
const senhaNova = `Trocada-${Math.random().toString(36).slice(2, 10)}-B2`;

/* 1. cadastro */
const rCadastro = await fetch(`${BASE}/api/auth/cadastro`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: caixa.endereco, senha: senhaInicial }),
});
const dCadastro = await rCadastro.json().catch(() => ({}));
ok(
  "POST /api/auth/cadastro cria conta e já devolve sessão",
  rCadastro.status === 201 && Boolean(dCadastro.access_token),
  `HTTP ${rCadastro.status}${dCadastro.precisa_confirmar ? " (precisa confirmar e-mail)" : ""}`,
);

if (dCadastro.access_token) {
  const rEu = await fetch(`${BASE}/api/auth/eu`, {
    headers: { authorization: `Bearer ${dCadastro.access_token}` },
  });
  const dEu = await rEu.json().catch(() => ({}));
  ok(
    "a conta criada é reconhecida por /api/auth/eu",
    rEu.ok && dEu?.usuario?.email === caixa.endereco,
    `HTTP ${rEu.status} · ${dEu?.usuario?.email ?? "sem e-mail"}`,
  );
}

/* 2. cadastro repetido: 409, não 500 */
const rRepetido = await fetch(`${BASE}/api/auth/cadastro`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: caixa.endereco, senha: senhaInicial }),
});
ok("cadastro com e-mail repetido → 409 explicado", rRepetido.status === 409, `HTTP ${rRepetido.status}`);

/* 3. pedir o link */
const desde = Date.now();
const rRecuperar = await fetch(`${BASE}/api/auth/recuperar`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: caixa.endereco }),
});
const dRecuperar = await rRecuperar.json().catch(() => ({}));
ok(
  "POST /api/auth/recuperar aceita o pedido",
  rRecuperar.ok,
  `HTTP ${rRecuperar.status} · ${dRecuperar.aviso ?? dRecuperar.erro ?? ""}`,
);

/* 4. o e-mail chegou? */
console.log(`esperando o e-mail por até ${ESPERA_EMAIL}s…`);
const email = await esperarEmail(caixa.token, desde);
ok(
  "o e-mail de redefinição CHEGOU na caixa",
  Boolean(email),
  email ? `assunto: "${email.assunto}"` : `nada em ${ESPERA_EMAIL}s — pendente de SMTP`,
);

let senhaTrocada = false;
if (email) {
  /* 5. abrir o link e gravar a senha nova pela tela */
  const navegador = await chromium.launch();
  const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
  const pagina = await contexto.newPage();
  let statusRedefinir = null;
  pagina.on("response", (r) => {
    if (r.url().includes("/api/auth/redefinir")) statusRedefinir = r.status();
  });

  await pagina.goto(email.link, { waitUntil: "load", timeout: 60_000 });
  await pagina.waitForTimeout(2500);
  ok(
    "o link do e-mail abre a tela de senha nova",
    pagina.url().includes("/redefinir-senha"),
    pagina.url().replace(BASE, "").slice(0, 60),
  );

  const campo = pagina.locator('input[type="password"]').first();
  if (await campo.count()) {
    try {
      await campo.fill(senhaNova);
      const segundo = pagina.locator('input[type="password"]').nth(1);
      if (await segundo.count()) await segundo.fill(senhaNova);
      await pagina.getByRole("button", { name: /Salvar senha/ }).click();
      await pagina.waitForTimeout(5000);
    } catch (e) {
      console.log(`(falha ao preencher a tela: ${e.message.split("\n")[0]})`);
    }
    ok("a tela de redefinição gravou a senha", statusRedefinir === 200, `HTTP ${statusRedefinir}`);
    senhaTrocada = statusRedefinir === 200;
    await pagina.screenshot({ path: path.join(SHOTS, "8-redefinir-1440.png") });
  }
  await navegador.close();
}

/* 6. a senha nova entra, a antiga não */
const rNova = await fetch(`${BASE}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: caixa.endereco, senha: senhaNova }),
});
ok(
  "login com a senha NOVA entra",
  rNova.status === 200,
  `HTTP ${rNova.status}`,
);

const rAntiga = await fetch(`${BASE}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: caixa.endereco, senha: senhaInicial }),
});
ok(
  "login com a senha ANTIGA é recusado",
  rAntiga.status === 401 || !senhaTrocada,
  `HTTP ${rAntiga.status}${senhaTrocada ? "" : " (sem troca, teste inconclusivo)"}`,
);

/* 7. screenshots das três telas de conta (390 e 1440) */
const navegador = await chromium.launch();
for (const [rotulo, viewport] of [
  ["1440", { width: 1440, height: 900 }],
  ["390", { width: 390, height: 844 }],
]) {
  const ctx = await navegador.newContext({ viewport });
  const pag = await ctx.newPage();
  for (const [nome, caminho] of [
    ["6-login", "/login"],
    ["6-cadastro", "/cadastro"],
    ["6-esqueci-senha", "/esqueci-senha"],
  ]) {
    await pag.goto(`${BASE}${caminho}`, { waitUntil: "load" });
    await pag.waitForTimeout(1200);
    await pag.screenshot({ path: path.join(SHOTS, `${nome}-${rotulo}.png`), fullPage: true });
  }
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
