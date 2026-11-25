/**
 * Convites de cadastro: código de uso único, com expiração.
 *
 * Serve para abrir uma exceção sem soltar a porta: com `cadastro_aberto = false`
 * ou `exigir_convite = true`, `/api/auth/cadastro` só aceita quem tem código
 * válido. O código é a credencial — por isso é longo, aleatório e não sequencial.
 *
 * Uso único é do BANCO, não do código: a marcação `usado_por`/`usado_em` é feita
 * com UPDATE condicional (`usado_por is null`), então dois cadastros simultâneos
 * com o mesmo código não passam os dois.
 */
import { randomBytes } from "node:crypto";

import { comoServico } from "@/lib/auth/supabase-servidor";

export interface Convite {
  codigo: string;
  criadoPor: string | null;
  criadoEm: string;
  expiraEm: string;
  usadoPor: string | null;
  usadoEm: string | null;
  nota: string | null;
  /** Derivado: ainda serve? */
  valido: boolean;
}

interface Linha {
  codigo: string;
  criado_por: string | null;
  criado_em: string;
  expira_em: string;
  usado_por: string | null;
  usado_em: string | null;
  nota: string | null;
}

function daLinha(l: Linha): Convite {
  const expirado = new Date(l.expira_em).getTime() < Date.now();
  return {
    codigo: l.codigo,
    criadoPor: l.criado_por,
    criadoEm: l.criado_em,
    expiraEm: l.expira_em,
    usadoPor: l.usado_por,
    usadoEm: l.usado_em,
    nota: l.nota,
    valido: !l.usado_por && !expirado,
  };
}

/** Código legível: 12 caracteres de base32, sem 0/O/1/I para não confundir. */
function sortearCodigo(): string {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(12);
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
}

export async function criarConvite({
  por,
  dias,
  nota,
}: {
  por: string;
  dias: number;
  nota?: string | null;
}): Promise<{ ok: boolean; convite?: Convite; erro?: string }> {
  const diasSeguros = Math.min(Math.max(Math.trunc(dias) || 7, 1), 365);
  const expira = new Date(Date.now() + diasSeguros * 86_400_000).toISOString();
  const codigo = sortearCodigo();

  const { ok, dados, erro } = await comoServico<Linha[]>("convites", {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({
      codigo,
      criado_por: por,
      expira_em: expira,
      nota: nota?.slice(0, 120) ?? null,
    }),
  });

  if (!ok || !dados || dados.length === 0) {
    return { ok: false, erro: erro ?? "não foi possível criar o convite" };
  }
  return { ok: true, convite: daLinha(dados[0]) };
}

export async function listarConvites(): Promise<Convite[]> {
  const { ok, dados } = await comoServico<Linha[]>(
    "convites?select=*&order=criado_em.desc&limit=100",
  );
  if (!ok || !dados) return [];
  return dados.map(daLinha);
}

export type ResultadoConvite =
  | { ok: true; nota: string | null }
  | { ok: false; motivo: string };

/**
 * Valida e consome. Retorna o motivo em português para a tela poder explicar.
 *
 * Consome ANTES de criar a conta? Não: quem chama faz na ordem certa — cria a
 * conta, então marca o convite. Se marcar antes e a criação falhar, o convite
 * morre sem ninguém usar.
 */
export async function consumirConvite(
  codigo: string,
  userId: string,
): Promise<ResultadoConvite> {
  const limpo = codigo.trim().toUpperCase();
  if (!limpo) return { ok: false, motivo: "Informe o código do convite." };

  const { ok, dados } = await comoServico<Linha[]>(
    `convites?select=*&codigo=eq.${encodeURIComponent(limpo)}&limit=1`,
  );
  if (!ok || !dados || dados.length === 0) {
    return { ok: false, motivo: "Código de convite inválido." };
  }

  const convite = daLinha(dados[0]);
  if (convite.usadoPor) return { ok: false, motivo: "Este convite já foi usado." };
  if (!convite.valido) return { ok: false, motivo: "Este convite expirou." };

  // UPDATE condicional: só marca se ainda estiver livre (uso único atômico).
  const marcado = await comoServico<Linha[]>(
    `convites?codigo=eq.${encodeURIComponent(limpo)}&usado_por=is.null`,
    {
      method: "PATCH",
      headers: { prefer: "return=representation" },
      body: JSON.stringify({ usado_por: userId, usado_em: new Date().toISOString() }),
    },
  );

  if (!marcado.ok || !marcado.dados || marcado.dados.length === 0) {
    return { ok: false, motivo: "Este convite já foi usado." };
  }
  return { ok: true, nota: convite.nota };
}

/** Confere sem consumir — usado pela tela antes de habilitar o botão. */
export async function conviteDisponivel(codigo: string): Promise<boolean> {
  const limpo = codigo.trim().toUpperCase();
  if (!limpo) return false;
  const { ok, dados } = await comoServico<Linha[]>(
    `convites?select=*&codigo=eq.${encodeURIComponent(limpo)}&limit=1`,
  );
  if (!ok || !dados || dados.length === 0) return false;
  return daLinha(dados[0]).valido;
}
