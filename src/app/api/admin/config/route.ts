/**
 * `GET|PUT /api/admin/config` — as chaves de IA que o produto usa.
 *
 * Só administrador. O GET **nunca devolve a chave**: devolve a máscara e os
 * campos de modelo/base, que não são segredo. Chave em texto saindo para o
 * navegador é vazamento com passos extras — qualquer XSS, DevTools ou print de
 * tela expõe o que paga a conta.
 *
 * No PUT, campo ausente ou string vazia significa "não mexer". Apagar é
 * explícito: o valor `__apagar__`. Sem isso, abrir a tela com a chave mascarada e
 * salvar apagaria a chave sem ninguém pedir.
 */
import { NextRequest, NextResponse } from "next/server";

import { ehAdmin } from "@/lib/auth/admin";
import { exigirSessao } from "@/lib/auth/supabase-servidor";
import {
  configEfetiva,
  gravarConfigIA,
  lerConfigIA,
  mascararChave,
  type PatchConfig,
} from "@/lib/ia/config";

export const dynamic = "force-dynamic";

const APAGAR = "__apagar__";

function limpar(valor: unknown): string | null | undefined {
  if (valor === undefined) return undefined;
  if (typeof valor !== "string") return undefined;
  const t = valor.trim();
  if (t === "") return undefined; // vazio = manter
  if (t === APAGAR) return null;
  return t;
}

export async function GET(request: NextRequest) {
  const portao = await exigirSessao(request);
  if (!portao.ok) return portao.resposta;

  if (!ehAdmin(portao.sessao.usuario.email)) {
    return NextResponse.json({ erro: "Apenas o administrador acessa esta área." }, { status: 403 });
  }

  const [cfg, efetiva] = await Promise.all([lerConfigIA(), configEfetiva()]);

  return NextResponse.json(
    {
      admin: true,
      email: portao.sessao.usuario.email,
      config: {
        llmBaseUrl: efetiva.llmBaseUrl,
        llmModel: efetiva.llmModel,
        llmApiKeyMascara: mascararChave(efetiva.llmApiKey),
        llmApiKeyDaTela: Boolean(cfg.llmApiKey),
        imagemBaseUrl: efetiva.imagemBaseUrl,
        imagemModel: efetiva.imagemModel,
        imagemApiKeyMascara: mascararChave(efetiva.imagemApiKey),
        imagemApiKeyDaTela: Boolean(cfg.imagemApiKey),
        atualizadoPor: cfg.atualizadoPor,
        atualizadoEm: cfg.atualizadoEm,
        // De onde cada valor veio, para a tela poder dizer a verdade: ambiente
        // herdado não é a mesma coisa que "definido aqui".
        origem: {
          llmApiKey: cfg.llmApiKey ? "painel" : cfg.imagemApiKey || process.env.OPENAI_API_KEY ? "ambiente" : "nenhuma",
          imagemApiKey: cfg.imagemApiKey ? "painel" : process.env.OPENAI_API_KEY ? "ambiente" : "nenhuma",
        },
        admins: process.env.CARROSSEL_ADMINS ?? "igorgomes@mail.com",
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function PUT(request: NextRequest) {
  const portao = await exigirSessao(request);
  if (!portao.ok) return portao.resposta;

  if (!ehAdmin(portao.sessao.usuario.email)) {
    return NextResponse.json({ erro: "Apenas o administrador acessa esta área." }, { status: 403 });
  }

  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!corpo) return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });

  const patch: PatchConfig = {
    llmBaseUrl: limpar(corpo.llmBaseUrl),
    llmModel: limpar(corpo.llmModel),
    llmApiKey: limpar(corpo.llmApiKey),
    imagemBaseUrl: limpar(corpo.imagemBaseUrl),
    imagemModel: limpar(corpo.imagemModel),
    imagemApiKey: limpar(corpo.imagemApiKey),
  };

  const resultado = await gravarConfigIA(patch, portao.sessao.usuario.email);
  if (!resultado.ok) {
    return NextResponse.json(
      { erro: `Não foi possível salvar a configuração: ${resultado.erro}` },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
