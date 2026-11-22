/**
 * `/api/projetos/<id>/arquivos/<nome>` — as imagens dos cards.
 *
 * As capas saem da IA em base64; no disco viram arquivo. Esta rota serve esses
 * arquivos para o `Cartao` (prévia) e para o `html-to-image` (PNG final).
 *
 * `immutable` porque o nome carrega `?v=<versão do projeto>`: quando a pessoa
 * troca a capa, o caminho muda e o navegador não serve a imagem velha.
 */
import { promises as fs } from "node:fs";
import { NextRequest, NextResponse } from "next/server";

import { TIPOS_POR_EXTENSAO, caminhoDoArquivo } from "@/lib/estudio/armazenamento";
import { donoAtual } from "@/lib/estudio/dono";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  ctx: { params: { id: string; nome: string } },
) {
  const dono = donoAtual();
  if (!dono) return new NextResponse(null, { status: 404 });

  const caminho = await caminhoDoArquivo(dono, ctx.params.id, ctx.params.nome);
  if (!caminho) return new NextResponse(null, { status: 404 });

  try {
    const bytes = await fs.readFile(caminho);
    const extensao = caminho.split(".").pop()?.toLowerCase() ?? "";
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "content-type": TIPOS_POR_EXTENSAO[extensao] ?? "application/octet-stream",
        "cache-control": "private, max-age=31536000, immutable",
        "content-length": String(bytes.byteLength),
      },
    });
  } catch (erro) {
    console.error("[projetos] falha ao ler arquivo:", erro);
    return new NextResponse(null, { status: 404 });
  }
}
