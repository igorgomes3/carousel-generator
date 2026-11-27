"use client";

/**
 * Painel do administrador: as chaves de IA do produto.
 *
 * Existe porque o carrossel é SaaS: quem paga a geração é o dono, e o cliente
 * final não configura nada. Antes disto só `OPENAI_API_KEY` no `.env` trocava
 * provedor — o que exigia shell e restart.
 *
 * Regras que a tela respeita:
 *
 * - A chave NUNCA chega ao navegador. O campo já vem vazio, com a máscara do
 *   valor atual como placeholder; deixar em branco mantém o que está lá.
 * - Modelo e base URL são texto comum e aparecem preenchidos, porque não são
 *   segredo e errar o nome do modelo é o problema mais comum.
 * - Só administrador entra. O 403 da API é a autoridade; a tela só explica.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { TopoApp } from "@/components/carrosseis/topo-app";
import { PainelEntrada } from "@/components/admin/painel-entrada";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { carregarUsuario, type UsuarioCarrossel } from "@/lib/auth/sessao";

interface Estado {
  llmBaseUrl: string;
  llmModel: string;
  llmApiKeyMascara: string | null;
  llmApiKeyDaTela: boolean;
  imagemBaseUrl: string;
  imagemModel: string;
  imagemApiKeyMascara: string | null;
  imagemApiKeyDaTela: boolean;
  atualizadoPor: string | null;
  atualizadoEm: string | null;
  origem: { llmApiKey: string; imagemApiKey: string };
  admins: string;
}

const COR = {
  tinta: "#1C1917",
  suave: "#57534E",
  /**
   * `#A8A29E` (o "cinza fraco" do produto) dá ~2,4:1 sobre branco — reprova em
   * texto pequeno e foi lido como "ilegível" na revisão visual. `#6B6660` fica
   * em ~5,4:1 e continua claramente secundário em relação à tinta.
   */
  fraco: "#6B6660",
  linha: "#E7E5E4",
  /** Mesmo fundo de `/projetos` (`#F5F4F1`): o painel é a mesma aplicação. */
  fundo: "#F5F4F1",
  cartao: "#FFFFFF",
  /** Laranja da marca — só no selo do logo, não é cor de texto. */
  laranja: "#0E7490",
  acento: "#0E7490",
  ok: "#15803D",
  erro: "#B91C1C",
};

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="block text-[12px] font-semibold uppercase tracking-[0.12em]"
      style={{ color: COR.fraco }}
    >
      {children}
    </span>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado | null>(null);
  const [negado, setNegado] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  // Campos editáveis. Chaves começam vazias de propósito.
  const [llmBaseUrl, setLlmBaseUrl] = useState("");
  const [llmModel, setLlmModel] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [imagemBaseUrl, setImagemBaseUrl] = useState("");
  const [imagemModel, setImagemModel] = useState("");
  const [imagemApiKey, setImagemApiKey] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setAviso(null);
    const res = await fetch("/api/admin/config", { cache: "no-store" });
    if (res.status === 403) {
      setNegado(true);
      setCarregando(false);
      return;
    }
    const dados = (await res.json().catch(() => ({}))) as { config?: Estado; erro?: string };
    if (!res.ok || !dados.config) {
      setAviso({ tipo: "erro", texto: dados.erro ?? "Não foi possível carregar a configuração." });
      setCarregando(false);
      return;
    }
    setEstado(dados.config);
    setLlmBaseUrl(dados.config.llmBaseUrl);
    setLlmModel(dados.config.llmModel);
    setImagemBaseUrl(dados.config.imagemBaseUrl);
    setImagemModel(dados.config.imagemModel);
    setCarregando(false);
  }, []);

  useEffect(() => {
    let vivo = true;
    carregarUsuario().then((u) => {
    });
    carregar();
    return () => {
      vivo = false;
    };
  }, [carregar]);

  const alterou = useMemo(() => {
    if (!estado) return false;
    return (
      llmBaseUrl.trim() !== estado.llmBaseUrl ||
      llmModel.trim() !== estado.llmModel ||
      imagemBaseUrl.trim() !== estado.imagemBaseUrl ||
      imagemModel.trim() !== estado.imagemModel ||
      llmApiKey.trim() !== "" ||
      imagemApiKey.trim() !== ""
    );
  }, [estado, llmBaseUrl, llmModel, imagemBaseUrl, imagemModel, llmApiKey, imagemApiKey]);

  async function salvar() {
    if (salvando) return;
    setSalvando(true);
    setAviso(null);

    const corpo: Record<string, string> = {};
    if (estado && llmBaseUrl.trim() !== estado.llmBaseUrl) corpo.llmBaseUrl = llmBaseUrl.trim();
    if (estado && llmModel.trim() !== estado.llmModel) corpo.llmModel = llmModel.trim();
    if (estado && imagemBaseUrl.trim() !== estado.imagemBaseUrl)
      corpo.imagemBaseUrl = imagemBaseUrl.trim();
    if (estado && imagemModel.trim() !== estado.imagemModel) corpo.imagemModel = imagemModel.trim();
    // Chave só vai se foi digitada — vazio significa "manter a atual".
    if (llmApiKey.trim()) corpo.llmApiKey = llmApiKey.trim();
    if (imagemApiKey.trim()) corpo.imagemApiKey = imagemApiKey.trim();

    const res = await fetch("/api/admin/config", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(corpo),
    });
    const dados = (await res.json().catch(() => ({}))) as { erro?: string };

    if (!res.ok) {
      setAviso({ tipo: "erro", texto: dados.erro ?? "Falha ao salvar." });
      setSalvando(false);
      return;
    }

    setLlmApiKey("");
    setImagemApiKey("");
    setAviso({ tipo: "ok", texto: "Configuração salva. Vale para todos os usuários." });
    setSalvando(false);
    carregar();
  }

  if (negado) {
    return (
      <main className="min-h-screen w-full" style={{ backgroundColor: COR.fundo }}>
        <TopoApp ativo="admin" />
        <div className="mx-auto w-full max-w-[1100px] px-4 pb-24 pt-6 sm:px-6">
          <div className="rounded-2xl bg-white p-6" style={{ border: `1px solid ${COR.linha}` }}>
            <h1 className="text-[22px] font-bold" style={{ color: COR.tinta }}>
              Área do administrador
            </h1>
            <p className="mt-2 max-w-[560px] text-[14px]" style={{ color: COR.suave }}>
              Sua conta não administra este produto. Se isso está errado, o e-mail precisa entrar
              em{" "}
              <code className="rounded px-1" style={{ backgroundColor: "#F5F4F1" }}>
                CARROSSEL_ADMINS
              </code>
              .
            </p>
            <Link
              href="/projetos"
              className="mt-4 inline-block text-[14px] font-semibold"
              style={{ color: COR.acento }}
            >
              Voltar para meus projetos
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full" style={{ backgroundColor: COR.fundo }}>
      <TopoApp ativo="admin" />

      <div className="mx-auto w-full max-w-[1100px] px-4 pb-24 pt-6 sm:px-6">
        <header className="mb-6">
          <h1 className="text-[26px] font-bold leading-tight sm:text-[30px]" style={{ color: COR.tinta }}>
            Chaves de IA
          </h1>
          <p className="mt-1 max-w-[560px] text-[14px]" style={{ color: COR.suave }}>
            O que estiver aqui é herdado por todos os usuários. Nenhum cliente configura chave.
          </p>
        </header>

        {aviso ? (
          <p
            className="mb-4 rounded-lg px-3 py-2 text-[13px] font-medium"
            style={{
              backgroundColor: aviso.tipo === "ok" ? "#F0FDF4" : "#FEF2F2",
              color: aviso.tipo === "ok" ? COR.ok : COR.erro,
              border: `1px solid ${aviso.tipo === "ok" ? "#BBF7D0" : "#FECACA"}`,
            }}
          >
            {aviso.texto}
          </p>
        ) : null}

        {carregando ? (
          <p className="text-[14px]" style={{ color: COR.suave }}>
            Carregando…
          </p>
        ) : (
          <div className="space-y-6">
            <PainelEntrada />

            <section className="rounded-2xl bg-white p-4 sm:p-5" style={{ border: `1px solid ${COR.linha}` }}>
              <h2 className="text-[15px] font-semibold" style={{ color: COR.tinta }}>
                Texto (LLM)
              </h2>
              <p className="mt-1 text-[13px]" style={{ color: COR.suave }}>
                Gera a copy dos cards. Origem atual da chave:{" "}
                <strong>{estado?.origem.llmApiKey === "painel" ? "painel" : estado?.origem.llmApiKey === "ambiente" ? "ambiente (.env)" : "nenhuma"}</strong>
                {estado?.llmApiKeyMascara ? ` · ${estado.llmApiKeyMascara}` : ""}
              </p>

              <div className="mt-4 grid gap-3">
                <label className="grid gap-1">
                  <Rotulo>Base URL</Rotulo>
                  <Input
                    value={llmBaseUrl}
                    onChange={(e) => setLlmBaseUrl(e.target.value)}
                    placeholder="http://127.0.0.1:20128/v1"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>
                <label className="grid gap-1">
                  <Rotulo>Modelo</Rotulo>
                  <Input
                    value={llmModel}
                    onChange={(e) => setLlmModel(e.target.value)}
                    placeholder="flash"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>
                <label className="grid gap-1">
                  <Rotulo>Chave de API</Rotulo>
                  <Input
                    type="password"
                    value={llmApiKey}
                    onChange={(e) => setLlmApiKey(e.target.value)}
                    placeholder={estado?.llmApiKeyMascara ?? "cole a chave aqui"}
                    autoComplete="new-password"
                    spellCheck={false}
                  />
                  <span className="text-[12px]" style={{ color: COR.fraco }}>
                    Deixe em branco para manter a atual.
                  </span>
                </label>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-4 sm:p-5" style={{ border: `1px solid ${COR.linha}` }}>
              <h2 className="text-[15px] font-semibold" style={{ color: COR.tinta }}>
                Imagem
              </h2>
              <p className="mt-1 text-[13px]" style={{ color: COR.suave }}>
                Gera as capas e cenas dos cards. Origem atual da chave:{" "}
                <strong>{estado?.origem.imagemApiKey === "painel" ? "painel" : estado?.origem.imagemApiKey === "ambiente" ? "ambiente (.env)" : "nenhuma"}</strong>
                {estado?.imagemApiKeyMascara ? ` · ${estado.imagemApiKeyMascara}` : ""}
              </p>

              <div className="mt-4 grid gap-3">
                <label className="grid gap-1">
                  <Rotulo>Base URL</Rotulo>
                  <Input
                    value={imagemBaseUrl}
                    onChange={(e) => setImagemBaseUrl(e.target.value)}
                    placeholder="http://127.0.0.1:20128/v1"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>
                <label className="grid gap-1">
                  <Rotulo>Modelo</Rotulo>
                  <Input
                    value={imagemModel}
                    onChange={(e) => setImagemModel(e.target.value)}
                    placeholder="cx/gpt-image-2.5"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>
                <label className="grid gap-1">
                  <Rotulo>Chave de API</Rotulo>
                  <Input
                    type="password"
                    value={imagemApiKey}
                    onChange={(e) => setImagemApiKey(e.target.value)}
                    placeholder={estado?.imagemApiKeyMascara ?? "cole a chave aqui"}
                    autoComplete="new-password"
                    spellCheck={false}
                  />
                  <span className="text-[12px]" style={{ color: COR.fraco }}>
                    Deixe em branco para manter a atual.
                  </span>
                </label>
              </div>
            </section>

            <div className="flex flex-wrap items-center gap-3">
              {/*
                Botão com cor própria: o `primary` do tema é lavanda clara e o
                rótulo ficava quase invisível. `disabled:opacity-100` porque o
                Button do tema aplica opacity-50 no desabilitado e o cinza sobre
                cinza virava texto ilegível na única ação da tela.
              */}
              <Button
                onClick={salvar}
                disabled={salvando || !alterou}
                className="min-h-[44px] rounded-xl px-4 py-2.5 text-[14px] disabled:opacity-100"
                style={
                  salvando || !alterou
                    ? {
                        backgroundColor: "#E7E5E4",
                        color: "#44403C",
                        border: "1px solid #D6D3D1",
                        // Inline porque o `disabled:opacity-50` do Button vence a
                        // classe utilitária: sem isto o rótulo fica ~50% e some.
                        opacity: 1,
                      }
                    : { backgroundColor: "#1C1917", color: "#FFFFFF", opacity: 1 }
                }
              >
                {salvando ? "Salvando…" : "Salvar configuração"}
              </Button>
              <button
                type="button"
                onClick={() => {
                  void carregar();
                  setLlmApiKey("");
                  setImagemApiKey("");
                  router.refresh();
                }}
                disabled={salvando}
                className="min-h-[44px] rounded-xl px-4 py-2.5 text-[14px] font-semibold disabled:opacity-60"
                style={{ backgroundColor: "#FFFFFF", color: COR.tinta, border: `1px solid ${COR.linha}` }}
              >
                Descartar mudanças
              </button>
              <span className="text-[12px]" style={{ color: COR.fraco }}>
                {estado?.atualizadoEm
                  ? `Última alteração: ${new Date(estado.atualizadoEm).toLocaleString("pt-BR")}${estado.atualizadoPor ? ` por ${estado.atualizadoPor}` : ""}`
                  : "Nada salvo pelo painel ainda — os valores vêm do ambiente."}
              </span>
            </div>

          </div>
        )}
      </div>
    </main>
  );
}

