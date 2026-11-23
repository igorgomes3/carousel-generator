/**
 * `GET|POST /api/marca` — a assinatura que sai no slide.
 *
 * Antes: `/api/ac/carrossel/marca?org=autoclinic` — dado da ORGANIZAÇÃO no
 * AutoClinic. Com o carrossel independente não existe mais organização no
 * caminho, então a marca virou dado do usuário, na tabela `perfis` do projeto
 * novo. Semântica preservada: nome vazio = não assina o slide.
 *
 * Mesmas regras de @ da tela (`normalizarHandle` em `/configuracoes`): minúsculo,
 * sem espaço, um único @ no começo. O servidor valida de novo — a tela não é
 * confiável.
 */
import { NextRequest, NextResponse } from "next/server";

import { comoUsuario, exigirSessao } from "@/lib/auth/supabase-servidor";

export const dynamic = "force-dynamic";

interface LinhaPerfil {
  auth_user_id: string;
  marca_nome: string | null;
  marca_handle: string | null;
  marca_avatar_url: string | null;
}

export interface Marca {
  nome: string;
  handle: string;
  avatar_url: string | null;
}

function normalizarHandle(bruto: unknown): { ok: true; valor: string } | { ok: false; erro: string } {
  const limpo = String(bruto ?? "").trim().toLowerCase();
  if (!limpo) return { ok: true, valor: "" };
  if (/\s/.test(limpo)) return { ok: false, erro: "O @ não pode ter espaço" };
  const semArroba = limpo.replace(/^@+/, "");
  if (semArroba.includes("@")) return { ok: false, erro: "Use um único @ no começo" };
  if (!/^[a-z0-9._]{2,30}$/.test(semArroba)) {
    return {
      ok: false,
      erro: "O @ aceita letras, números, ponto e sublinhado, de 2 a 30 caracteres",
    };
  }
  return { ok: true, valor: semArroba };
}

function marcaDe(linha: LinhaPerfil | null, padraoNome: string): Marca {
  return {
    nome: linha?.marca_nome ?? padraoNome,
    handle: linha?.marca_handle ?? "",
    avatar_url: linha?.marca_avatar_url ?? null,
  };
}

export async function GET(request: NextRequest) {
  const portao = await exigirSessao(request);
  if (!portao.ok) return portao.resposta;

  const { ok, dados, erro } = await comoUsuario<LinhaPerfil[]>(
    portao.sessao,
    `perfis?auth_user_id=eq.${portao.sessao.usuario.id}&select=*`,
  );
  if (!ok) {
    console.error("[marca] falha ao ler perfil:", erro);
    return NextResponse.json({ erro: "Não foi possível carregar a marca." }, { status: 500 });
  }

  return NextResponse.json(
    { marca: marcaDe(dados?.[0] ?? null, portao.sessao.usuario.nome) },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const portao = await exigirSessao(request);
  if (!portao.ok) return portao.resposta;

  const corpo = (await request.json().catch(() => ({}))) as {
    marca_nome?: unknown;
    marca_handle?: unknown;
    marca_avatar_url?: unknown;
  };

  const handle = normalizarHandle(corpo.marca_handle);
  if (!handle.ok) return NextResponse.json({ erro: handle.erro }, { status: 400 });

  const nome =
    typeof corpo.marca_nome === "string" ? corpo.marca_nome.trim().slice(0, 60) : "";
  const avatar =
    typeof corpo.marca_avatar_url === "string" ? corpo.marca_avatar_url.trim().slice(0, 500) : "";

  const { ok, dados, erro } = await comoUsuario<LinhaPerfil[]>(portao.sessao, "perfis", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      auth_user_id: portao.sessao.usuario.id,
      marca_nome: nome,
      marca_handle: handle.valor,
      marca_avatar_url: avatar,
    }),
  });

  if (!ok) {
    console.error("[marca] falha ao salvar perfil:", erro);
    return NextResponse.json({ erro: "Não foi possível salvar a marca." }, { status: 500 });
  }

  return NextResponse.json({ marca: marcaDe(dados?.[0] ?? null, nome || portao.sessao.usuario.nome) });
}
