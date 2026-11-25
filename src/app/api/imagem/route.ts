/**
 * Geração de imagem do estúdio — capa e cenas dos cards.
 *
 * Espelha o `/api/art` do o produto de referência de propósito: `POST` devolve `jobId` e o
 * cliente faz poll em `GET ?job=`. Geração de imagem leva dezenas de segundos;
 * segurar a resposta HTTP até o fim estoura timeout do proxy e trava a tela.
 *
 * O provedor é o 9Router (`/v1/images/generations`), o mesmo hub que já serve o
 * texto — não há chave nova, e o modelo é trocável por env sem mexer no código.
 *
 * Modelo medido em 21/11/2026: `cx/gpt-image-2.5` (conta OpenAI Plus/Codex
 * renovada). Resposta em `data[0].b64_json`. Tamanhos que o provedor aceitou, com
 * b64 real devolvido: `1024x1024`, `1024x1536` e **`1088x1360`** — este último é
 * o 4:5 nativo do card, então é o padrão aqui. NÃO use `gpt-image-1` (sem
 * credencial) nem `codex/gpt-image-1` (400: o modelo não roda em conta ChatGPT).
 * A saída é sempre `data:image/png;base64,...`: o export de PNG do navegador
 * (html-to-image) falha com URL externa por CORS, e data-URI não tem essa
 * desvantagem.
 */
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { exigirSessao } from "@/lib/auth/supabase-servidor";
import { configParaUsuario } from "@/lib/ia/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Estado = "pending" | "done" | "erro";

interface Job {
  estado: Estado;
  imagem?: string;
  erro?: string;
  criadoEm: number;
}

/** Store do processo: um job vive minutos, não precisa de tabela. */
const store: Map<string, Job> = ((
  globalThis as unknown as { __jobsImagem?: Map<string, Job> }
).__jobsImagem ??= new Map<string, Job>());

const VALIDADE_MS = 10 * 60_000;

function limpar() {
  const agora = Date.now();
  store.forEach((job, id) => {
    if (agora - job.criadoEm > VALIDADE_MS) store.delete(id);
  });
}

async function gerar(
  jobId: string,
  prompt: string,
  tamanho: string,
  cfg: { chave: string; base: string; modelo: string },
) {
  // Chave/base/modelo resolvidos pelo CHAMADOR: a do usuário quando existir,
  // senão a global do painel. Ver `configParaUsuario`.
  const chave = cfg.chave;
  const base = cfg.base.replace(/\/$/, "");
  const modelo = cfg.modelo;

  const job = store.get(jobId);
  if (!job) return;
  if (!chave) {
    job.estado = "erro";
    job.erro = "A geração de imagem está sem chave. Peça ao administrador para definir no painel.";
    return;
  }

  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), 240_000);

  try {
    const res = await fetch(`${base}/images/generations`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${chave}` },
      body: JSON.stringify({ model: modelo, prompt, n: 1, size: tamanho, response_format: "b64_json" }),
      signal: controle.signal,
    });

    const texto = await res.text();
    if (!res.ok) {
      job.estado = "erro";
      job.erro = `O provedor de imagem respondeu ${res.status}. ${texto.slice(0, 180)}`;
      return;
    }

    let dados: { data?: { b64_json?: string; url?: string }[] } = {};
    try {
      dados = JSON.parse(texto);
    } catch {
      job.estado = "erro";
      job.erro = "Resposta da imagem em formato inesperado.";
      return;
    }

    const primeiro = dados.data?.[0];
    if (primeiro?.b64_json) {
      job.imagem = `data:image/png;base64,${primeiro.b64_json}`;
      job.estado = "done";
      return;
    }
    if (primeiro?.url) {
      const bin = await fetch(primeiro.url);
      const buffer = Buffer.from(await bin.arrayBuffer());
      job.imagem = `data:image/${bin.headers.get("content-type")?.split("/")[1] ?? "png"};base64,${buffer.toString("base64")}`;
      job.estado = "done";
      return;
    }

    job.estado = "erro";
    job.erro = "O provedor não devolveu imagem.";
  } catch (e) {
    job.estado = "erro";
    job.erro =
      e instanceof Error && e.name === "AbortError"
        ? "A imagem demorou demais. Tente de novo."
        : "Falha ao gerar a imagem.";
  } finally {
    clearTimeout(relogio);
  }
}

export async function POST(request: NextRequest) {
  // Portão de custo (W97): imagem também exige sessão válida. Este é o endpoint
  // mais caro do produto — uma capa por IA por card.
  const portao = await exigirSessao(request);
  if (!portao.ok) return portao.resposta;

  const corpo = (await request.json().catch(() => null)) as
    | { prompt?: string; tamanho?: string }
    | null;

  const prompt = (corpo?.prompt ?? "").trim();
  if (prompt.length < 8) {
    return NextResponse.json({ erro: "Descreva a imagem." }, { status: 400 });
  }

  limpar();
  const jobId = randomUUID();

  // Resolve a configuração JÁ aqui, antes de responder: o job roda depois do
  // return, e sem isso o `process.env` poderia ter mudado por outra requisição.
  const config = await configParaUsuario(portao.sessao.usuario.id);
  if (!config.imagemApiKey) {
    return NextResponse.json(
      {
        erro: "A geração de imagem está sem chave. Defina a sua nas configurações ou peça ao administrador.",
        codigo: "sem_chave_imagem",
      },
      { status: 503 },
    );
  }

  store.set(jobId, { estado: "pending", criadoEm: Date.now() });

  void gerar(jobId, prompt, corpo?.tamanho ?? "1088x1360", {
    chave: config.imagemApiKey,
    base: config.imagemBaseUrl,
    modelo: config.imagemModel,
  });

  return NextResponse.json({ jobId });
}

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("job") ?? "";
  const job = store.get(jobId);

  if (!job) {
    return NextResponse.json({ erro: "Geração expirada. Tente de novo." }, { status: 404 });
  }
  if (job.estado === "pending") return NextResponse.json({ status: "pending" });
  if (job.estado === "erro") {
    store.delete(jobId);
    return NextResponse.json({ status: "erro", erro: job.erro ?? "Falha ao gerar a imagem." });
  }

  store.delete(jobId);
  return NextResponse.json({ status: "done", imagem: job.imagem });
}
