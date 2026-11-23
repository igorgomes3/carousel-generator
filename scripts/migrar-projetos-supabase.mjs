#!/usr/bin/env node
/**
 * Migra os projetos do estúdio do disco (`data/estudio/projetos/<id>/projeto.json`)
 * para a tabela `projetos` do Supabase dedicado do carrossel.
 *
 * Por que precisa: até a W97 o "dono" de um projeto era um UUID de cookie
 * (`estudio_dono`) — não havia usuário. Agora o dono é `auth.uid()` do GoTrue
 * novo, então cada projeto do disco tem de ser amarrado a uma conta real. A
 * conta usada é a de QA (`qa.owner@autoclinic.com.br`), criada no projeto novo
 * para isso: as duas linhas vieram de navegadores anônimos de teste, não de
 * cliente pagante.
 *
 * IDEMPOTENTE: o `id` do projeto é preservado e o upsert é por `id`
 * (`Prefer: resolution=merge-duplicates`). Rodar duas vezes atualiza as mesmas
 * duas linhas; rodar dez não cria dez.
 *
 * Uso:
 *   node scripts/migrar-projetos-supabase.mjs            # aplica
 *   node scripts/migrar-projetos-supabase.mjs --dry-run  # só mostra o plano
 *
 * Credenciais: lê `/root/.ctxswap/contexts/carrossel/creds.json` (600) —
 * `CARROSSEL_SUPABASE_URL`, `CARROSSEL_SUPABASE_SERVICE_ROLE_KEY`,
 * `CARROSSEL_QA_USER_ID`. Nada de segredo em argumento de linha de comando (vai
 * para o histórico do shell) e nada de segredo impresso.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const RAIZ = path.resolve(process.cwd(), "data", "estudio", "projetos");
const CREDS = process.env.CARROSSEL_CREDS ?? "/root/.ctxswap/contexts/carrossel/creds.json";
const DRY = process.argv.includes("--dry-run");

async function credenciais() {
  const json = JSON.parse(await readFile(CREDS, "utf8"));
  const env = json.env ?? {};
  const faltando = [
    "CARROSSEL_SUPABASE_URL",
    "CARROSSEL_SUPABASE_SERVICE_ROLE_KEY",
    "CARROSSEL_QA_USER_ID",
  ].filter((k) => !env[k]);
  if (faltando.length) throw new Error(`faltam em ${CREDS}: ${faltando.join(", ")}`);
  return {
    url: env.CARROSSEL_SUPABASE_URL.replace(/\/$/, ""),
    chave: env.CARROSSEL_SUPABASE_SERVICE_ROLE_KEY,
    usuario: env.CARROSSEL_QA_USER_ID,
  };
}

async function projetosDoDisco() {
  const entradas = await readdir(RAIZ, { withFileTypes: true }).catch(() => []);
  const saida = [];
  for (const entrada of entradas) {
    if (!entrada.isDirectory() || entrada.name.startsWith(".tmp-")) continue;
    const arquivo = path.join(RAIZ, entrada.name, "projeto.json");
    try {
      const dados = JSON.parse(await readFile(arquivo, "utf8"));
      if (!dados?.id || !Array.isArray(dados.slides)) continue;
      saida.push({ arquivo, dados });
    } catch {
      /* projeto ilegível: não é migrável, e o disco continua sendo a verdade */
    }
  }
  return saida;
}

function documentoDe(dados) {
  // O `dono` (UUID de cookie) sai: não existe mais esse dono. O resto é o
  // contrato `ProjetoSalvo` que o estúdio lê.
  const { dono: _dono, ...resto } = dados;
  return resto;
}

async function main() {
  const { url, chave, usuario } = await credenciais();
  const projetos = await projetosDoDisco();
  console.log(`projetos no disco: ${projetos.length} (destino: usuário QA ${usuario})`);

  const ids = [];
  for (const { arquivo, dados } of projetos) {
    const documento = documentoDe(dados);
    const linha = {
      id: dados.id,
      auth_user_id: usuario,
      nome: dados.nome ?? "Carrossel sem título",
      documento,
    };
    ids.push(dados.id);

    if (DRY) {
      console.log(`[dry-run] ${path.relative(process.cwd(), arquivo)} → id ${dados.id} (${dados.slides.length} cards)`);
      continue;
    }

    const res = await fetch(`${url}/rest/v1/projetos?on_conflict=id`, {
      method: "POST",
      headers: {
        apikey: chave,
        authorization: `Bearer ${chave}`,
        "content-type": "application/json",
        // merge-duplicates = upsert por id; sem isto o segundo run dá 409.
        prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(linha),
    });

    const corpo = await res.text();
    if (!res.ok) {
      throw new Error(`falha ao gravar ${dados.id}: HTTP ${res.status} ${corpo.slice(0, 300)}`);
    }
    console.log(`ok ${dados.id} ← ${path.relative(process.cwd(), arquivo)} (${dados.slides.length} cards)`);
  }

  if (DRY) return;

  // Prova de idempotência e de integridade: conta linhas e ids migrados.
  const conf = await fetch(
    `${url}/rest/v1/projetos?select=id,nome,auth_user_id,token_publico&order=criado_em.asc`,
    { headers: { apikey: chave, authorization: `Bearer ${chave}` } },
  );
  const linhas = await conf.json();
  console.log(`linhas na tabela agora: ${Array.isArray(linhas) ? linhas.length : "?"}`);
  for (const l of linhas ?? []) {
    const migrado = ids.includes(l.id) ? "migrado" : "outro";
    console.log(`  ${l.id} | ${migrado} | dono ${l.auth_user_id} | token ${l.token_publico} | ${l.nome}`);
  }
}

main().catch((erro) => {
  console.error(`ERRO: ${erro.message}`);
  process.exit(1);
});
