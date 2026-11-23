#!/usr/bin/env node
/**
 * Prova da RLS do projeto novo, com dois usuários de verdade.
 *
 * O que este script mede, e por que isso é a prova que importa:
 *
 *  - `qa.owner@autoclinic.com.br` (dono dos 2 projetos migrados) lê os 2.
 *  - `qa.intruso@autoclinic.com.br` (mesma org, mesmo projeto, conta comum)
 *    autentica com sucesso e lê **zero** — a RLS não deixa ver linha de outro
 *    `auth.uid()`. Também não consegue gravar linha com `auth_user_id` alheio
 *    (a política de INSERT tem `with check`).
 *
 * Sem isso, "tem RLS" seria só uma linha de SQL que ninguém executou. Roda
 * contra o Supabase real: `node scripts/prova-rls.mjs`.
 */
import { readFile } from "node:fs/promises";

const CREDS = process.env.CARROSSEL_CREDS ?? "/root/.ctxswap/contexts/carrossel/creds.json";

const creds = JSON.parse(await readFile(CREDS, "utf8"));
const env = creds.env ?? {};
const URL_BASE = env.CARROSSEL_SUPABASE_URL.replace(/\/$/, "");
const ANON = env.CARROSSEL_SUPABASE_ANON_KEY;
const SERVICO = env.CARROSSEL_SUPABASE_SERVICE_ROLE_KEY;

const DONO = { email: env.CARROSSEL_QA_EMAIL, senha: env.CARROSSEL_QA_PASSWORD, id: env.CARROSSEL_QA_USER_ID };

