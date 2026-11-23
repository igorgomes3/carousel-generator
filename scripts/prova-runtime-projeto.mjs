#!/usr/bin/env node
/**
 * Prova de RUNTIME: em qual projeto Supabase o app está autenticando AGORA.
 *
 * Por que este script existe: ler `.env.local` prova o que está no arquivo, não o
 * que o processo em execução usa. A prova que fecha a pergunta é **criar uma
 * conta pela tela** e ir procurar essa conta nos dois projetos:
 *
 *   - cadastro pela UI (Playwright) no domínio público → sessão ativa;
 *   - `/api/auth/eu` diz o `id` do usuário que o app considera logado;
 *   - API de admin do projeto NOVO (`/auth/v1/admin/users`) → o usuário EXISTE, com
 *     o mesmo id;
 *   - API de admin do projeto ANTIGO → o usuário NÃO existe.
 *
 * Se o app estivesse falando com o projeto antigo, o segundo teste falharia e o
 * terceiro passaria. Não há como "parecer" certo: um dos dois lados tem a linha.
 *
 * Uso: node scripts/prova-runtime-projeto.mjs [--base https://…]
 */
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const BASE = (
  process.argv.find((a) => a.startsWith("--base="))?.split("=")[1] ??
  process.env.CAROUSEL_URL ??
  "https://carrossel.149-56-214-54.sslip.io"
).replace(/\/$/, "");
const CREDS = process.env.CARROSSEL_CREDS ?? "/root/.ctxswap/contexts/carrossel/creds.json";
const SHOTS = path.resolve(process.cwd(), "screenshots", "w99");

const creds = JSON.parse(await readFile(CREDS, "utf8")).env ?? {};
const PROJETOS = {
  novo: { rotulo: "carroseia-prod", url: creds.CARROSSEL_PROD_URL, chave: creds.CARROSSEL_PROD_SERVICE_ROLE_KEY },
  antigo: { rotulo: "carrossel-ia (rollback)", url: creds.CARROSSEL_SUPABASE_URL, chave: creds.CARROSSEL_SUPABASE_SERVICE_ROLE_KEY },
};

