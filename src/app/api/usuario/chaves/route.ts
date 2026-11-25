/**
 * `GET|PUT /api/usuario/chaves` — chave de IA do próprio usuário.
 *
 * Regra do produto: a chave do administrador é o padrão; se o usuário definir a
 * dele, ela vale para as gerações DESSE usuário. É o caminho para quem prefere
 * custear o próprio consumo.
 *
 * A chave nunca volta ao navegador: o GET devolve máscara e de onde vem cada
 * valor (`usuario` / `global` / `nenhuma`). No PUT, campo vazio mantém; `__apagar__`
 * limpa e volta a herdar a global.
 */
import { NextRequest, NextResponse } from "next/server";

import { exigirSessao } from "@/lib/auth/supabase-servidor";
import { configEfetiva, mascararChave } from "@/lib/ia/config";
import {
  lerChavesDoUsuario,
  salvarChavesDoUsuario,
  usaChavePropria,
  type PatchChaves,
} from "@/lib/ia/chaves-usuario";

export const dynamic = "force-dynamic";

const APAGAR = "__apagar__";

function campo(valor: unknown): string | undefined | null {
  if (typeof valor !== "string") return undefined;
  const t = valor.trim();
  if (t === "") return undefined; // manter
  if (t === APAGAR) return null; // limpar
  return t.slice(0, 400);
}

export async function GET(request: NextRequest) {
  const portao = await exigirSessao(request);
  if (!portao.ok) return portao.resposta;

  const [minhas, global] = await Promise.all([
    lerChavesDoUsuario(portao.sessao),
    configEfetiva(),
  ]);

  const efetiva = {
    llmBaseUrl: minhas.llmBaseUrl || global.llmBaseUrl,
    llmModel: minhas.llmModel || global.llmModel,
    llmApiKey: minhas.llmApiKey || global.llmApiKey,
    imagemBaseUrl: minhas.imagemBaseUrl || global.imagemBaseUrl,
    imagemModel: minhas.imagemModel || global.imagemModel,
    imagemApiKey: minhas.imagemApiKey || global.imagemApiKey,
  };

  return NextResponse.json(
    {
      minhas: {
        llmBaseUrl: minhas.llmBaseUrl,
        llmModel: minhas.llmModel,
        llmApiKeyMascara: mascararChave(minhas.llmApiKey),
        imagemBaseUrl: minhas.imagemBaseUrl,
        imagemModel: minhas.imagemModel,
        imagemApiKeyMascara: mascararChave(minhas.imagemApiKey),
      },
      efetiva: {
        llmBaseUrl: efetiva.llmBaseUrl,
        llmModel: efetiva.llmModel,
        llmApiKeyMascara: mascararChave(efetiva.llmApiKey),
        imagemBaseUrl: efetiva.imagemBaseUrl,
        imagemModel: efetiva.imagemModel,
        imagemApiKeyMascara: mascararChave(efetiva.imagemApiKey),
      },
      origem: {
        llmApiKey: minhas.llmApiKey ? "usuario" : global.llmApiKey ? "global" : "nenhuma",
        imagemApiKey: minhas.imagemApiKey ? "usuario" : global.imagemApiKey ? "global" : "nenhuma",
      },
      usandoPropria: usaChavePropria(minhas),
    },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function PUT(request: NextRequest) {
  const portao = await exigirSessao(request);
  if (!portao.ok) return portao.resposta;

  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!corpo) return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });

  const patch: PatchChaves = {
    llmBaseUrl: campo(corpo.llmBaseUrl),
    llmModel: campo(corpo.llmModel),
    llmApiKey: campo(corpo.llmApiKey),
    imagemBaseUrl: campo(corpo.imagemBaseUrl),
    imagemModel: campo(corpo.imagemModel),
    imagemApiKey: campo(corpo.imagemApiKey),
  };

  const resultado = await salvarChavesDoUsuario(portao.sessao, patch);
  if (!resultado.ok) {
    return NextResponse.json({ erro: resultado.erro ?? "Não foi possível salvar." }, { status: 502 });
  }

  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
