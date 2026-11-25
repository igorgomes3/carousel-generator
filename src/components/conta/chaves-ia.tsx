"use client";

/**
 * "Minhas chaves de IA" nas configurações da conta.
 *
 * Pedido de 25/11/2026 (usuário sugeriu nas configurações): quem quiser custear o
 * próprio consumo define a chave aqui; ela sobrepõe a do administrador nas
 * gerações DESSA conta. Campo vazio = herdar a global — por isso a tela mostra de
 * onde vem a chave em uso, em vez de fingir que "vazio" significa "sem chave".
 *
 * A chave nunca é devolvida pelo servidor: só a máscara.
 */
import { useCallback, useEffect, useState } from "react";

const COR = {
  tinta: "#1C1917",
  suave: "#57534E",
  fraco: "#6B6660",
  linha: "#E7E5E4",
  ok: "#166534",
  erro: "#B91C1C",
  acao: "#C2410C",
};

interface Estado {
  minhas: {
    llmBaseUrl: string | null;
    llmModel: string | null;
    llmApiKeyMascara: string | null;
    imagemBaseUrl: string | null;
    imagemModel: string | null;
    imagemApiKeyMascara: string | null;
  };
  efetiva: {
    llmBaseUrl: string;
    llmModel: string;
    llmApiKeyMascara: string | null;
    imagemBaseUrl: string;
    imagemModel: string;
    imagemApiKeyMascara: string | null;
  };
  origem: { llmApiKey: string; imagemApiKey: string };
  usandoPropria: boolean;
}

