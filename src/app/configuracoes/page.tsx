"use client";

/**
 * `/configuracoes` — a conta do usuário: assinatura do slide e chaves de IA.
 *
 * Redesenho de 27/11/2026: esta era a única tela fora da linguagem nova do
 * produto (fundo, barra, tipografia e cartões vinham do painel antigo). Agora usa
 * a mesma chrome de `/projetos`, `/admin` e `/autopilot`: barra fixa com o selo
 * CONTENTX, container de 1100 px, título 26/30 px e cartões de 16 px de raio.
 *
 * Duas decisões de conteúdo:
 * - a assinatura é do USUÁRIO, não de "organização" (não existe organização no
 *   carrossel desde a separação do banco) — a cópia antiga mentia sobre isso;
 * - quem preenche vê na hora como a assinatura sai no rodapé do card, porque
 *   "Nome no slide" sem prévia é campo que a pessoa preenche no escuro.
 *
 * Regras do campo @ (as mesmas da API, e a API é quem manda): minúsculo, sem
 * espaço, um único @ no começo. Validar aqui só antecipa o erro.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { TopoApp } from "@/components/carrosseis/topo-app";
import { ChavesIA } from "@/components/conta/chaves-ia";
import { garantirSessao, usuarioAtual, type UsuarioCarrossel } from "@/lib/auth/sessao";

const COR = {
  tinta: "#0B1220",
  suave: "#475467",
  fraco: "#6B6660",
  borda: "#E2E8F0",
  acao: "#0E7490",
  acaoSuave: "#ECFEFF",
  ok: "#166534",
  erro: "#B42318",
  fundo: "#F5F7F9",
};

/** Espelha `Marca` em `src/app/api/marca/route.ts`. */
export interface MarcaConta {
  nome: string;
  handle: string;
  avatar_url: string | null;
}

async function lerMarca(): Promise<MarcaConta> {
  const res = await fetch("/api/marca", { cache: "no-store" });
  const dados = (await res.json().catch(() => ({}))) as { marca?: MarcaConta; erro?: string };
  if (!res.ok || !dados.marca) throw new Error(dados.erro ?? "Falha ao carregar a marca");
  return dados.marca;
}

async function gravarMarca(corpo: {
  marca_nome: string;
  marca_handle: string;
  marca_avatar_url: string;
}): Promise<MarcaConta> {
  const res = await fetch("/api/marca", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(corpo),
  });
  const dados = (await res.json().catch(() => ({}))) as { marca?: MarcaConta; erro?: string };
  if (!res.ok || !dados.marca) throw new Error(dados.erro ?? "Falha ao salvar a marca");
  return dados.marca;
}

/** Mesma regra da API: devolve o valor pronto para gravar ou o motivo da recusa. */
function normalizarHandle(bruto: string): { ok: true; valor: string } | { ok: false; erro: string } {
  const limpo = bruto.trim().toLowerCase();
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
  return { ok: true, valor: `@${semArroba}` };
}

