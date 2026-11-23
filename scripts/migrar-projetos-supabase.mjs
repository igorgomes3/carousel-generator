#!/usr/bin/env node
/**
 * Copia os projetos salvos de um projeto Supabase para outro — hoje
 * `carrossel-ia` (origem/rollback) → `carroseia-prod` (definitivo).
 *
 * Por que existe: a infraestrutura nasceu num projeto de teste e foi
 * reconstruída no projeto definitivo (org CarroseIA, sa-east-1). O que não pode
 * se perder no caminho é o trabalho das pessoas: `id`, `nome`, `documento`
 * (cards, tema, template, estilo, @), datas e `token_publico` (os links
 * `/p/<token>` já compartilhados continuam valendo).
 *
 * ## Como escreve: como PESSOA (`authenticated`), não como `service_role`
 *
 * O `service_role` do projeto novo **não tem GRANT** nas tabelas criadas por SQL
 * pelo Management API — o PostgREST responde `42501 permission denied`. Quem tem
 * GRANT é `authenticated`, e com RLS ligada. Então a cópia roda com o token de
 * login do dono de QA dos dois projetos:
 *
 *   - na origem, lê as linhas dele mesmo (RLS de SELECT);
 *   - no destino, insere/atualiza linhas com `auth_user_id` igual ao `auth.uid()`
 *     dele (as políticas de INSERT/UPDATE exigem exatamente isso).
 *
 * Isso é melhor que "pedir um GRANT": o caminho da migração passa a ser o MESMO
 * caminho que o app usa em produção — se funcionar aqui, funciona na tela.
 *
 * ## Regras
 *
 * - **Idempotente por `id`** (`on_conflict=id`, `resolution=merge-duplicates`):
 *   rodar duas vezes atualiza as mesmas linhas, nunca duplica.
 * - **O dono muda de identidade:** `auth_user_id` é FK para `auth.users`, então o
 *   id do projeto antigo não existiria no novo. As linhas passam a pertencer ao
 *   usuário de QA do destino (`CARROSSEL_PROD_QA_USER_ID`).
 * - **Nada é apagado na origem** — ela é o rollback.
 * - **Nenhum segredo em argv ou log.**
 *
 * Uso:
 *   node scripts/migrar-projetos-supabase.mjs            # copia origem → destino
 *   node scripts/migrar-projetos-supabase.mjs --dry-run  # só mostra o plano
 *   node scripts/migrar-projetos-supabase.mjs --conferir # relê o destino e prova que abre
 */
import { readFile } from "node:fs/promises";

const CREDS = process.env.CARROSSEL_CREDS ?? "/root/.ctxswap/contexts/carrossel/creds.json";
const DRY = process.argv.includes("--dry-run");
const SO_CONFERIR = process.argv.includes("--conferir");

const env = JSON.parse(await readFile(CREDS, "utf8")).env ?? {};

function exigir(campos) {
  const faltando = campos.filter((c) => !env[c]);
  if (faltando.length) throw new Error(`faltam no cofre: ${faltando.join(", ")}`);
}

function alvo(prefixo, usuarioChave) {
  return {
    nome: prefixo.replace(/_$/, ""),
    url: String(env[`${prefixo}URL`]).replace(/\/$/, ""),
    anon: env[`${prefixo}ANON_KEY`],
    usuario: env[usuarioChave],
  };
}

exigir([
  "CARROSSEL_SUPABASE_URL",
  "CARROSSEL_SUPABASE_ANON_KEY",
  "CARROSSEL_PROD_URL",
  "CARROSSEL_PROD_ANON_KEY",
  "CARROSSEL_PROD_QA_USER_ID",
  "CARROSSEL_QA_EMAIL",
  "CARROSSEL_QA_PASSWORD",
]);

const origem = alvo("CARROSSEL_SUPABASE_", "CARROSSEL_QA_USER_ID");
const destino = alvo("CARROSSEL_PROD_", "CARROSSEL_PROD_QA_USER_ID");