export function ChavesIA() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [llmBaseUrl, setLlmBaseUrl] = useState("");
  const [llmModel, setLlmModel] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [imagemBaseUrl, setImagemBaseUrl] = useState("");
  const [imagemModel, setImagemModel] = useState("");
  const [imagemApiKey, setImagemApiKey] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const carregar = useCallback(async () => {
    const res = await fetch("/api/usuario/chaves", { cache: "no-store" });
    const dados = (await res.json().catch(() => ({}))) as Estado & { erro?: string };
    if (!res.ok) return;
    setEstado(dados);
    setLlmBaseUrl(dados.minhas.llmBaseUrl ?? "");
    setLlmModel(dados.minhas.llmModel ?? "");
    setImagemBaseUrl(dados.minhas.imagemBaseUrl ?? "");
    setImagemModel(dados.minhas.imagemModel ?? "");
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function salvar(apagar?: "llm" | "imagem") {
    setOcupado(true);
    setAviso(null);
    const corpo: Record<string, string> = {};
    if (apagar === "llm") {
      corpo.llmApiKey = "__apagar__";
      corpo.llmBaseUrl = "__apagar__";
      corpo.llmModel = "__apagar__";
    } else if (apagar === "imagem") {
      corpo.imagemApiKey = "__apagar__";
      corpo.imagemBaseUrl = "__apagar__";
      corpo.imagemModel = "__apagar__";
    } else {
      if (llmBaseUrl.trim()) corpo.llmBaseUrl = llmBaseUrl.trim();
      if (llmModel.trim()) corpo.llmModel = llmModel.trim();
      if (llmApiKey.trim()) corpo.llmApiKey = llmApiKey.trim();
      if (imagemBaseUrl.trim()) corpo.imagemBaseUrl = imagemBaseUrl.trim();
      if (imagemModel.trim()) corpo.imagemModel = imagemModel.trim();
      if (imagemApiKey.trim()) corpo.imagemApiKey = imagemApiKey.trim();
    }

    const res = await fetch("/api/usuario/chaves", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(corpo),
    });
    const dados = (await res.json().catch(() => ({}))) as { erro?: string };
    if (!res.ok) {
      setAviso({ tipo: "erro", texto: dados.erro ?? "Não foi possível salvar." });
    } else {
      setLlmApiKey("");
      setImagemApiKey("");
      setAviso({
        tipo: "ok",
        texto:
          apagar === "llm" || apagar === "imagem"
            ? "Chave removida — esta parte volta a usar a do administrador."
            : "Chaves salvas. Valem para as suas gerações.",
      });
      void carregar();
    }
    setOcupado(false);
  }

  function textoOrigem(origem: string): string {
    if (origem === "usuario") return "sua chave";
    if (origem === "global") return "chave do administrador";
    return "sem chave configurada";
  }

  return (
    <section className="rounded-2xl bg-white p-4 sm:p-5" style={{ border: `1px solid ${COR.linha}` }}>
      <h2 className="text-[15px] font-semibold" style={{ color: COR.tinta }}>
        Minhas chaves de IA
      </h2>
      <p className="mt-1 text-[13px]" style={{ color: COR.suave }}>
        Opcional. Sem chave aqui, você usa a do administrador. Com chave sua, o consumo é seu.
      </p>

      {aviso ? (
        <p
          className="mt-3 rounded-lg px-3 py-2 text-[13px] font-semibold"
          style={{
            backgroundColor: aviso.tipo === "ok" ? "#F0FDF4" : "#FEF2F2",
            color: aviso.tipo === "ok" ? COR.ok : COR.erro,
            border: `1px solid ${aviso.tipo === "ok" ? "#BBF7D0" : "#FECACA"}`,
          }}
        >
          {aviso.texto}
        </p>
      ) : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <h3 className="text-[14px] font-semibold" style={{ color: COR.tinta }}>
            Texto
          </h3>
          <p className="text-[12px]" style={{ color: COR.fraco }}>
            Em uso: {textoOrigem(estado?.origem.llmApiKey ?? "nenhuma")}
            {estado?.efetiva.llmApiKeyMascara ? ` · ${estado.efetiva.llmApiKeyMascara}` : ""}
          </p>
          <input
            value={llmBaseUrl}
            onChange={(e) => setLlmBaseUrl(e.target.value)}
            placeholder={estado?.efetiva.llmBaseUrl ?? "https://api.exemplo.com/v1"}
            className="h-10 rounded-lg px-3 text-[13px]"
            style={{ border: `1px solid ${COR.linha}` }}
          />
          <input
            value={llmModel}
            onChange={(e) => setLlmModel(e.target.value)}
            placeholder={estado?.efetiva.llmModel ?? "modelo"}
            className="h-10 rounded-lg px-3 text-[13px]"
            style={{ border: `1px solid ${COR.linha}` }}
          />
          <input
            type="password"
            value={llmApiKey}
            onChange={(e) => setLlmApiKey(e.target.value)}
            placeholder={estado?.minhas.llmApiKeyMascara ?? "cole sua chave de texto"}
            className="h-10 rounded-lg px-3 text-[13px]"
            style={{ border: `1px solid ${COR.linha}` }}
            autoComplete="new-password"
          />
          {estado?.minhas.llmApiKeyMascara ? (
            <button
              type="button"
              onClick={() => void salvar("llm")}
              disabled={ocupado}
              className="w-fit text-[12px] font-semibold underline"
              style={{ color: COR.acao }}
            >
              Remover minha chave de texto
            </button>
          ) : null}
        </div>

        <div className="grid gap-2">
          <h3 className="text-[14px] font-semibold" style={{ color: COR.tinta }}>
            Imagem
          </h3>
          <p className="text-[12px]" style={{ color: COR.fraco }}>
            Em uso: {textoOrigem(estado?.origem.imagemApiKey ?? "nenhuma")}
            {estado?.efetiva.imagemApiKeyMascara ? ` · ${estado.efetiva.imagemApiKeyMascara}` : ""}
          </p>
          <input
            value={imagemBaseUrl}
            onChange={(e) => setImagemBaseUrl(e.target.value)}
            placeholder={estado?.efetiva.imagemBaseUrl ?? "https://api.exemplo.com/v1"}
            className="h-10 rounded-lg px-3 text-[13px]"
            style={{ border: `1px solid ${COR.linha}` }}
          />
          <input
            value={imagemModel}
            onChange={(e) => setImagemModel(e.target.value)}
            placeholder={estado?.efetiva.imagemModel ?? "modelo de imagem"}
            className="h-10 rounded-lg px-3 text-[13px]"
            style={{ border: `1px solid ${COR.linha}` }}
          />
          <input
            type="password"
            value={imagemApiKey}
            onChange={(e) => setImagemApiKey(e.target.value)}
            placeholder={estado?.minhas.imagemApiKeyMascara ?? "cole sua chave de imagem"}
            className="h-10 rounded-lg px-3 text-[13px]"
            style={{ border: `1px solid ${COR.linha}` }}
            autoComplete="new-password"
          />
          {estado?.minhas.imagemApiKeyMascara ? (
            <button
              type="button"
              onClick={() => void salvar("imagem")}
              disabled={ocupado}
              className="w-fit text-[12px] font-semibold underline"
              style={{ color: COR.acao }}
            >
              Remover minha chave de imagem
            </button>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={() => void salvar()}
        disabled={ocupado}
        className="mt-4 rounded-lg px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
        style={{ backgroundColor: "#1C1917" }}
      >
        {ocupado ? "Salvando…" : "Salvar minhas chaves"}
      </button>
    </section>
  );
}
