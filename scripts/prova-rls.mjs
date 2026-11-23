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
    return { email: env.CARROSSEL_INTRUSO_EMAIL, senha: env.CARROSSEL_INTRUSO_PASSWORD };
  }
  const email = "qa.intruso@autoclinic.com.br";
  const senha = `Intruso-${Math.random().toString(36).slice(2, 10)}-9aA!`;
  const res = await fetch(`${URL_BASE}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: SERVICO, authorization: `Bearer ${SERVICO}`, "content-type": "application/json" },
    body: JSON.stringify({ email, password: senha, email_confirm: true }),
  });
  if (!res.ok && res.status !== 422) {
    throw new Error(`não consegui criar o intruso: HTTP ${res.status}`);
  }
  return { email, senha };
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

const tokenDono = await entrar(DONO);
const doDono = await lerProjetos(tokenDono);
ok("dono lê os próprios projetos", doDono.length >= 2, `${doDono.length} linha(s)`);
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

const falhas = resultados.filter((r) => !r.passou);
console.log(`\n${resultados.length - falhas.length}/${resultados.length} provas passaram`);
process.exit(falhas.length ? 1 : 0);