/** Login por e-mail/senha no GoTrue do projeto. A mesma conta existe nos dois. */
async function entrar(base) {
  const res = await fetch(`${base.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: base.anon, "content-type": "application/json" },
    body: JSON.stringify({ email: env.CARROSSEL_QA_EMAIL, password: env.CARROSSEL_QA_PASSWORD }),
  });
  const dados = await res.json().catch(() => ({}));
  if (!res.ok || !dados.access_token) {
    throw new Error(`login em ${base.nome} falhou: HTTP ${res.status}`);
  }
  return { token: dados.access_token, usuario: dados.user?.id ?? null };
}

async function rest(base, token, caminho, init = {}) {
  const res = await fetch(`${base.url}/rest/v1/${caminho}`, {
    ...init,
    headers: {
      apikey: base.anon,
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const texto = await res.text();
  let dados = null;
  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    dados = null;
  }
  return { ok: res.ok, status: res.status, dados, texto };
}

async function conferir(tokenDestino, ids) {
  const r = await rest(destino, tokenDestino, "projetos?select=id,nome,auth_user_id,token_publico,documento&order=criado_em.asc");
  if (!r.ok) throw new Error(`leitura do destino: HTTP ${r.status} ${r.texto.slice(0, 200)}`);
  const linhas = r.dados ?? [];
  console.log(`\ndestino: ${linhas.length} projeto(s)`);
  for (const l of linhas) {
    const cards = Array.isArray(l.documento?.slides) ? l.documento.slides.length : 0;
    const migrado = !ids || ids.includes(l.id) ? "migrado" : "outro";
    console.log(`  ${l.id} | ${migrado} | ${cards} cards | dono ${l.auth_user_id} | token ${l.token_publico} | ${l.nome}`);
  }

  // A prova que importa: abrir cada um pelo id, com o token do dono (RLS ligada).
  for (const linha of linhas) {
    const um = await rest(destino, tokenDestino, `projetos?id=eq.${linha.id}&select=id,nome`);
    const abriu = Array.isArray(um.dados) && um.dados.length === 1;
    console.log(`  abre ${linha.id}: HTTP ${um.status} ${abriu ? "ok" : "NÃO ENCONTRADO"}`);
  }
  return linhas;
}

async function main() {
  const sessaoOrigem = await entrar(origem);
  const sessaoDestino = await entrar(destino);
  console.log(`origem ${origem.url}: login HTTP ok (usuário ${sessaoOrigem.usuario})`);
  console.log(`destino ${destino.url}: login HTTP ok (usuário ${sessaoDestino.usuario})`);

  if (sessaoDestino.usuario !== destino.usuario) {
    throw new Error(
      `o login do destino é ${sessaoDestino.usuario} mas o cofre diz ${destino.usuario} — não vou gravar com dono trocado`,
    );
  }

  if (SO_CONFERIR) {
    await conferir(sessaoDestino.token);
    return;
  }

  const r = await rest(origem, sessaoOrigem.token, "projetos?select=*&order=criado_em.asc");
  if (!r.ok) throw new Error(`leitura da origem: HTTP ${r.status} ${r.texto.slice(0, 200)}`);
  const linhas = r.dados ?? [];
  const ids = linhas.map((l) => l.id);
  console.log(`origem: ${linhas.length} projeto(s), dono ${sessaoOrigem.usuario}`);

  for (const linha of linhas) {
    const registro = {
      id: linha.id,
      auth_user_id: destino.usuario,
      nome: linha.nome,
      documento: linha.documento,
      // Preservar o token mantém válidos os links `/p/<token>` já enviados.
      token_publico: linha.token_publico,
      criado_em: linha.criado_em,
      atualizado_em: linha.atualizado_em,
    };

    if (DRY) {
      console.log(`[dry-run] ${linha.id} → ${destino.usuario} (${linha.documento?.slides?.length ?? 0} cards) ${linha.nome}`);
      continue;
    }

    const g = await rest(destino, sessaoDestino.token, "projetos?on_conflict=id", {
      method: "POST",
      headers: { prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(registro),
    });
    if (!g.ok) throw new Error(`gravação de ${linha.id}: HTTP ${g.status} ${g.texto.slice(0, 300)}`);
    console.log(`ok ${linha.id} (${linha.documento?.slides?.length ?? 0} cards) ${linha.nome}`);
  }

  if (!DRY) await conferir(sessaoDestino.token, ids);
}

main().catch((erro) => {
  console.error(`ERRO: ${erro.message}`);
  process.exit(1);
});