async function garantirIntruso() {
  if (env.CARROSSEL_INTRUSO_EMAIL && env.CARROSSEL_INTRUSO_PASSWORD) {
    return { email: env.CARROSSEL_INTRUSO_EMAIL, senha: env.CARROSSEL_INTRUSO_PASSWORD, id: null, criado: false };
  }
  // E-mail único por execução: reaproveitar o mesmo endereço dava 422 (conta já
  // existe) e o script tentava logar com uma senha nova que nunca foi aplicada.
  const email = `qa.intruso.${Math.random().toString(16).slice(2, 10)}@autoclinic.com.br`;
  const senha = `Intruso-${Math.random().toString(36).slice(2, 10)}-9aA!`;
  const res = await fetch(`${URL_BASE}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: SERVICO, authorization: `Bearer ${SERVICO}`, "content-type": "application/json" },
    body: JSON.stringify({ email, password: senha, email_confirm: true }),
  });
  const corpo = await res.json().catch(() => ({}));
  if (!res.ok && res.status !== 422) {
    throw new Error(`não consegui criar o intruso: HTTP ${res.status}`);
  }
  // 422 = conta já existe de uma execução anterior: reaproveita e não apaga.
  return { email, senha, id: res.ok ? corpo?.id ?? null : null, criado: res.ok };
}

async function entrar(quem) {
  const res = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "content-type": "application/json" },
    body: JSON.stringify({ email: quem.email, password: quem.senha }),
  });
  const dados = await res.json();
  if (!res.ok) throw new Error(`login de ${quem.email} falhou: HTTP ${res.status}`);
  return dados.access_token;
}

async function lerProjetos(token) {
  const res = await fetch(`${URL_BASE}/rest/v1/projetos?select=id,auth_user_id`, {
    headers: { apikey: ANON, authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`leitura falhou: HTTP ${res.status}`);
  return res.json();
}

const resultados = [];
function ok(nome, condicao, detalhe = "") {
  resultados.push({ nome, passou: Boolean(condicao), detalhe });
  console.log(`${condicao ? "PASS" : "FALHA"}  ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
}

/**
 * O dono precisa poder LER o que é dele — mas em produção o projeto está vazio
 * (fixtures não vão para lá). Então a prova é auto-suficiente: cria uma linha
 * temporária, lê, e apaga no fim. Assim ela passa tanto em base limpa quanto em
 * base com dados, e nunca deixa lixo.
 */
const marcaProva = `prova-rls-${Date.now()}`;
async function criarDoDono(token) {
  const res = await fetch(`${URL_BASE}/rest/v1/projetos`, {
    method: "POST",
    headers: {
      apikey: ANON,
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      prefer: "return=representation",
    },
    body: JSON.stringify({
      auth_user_id: DONO.id,
      nome: marcaProva,
      documento: { nome: marcaProva, templateId: "minimalist", tema: "prova de RLS", slides: [], versao: 1 },
    }),
  });
  const corpo = await res.json().catch(() => null);
  return { status: res.status, id: Array.isArray(corpo) ? corpo[0]?.id : null };
}
async function apagarDoDono(token, id) {
  await fetch(`${URL_BASE}/rest/v1/projetos?id=eq.${id}`, {
    method: "DELETE",
    headers: { apikey: ANON, authorization: `Bearer ${token}` },
  });
}

const tokenDono = await entrar(DONO);
const criado = await criarDoDono(tokenDono);
ok("dono grava um projeto no próprio nome", criado.status === 201 && Boolean(criado.id), `HTTP ${criado.status}`);

const doDono = await lerProjetos(tokenDono);
ok(
  "dono lê os próprios projetos",
  doDono.length >= 1 && doDono.some((l) => l.id === criado.id),
  `${doDono.length} linha(s)`,
);
ok("toda linha lida é do dono", doDono.every((l) => l.auth_user_id === DONO.id));

const intruso = await garantirIntruso();
const tokenIntruso = await entrar(intruso);
const doIntruso = await lerProjetos(tokenIntruso);
ok("intruso autenticado lê ZERO linha alheia", doIntruso.length === 0, `${doIntruso.length} linha(s)`);

// INSERT com dono alheio: a política `with check (auth.uid() = auth_user_id)` barra.
const roubo = await fetch(`${URL_BASE}/rest/v1/projetos`, {
  method: "POST",
  headers: {
    apikey: ANON,
    authorization: `Bearer ${tokenIntruso}`,
    "content-type": "application/json",
    prefer: "return=representation",
  },
  body: JSON.stringify({
    auth_user_id: DONO.id,
    nome: "tentativa de escrever no projeto de outro",
    documento: { slides: [] },
  }),
});
ok(
  "intruso NÃO grava linha em nome do dono",
  roubo.status === 403 || roubo.status === 401,
  `HTTP ${roubo.status}`,
);

// Anon sem token: nem lista.
const comAnon = await fetch(`${URL_BASE}/rest/v1/projetos?select=id`, {
  headers: { apikey: ANON, authorization: `Bearer ${ANON}` },
});
const corpoAnon = comAnon.ok ? await comAnon.json() : null;
ok(
  "chave anon sem usuário não lê projetos",
  !comAnon.ok || (Array.isArray(corpoAnon) && corpoAnon.length === 0),
  `HTTP ${comAnon.status}`,
);

// Limpeza: a linha da prova sai, e a contagem volta a zero nesta base.
if (criado.id) await apagarDoDono(tokenDono, criado.id);
const depois = await lerProjetos(tokenDono);
ok(
  "limpeza: a linha temporária foi apagada",
  !depois.some((l) => l.id === criado.id),
  `${depois.length} linha(s) no fim`,
);

// O usuário intruso criado para o teste também não fica.
if (intruso.criado && intruso.id) {
  const del = await fetch(`${URL_BASE}/auth/v1/admin/users/${intruso.id}`, {
    method: "DELETE",
    headers: { apikey: SERVICO, authorization: `Bearer ${SERVICO}` },
  });
  ok("limpeza: usuário intruso removido", del.status === 200 || del.status === 204, `HTTP ${del.status}`);
}

const falhas = resultados.filter((r) => !r.passou);
console.log(`\n${resultados.length - falhas.length}/${resultados.length} provas passaram`);
process.exit(falhas.length ? 1 : 0);
