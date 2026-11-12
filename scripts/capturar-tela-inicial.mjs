/**
 * Captura das telas da fase 1 com DADOS REAIS da API do AutoClinic.
 *
 * Por que existe: os testes de UI mockam a API (o ambiente de teste não tem
 * banco), e um screenshot de mock não prova que a tela conversa com o servidor
 * de verdade. Este script sobe o navegador contra o app já construído, injeta
 * uma sessão válida e tira as capturas com o que a API de produção devolve.
 *
 * ⚠️ Só leitura. As rotas são interceptadas apenas no `/api/auth/refresh` (o
 * token), e o resto vai direto para a API. Nenhum POST é disparado.
 *
 * Como a sessão é montada sem senha: o token é assinado com o mesmo segredo que
 * a API valida (`SUPABASE_JWT_SECRET`), do mesmo jeito que
 * `scripts/qa-carrossel-api.mjs` do repositório do AutoClinic faz. Sem senha
 * digitada, sem senha em arquivo.
 *
 * Uso:
 *   node scripts/capturar-tela-inicial.mjs [--url http://127.0.0.1:8100]
 *                                          [--saida docs/design/shots/fase-1]
 */
import { readFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";
import path from "node:path";
import { chromium } from "@playwright/test";

const argumento = (nome, padrao) => {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : padrao;
};

const URL_APP = argumento("url", "http://127.0.0.1:8100");
const SAIDA = argumento("saida", "docs/design/shots/fase-1");
const EMAIL = argumento("email", "igorgomes@mail.com");

const envApi = readFileSync("/etc/default/autoclinic-api", "utf8");
const dbUrl = /^AUTOCLINIC_DATABASE_URL=(.+)$/m.exec(envApi)[1].trim();
const segredo = /^SUPABASE_JWT_SECRET=(.+)$/m.exec(envApi)[1].trim();

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");

function jwt(authUserId, email) {
  const cabecalho = b64({ alg: "HS256", typ: "JWT" });
  const agora = Math.floor(Date.now() / 1000);
  const corpo = b64({
    sub: authUserId,
    email,
    aud: "authenticated",
    role: "authenticated",
    iat: agora,
    exp: agora + 3600,
  });
  const assinatura = createHmac("sha256", segredo).update(`${cabecalho}.${corpo}`).digest("base64url");
  return `${cabecalho}.${corpo}.${assinatura}`;
}

/** `psql` em modo tupla: sem `pg` no projeto do app, e o psql já está no host. */
function sql(consulta) {
  const saida = execFileSync("psql", [dbUrl, "-tAF", "|", "-c", consulta], {
    encoding: "utf8",
  });
  return saida
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((linha) => linha.split("|"));
}

const usuario = sql(`select auth_user_id, email from app_usuarios where email = '${EMAIL}' and ativo`)[0];
if (!usuario) throw new Error(`usuário ${EMAIL} não encontrado em app_usuarios`);
const token = jwt(usuario[0], usuario[1]);

const contagens = sql("select estado, count(*)::int from carrosseis group by estado order by estado");
const prova = sql("select id, titulo, estado, slug from carrosseis order by atualizado_em desc limit 1");

console.log("SQL — carrosséis por estado:", contagens.map((r) => `${r[0]}=${r[1]}`).join(" "));
console.log("SQL — carrossel de prova:", prova[0]?.[0], prova[0]?.[2]);

mkdirSync(SAIDA, { recursive: true });

const navegador = await chromium.launch();
const contexto = await navegador.newContext({
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 2,
});

await contexto.route("**/api/auth/refresh", (rota) =>
  rota.fulfill({ json: { access_token: token, refresh_token: "irrelevante" } }),
);
await contexto.addCookies([
  {
    name: "ac_sessao",
    value: "1",
    domain: new URL(URL_APP).hostname,
    path: "/",
    expires: Math.floor(Date.now() / 1000) + 86400,
  },
]);
await contexto.addInitScript(() => {
  try {
    window.localStorage.setItem("ac_refresh", "irrelevante");
  } catch {
    /* origem opaca */
  }
});

const pagina = await contexto.newPage();

async function capturar(nome, url, largura, altura, espera = 1200) {
  await pagina.setViewportSize({ width: largura, height: altura });
  await pagina.goto(`${URL_APP}${url}`, { waitUntil: "domcontentloaded" });
  await pagina.waitForTimeout(espera);
  await pagina.evaluate(() => document.fonts.ready);
  const arquivo = path.join(SAIDA, `${nome}-${largura}.png`);
  await pagina.screenshot({ path: arquivo, fullPage: true });
  console.log("→", arquivo);
}

for (const largura of [1280, 390]) {
  const altura = largura === 1280 ? 900 : 844;
  await capturar("lista", "/", largura, altura);
  await capturar("carregando", "/?estado=carregando", largura, altura, 600);
  await capturar("erro", "/?estado=erro", largura, altura, 600);
  await capturar("vazio", "/?estado=vazio", largura, altura, 600);
  if (prova[0]) {
    await capturar(`ficha-${prova[0][3]}`, `/carrossel/${prova[0][0]}`, largura, altura);
  }
}

// Estado de busca sem resultado, com dados reais no servidor.
await pagina.setViewportSize({ width: 1280, height: 900 });
await pagina.goto(`${URL_APP}/?q=zzzz-nao-existe`, { waitUntil: "domcontentloaded" });
await pagina.waitForTimeout(1200);
await pagina.screenshot({ path: path.join(SAIDA, "busca-sem-resultado-1280.png"), fullPage: true });
console.log("→", path.join(SAIDA, "busca-sem-resultado-1280.png"));

await navegador.close();