type Estado = "ocioso" | "salvando" | "salvo" | "erro";

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [handle, setHandle] = useState("");
  const [avatar, setAvatar] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [estado, setEstado] = useState<Estado>("ocioso");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const ok = await garantirSessao();
      if (!ok) {
        router.replace("/login?de=/configuracoes");
        return;
      }
      try {
        const marca = await lerMarca();
        if (cancelado) return;
        setNome(marca.nome ?? "");
        setHandle(marca.handle ?? "");
        setAvatar(marca.avatar_url ?? "");
      } catch (e) {
        if (!cancelado) setErro(e instanceof Error ? e.message : "Falha ao carregar a marca");
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [router]);

  /** Prévia da assinatura no mesmo formato do rodapé do card. */
  const assinatura = useMemo(() => {
    const nomeLimpo = nome.trim();
    const normalizado = normalizarHandle(handle);
    const arroba = normalizado.ok ? normalizado.valor : handle.trim();
    if (!nomeLimpo && !arroba) return "";
    return [nomeLimpo, arroba].filter(Boolean).join(" · ");
  }, [nome, handle]);

  async function salvar(marcaNome: string | null) {
    setErro(null);
    const normalizado = normalizarHandle(handle);
    if (!normalizado.ok) {
      setErro(normalizado.erro);
      setEstado("erro");
      return;
    }

    setEstado("salvando");
    try {
      const marca = await gravarMarca({
        marca_nome: marcaNome ?? "",
        marca_handle: normalizado.valor,
        marca_avatar_url: avatar.trim(),
      });
      setNome(marca.nome ?? "");
      setHandle(marca.handle ?? "");
      setAvatar(marca.avatar_url ?? "");
      setEstado("salvo");
    } catch (e) {
      setEstado("erro");
      setErro(e instanceof Error ? e.message : "Falha ao salvar a marca");
    }
  }

  const ocupado = estado === "salvando";

  const campoEstilo = (invalido = false) =>
    ({
      border: `1px solid ${invalido ? COR.erro : COR.borda}`,
      color: COR.tinta,
      // anel de foco na cor da marca, como nos outros formulários do produto
      ["--tw-ring-color" as string]: COR.acao,
    }) as const;

  return (
    <main className="min-h-screen w-full" style={{ backgroundColor: COR.fundo }}>
      <TopoApp ativo="config" />

      <div className="mx-auto w-full max-w-[1100px] px-4 pb-24 pt-6 sm:px-6">
        <header className="mb-6">
          <h1 className="text-[26px] font-bold leading-tight sm:text-[30px]" style={{ color: COR.tinta }}>
            Configurações
          </h1>
          <p className="mt-1 max-w-[560px] text-[14px]" style={{ color: COR.suave }}>
            A assinatura que sai nos cards e as chaves de IA usadas nas suas gerações.
          </p>
        </header>

        <div className="grid gap-4">
          <section
            aria-labelledby="assinatura-titulo"
            className="rounded-2xl bg-white p-4 sm:p-5"
            style={{ border: `1px solid ${COR.borda}` }}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="assinatura-titulo" className="text-[15px] font-semibold" style={{ color: COR.tinta }}>
                Sua assinatura
              </h2>
              <span className="text-[12px]" style={{ color: COR.fraco }}>
                Aplicada a todo carrossel novo
              </span>
            </div>
            <p className="mt-1 text-[13px]" style={{ color: COR.suave }}>
              Deixe em branco para assinar sem nome. Carrossel antigo mantém a assinatura de quando
              foi criado.
            </p>

            {carregando ? (
              <div className="mt-4 grid gap-2" aria-busy="true" aria-live="polite">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-11 animate-pulse rounded-xl"
                    style={{ backgroundColor: "#EEF1F4" }}
                  />
                ))}
                <span className="sr-only">Carregando sua assinatura</span>
              </div>
            ) : (
              <form
                className="mt-4 grid gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void salvar(nome.trim());
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5">
                    <span className="text-[13px] font-medium" style={{ color: COR.tinta }}>
                      Nome no slide
                    </span>
                    <input
                      value={nome}
                      maxLength={60}
                      placeholder="Ex.: Studio Lima"
                      onChange={(e) => {
                        setNome(e.target.value);
                        setEstado("ocioso");
                      }}
                      className="h-11 w-full rounded-xl px-3 text-[14px] outline-none focus:ring-2"
                      style={campoEstilo()}
                    />
                    <span className="text-[12px]" style={{ color: COR.fraco }}>
                      Aparece na assinatura do rodapé.
                    </span>
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-[13px] font-medium" style={{ color: COR.tinta }}>
                      @ do perfil
                    </span>
                    <input
                      value={handle}
                      placeholder="@seuperfil"
                      autoCapitalize="none"
                      spellCheck={false}
                      aria-invalid={erro ? true : undefined}
                      onChange={(e) => {
                        setHandle(e.target.value);
                        setEstado("ocioso");
                        setErro(null);
                      }}
                      onBlur={() => {
                        const normalizado = normalizarHandle(handle);
                        if (normalizado.ok) setHandle(normalizado.valor);
                      }}
                      className="h-11 w-full rounded-xl px-3 text-[14px] outline-none focus:ring-2"
                      style={campoEstilo(Boolean(erro))}
                    />
                    <span className="text-[12px]" style={{ color: COR.fraco }}>
                      Minúsculo, sem espaço, um único @ no começo.
                    </span>
                  </label>
                </div>

                <label className="grid gap-1.5">
                  <span className="text-[13px] font-medium" style={{ color: COR.tinta }}>
                    URL do avatar <span style={{ color: COR.fraco }}>(opcional)</span>
                  </span>
                  <input
                    value={avatar}
                    placeholder="https://..."
                    onChange={(e) => {
                      setAvatar(e.target.value);
                      setEstado("ocioso");
                    }}
                    className="h-11 w-full rounded-xl px-3 text-[14px] outline-none focus:ring-2"
                    style={campoEstilo()}
                  />
                </label>

                {/* Prévia real do rodapé: evita preencher campo no escuro. */}
                <div
                  className="rounded-xl px-3 py-2.5"
                  style={{ backgroundColor: "#FFFFFF", border: "1px dashed #C7D2DC" }}
                >
                  <span className="text-[12px] font-medium" style={{ color: COR.suave }}>
                    Como sai no card
                  </span>
                  <p className="mt-1 text-[15px] font-medium" style={{ color: COR.tinta }}>
                    {assinatura || "Sem assinatura: o card não leva nome nem @."}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={ocupado}
                    className="min-h-[44px] rounded-xl px-4 py-2.5 text-[14px] font-semibold text-white transition active:translate-y-px disabled:opacity-60"
                    style={{ backgroundColor: COR.acao }}
                  >
                    {ocupado ? "Salvando..." : "Salvar assinatura"}
                  </button>
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => {
                      const ok = window.confirm(
                        "Remover a assinatura de todos os carrosséis novos? Os já criados não mudam.",
                      );
                      if (!ok) return;
                      setNome("");
                      setHandle("");
                      void salvar("");
                    }}
                    className="min-h-[44px] rounded-xl px-4 py-2.5 text-[14px] font-semibold disabled:opacity-60"
                    style={{ backgroundColor: "#FFFFFF", color: COR.erro, border: `1px solid ${COR.borda}` }}
                  >
                    Remover assinatura
                  </button>
                  <span
                    role="status"
                    aria-live="polite"
                    className="text-[13px] font-semibold"
                    style={{ color: estado === "salvo" ? COR.ok : COR.erro, minHeight: 18 }}
                  >
                    {estado === "salvo" ? "Assinatura salva." : erro ?? ""}
                  </span>
                </div>
              </form>
            )}
          </section>

          <ChavesIA />
        </div>
      </div>
    </main>
  );
}