const resultados = [];
function ok(nome, condicao, detalhe = "") {
  resultados.push({ nome, passou: Boolean(condicao), detalhe });
  console.log(`${condicao ? "PASS " : "FALHA"} ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
}

/**
 * Procura o e-mail na API de admin do projeto. Devolve o id ou null.
 *
 * `/admin/users?filter=` não é suportado nesta versão do GoTrue (responde corpo
 * vazio), então pagino e filtro aqui — 200 usuários é teto suficiente para o
 * estado atual e o teste falha alto se o corpo vier vazio.
 */
async function existeNoProjeto(projeto, email) {
  const res = await fetch(`${projeto.url}/auth/v1/admin/users?page=1&per_page=200`, {
    headers: {
      apikey: projeto.chave,
      authorization: `Bearer ${projeto.chave}`,
    },
  });
  if (!res.ok) throw new Error(`admin ${projeto.rotulo}: HTTP ${res.status}`);
  const texto = await res.text();
  if (!texto.trim()) throw new Error(`admin ${projeto.rotulo}: corpo vazio (HTTP ${res.status})`);
  const dados = JSON.parse(texto);
  const usuarios = dados.users ?? [];
  const achado = usuarios.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
  return achado ? achado.id : null;
}

/**
 * E-mail de teste para o cadastro.
 *
 * Não usa caixa real de propósito: este teste precisa de um usuário NOVO, não da
 * mensagem (com `mailer_autoconfirm` ligado o GoTrue nem envia e-mail no signup).
 * Antes eu criava caixa no mail.tm e o script começou a morrer com corpo vazio —
 * throttle do serviço externo, não defeito do app. Domínio próprio de teste, sem
 * dependência de terceiro.
 */
function caixaTemporaria() {
  const hex = Math.random().toString(16).slice(2, 12);
  return { endereco: `rt${hex}@teste.carroseia.com`, senha: `Rt-${hex}-A1` };
}

await mkdir(SHOTS, { recursive: true });
const navegador = await chromium.launch();
const criados = [];

for (const [rotulo, viewport] of [
  ["1440", { width: 1440, height: 900 }],
  ["390", { width: 390, height: 844 }],
]) {
  const ctx = await navegador.newContext({ viewport });
  const pagina = await ctx.newPage();
  const caixa = caixaTemporaria();

  await pagina.goto(`${BASE}/cadastro`, { waitUntil: "load" });
  await pagina.waitForSelector('input[type="password"]', { timeout: 30_000 });
  await pagina.fill('input[type="email"]', caixa.endereco);
  const senhas = pagina.locator('input[type="password"]');
  await senhas.nth(0).fill(caixa.senha);
  await senhas.nth(1).fill(caixa.senha);
  await pagina.screenshot({ path: path.join(SHOTS, `runtime-cadastro-${rotulo}.png`), fullPage: true });

  await pagina.getByRole("button", { name: /Criar conta e entrar/ }).click();
  const entrou = await pagina
    .waitForURL((u) => u.pathname === "/", { timeout: 45_000 })
    .then(() => true)
    .catch(() => false);
  await pagina.waitForTimeout(2000);
  await pagina.screenshot({ path: path.join(SHOTS, `runtime-cadastro-concluido-${rotulo}.png`), fullPage: true });

  // Identidade segundo o PRÓPRIO app (sessão que ele emitiu).
  const eu = await ctx.request.get(`${BASE}/api/auth/eu`);
  const corpoEu = await eu.json().catch(() => ({}));
  const idApp = corpoEu?.usuario?.id ?? null;

  ok(
    `cadastro ${rotulo}: entrou no estúdio e o app emite sessão`,
    entrou && eu.ok() && Boolean(idApp),
    entrou ? `id do app = ${idApp}` : `parou em ${pagina.url()}`,
  );

  criados.push({ rotulo, email: caixa.endereco, idApp });
  await ctx.close();
}

// A pergunta que importa: em qual dos dois projetos essas contas existem?
for (const criado of criados) {
  const noNovo = await existeNoProjeto(PROJETOS.novo, criado.email);
  const noAntigo = await existeNoProjeto(PROJETOS.antigo, criado.email);
  ok(
    `[${criado.rotulo}] usuário existe em ${PROJETOS.novo.rotulo} (o app usa este)`,
    noNovo === criado.idApp,
    `id no projeto novo = ${noNovo} · id no app = ${criado.idApp}`,
  );
  ok(
    `[${criado.rotulo}] usuário NÃO existe em ${PROJETOS.antigo.rotulo}`,
    noAntigo === null,
    noAntigo ? `ACHOU id ${noAntigo} — o app estaria no projeto antigo` : "ausente, como esperado",
  );
}

await navegador.close();

/**
 * Item 3 do pedido: a migração está no DESTINO e as linhas abrem logadas com o
 * dono. Leio com o token do dono (RLS ligada), não com service_role — no projeto
 * novo `service_role` não tem GRANT, e o token do dono é o caminho real do app.
 */
for (const [nome, p] of Object.entries(PROJETOS)) {
  const login = await fetch(`${p.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: creds[nome === "novo" ? "CARROSSEL_PROD_ANON_KEY" : "CARROSSEL_SUPABASE_ANON_KEY"], "content-type": "application/json" },
    body: JSON.stringify({ email: creds.CARROSSEL_QA_EMAIL, password: creds.CARROSSEL_QA_PASSWORD }),
  });
  if (!login.ok) {
    ok(`login do dono em ${p.rotulo}`, false, `HTTP ${login.status}`);
    continue;
  }
  const { access_token: token } = await login.json();
  const res = await fetch(`${p.url}/rest/v1/projetos?select=id,nome&order=criado_em.asc`, {
    headers: {
      apikey: creds[nome === "novo" ? "CARROSSEL_PROD_ANON_KEY" : "CARROSSEL_SUPABASE_ANON_KEY"],
      authorization: `Bearer ${token}`,
    },
  });
  const linhas = await res.json().catch(() => null);
  const quantidade = Array.isArray(linhas) ? linhas.length : 0;
  ok(
    `o dono vê seus projetos em ${p.rotulo} (RLS, não service_role)`,
    res.ok && quantidade > 0,
    `HTTP ${res.status} · ${quantidade} projeto(s)`,
  );
  if (nome === "novo") {
    ok(
      "a migração está no DESTINO (6 projetos)",
      quantidade === 6,
      `${quantidade} linha(s): ${(linhas ?? []).map((l) => l.nome).slice(0, 2).join(" | ")}…`,
    );
    // Abrir cada um pelo id, como a tela faz.
    for (const linha of linhas ?? []) {
      const um = await fetch(`${p.url}/rest/v1/projetos?id=eq.${linha.id}&select=id,nome`, {
        headers: {
          apikey: creds.CARROSSEL_PROD_ANON_KEY,
          authorization: `Bearer ${token}`,
        },
      });
      const corpo = await um.json().catch(() => []);
      ok(`  abre ${linha.id} no destino`, um.status === 200 && corpo.length === 1, `HTTP ${um.status}`);
    }
  }
}

const falhas = resultados.filter((r) => !r.passou);
console.log(`\n${resultados.length - falhas.length}/${resultados.length} provas passaram`);
if (falhas.length) {
  console.log("FALHAS:", falhas.map((f) => `${f.nome} (${f.detalhe})`).join(" | "));
  process.exit(1);
}
