"use client";

/**
 * Bloco "Entrada" do painel admin: quem pode criar conta.
 *
 * Reúne as três decisões de 25/11/2026 num lugar só:
 * - fechar/abrir o cadastro público (a API respeita, não só a tela);
 * - exigir código de convite mantendo a porta aberta;
 * - criar a conta direto, quando o admin já tem os dados da pessoa.
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

interface Convite {
  codigo: string;
  criadoEm: string;
  expiraEm: string;
  usadoPor: string | null;
  nota: string | null;
  valido: boolean;
}

interface ConfigEntrada {
  cadastroAberto: boolean;
  exigirConvite: boolean;
  atualizadoEm: string | null;
}

export function PainelEntrada() {
  const [config, setConfig] = useState<ConfigEntrada | null>(null);
  const [convites, setConvites] = useState<Convite[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [nota, setNota] = useState("");
  const [dias, setDias] = useState("7");

  const carregar = useCallback(async () => {
    const res = await fetch("/api/admin/produto", { cache: "no-store" });
    const dados = (await res.json().catch(() => ({}))) as {
      config?: ConfigEntrada;
      convites?: Convite[];
      erro?: string;
    };
    if (res.ok && dados.config) {
      setConfig(dados.config);
      setConvites(dados.convites ?? []);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function alternar(campo: "cadastroAberto" | "exigirConvite", valor: boolean) {
    setOcupado(true);
    setAviso(null);
    const res = await fetch("/api/admin/produto", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ [campo]: valor }),
    });
    const dados = (await res.json().catch(() => ({}))) as { config?: ConfigEntrada; erro?: string };
    if (!res.ok || !dados.config) {
      setAviso({ tipo: "erro", texto: dados.erro ?? "Não foi possível salvar." });
    } else {
      setConfig(dados.config);
      setAviso({
        tipo: "ok",
        texto:
          campo === "cadastroAberto"
            ? valor
              ? "Cadastro público aberto."
              : "Cadastro público fechado — só entra quem tiver convite."
            : valor
              ? "Cadastro agora exige código de convite."
              : "Cadastro não exige mais convite.",
      });
    }
    setOcupado(false);
    void carregar();
  }

  async function criarConta() {
    setOcupado(true);
    setAviso(null);
    const res = await fetch("/api/admin/usuarios", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, senha, nome }),
    });
    const dados = (await res.json().catch(() => ({}))) as { erro?: string };
    if (!res.ok) {
      setAviso({ tipo: "erro", texto: dados.erro ?? "Não foi possível criar a conta." });
    } else {
      setAviso({ tipo: "ok", texto: `Conta criada para ${email}. Passe a senha para a pessoa.` });
      setEmail("");
      setSenha("");
      setNome("");
    }
    setOcupado(false);
  }

  async function gerarConvite() {
    setOcupado(true);
    setAviso(null);
    const res = await fetch("/api/admin/convites", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dias: Number(dias), nota }),
    });
    const dados = (await res.json().catch(() => ({}))) as { convite?: Convite; erro?: string };
    if (!res.ok || !dados.convite) {
      setAviso({ tipo: "erro", texto: dados.erro ?? "Não foi possível gerar o convite." });
    } else {
      setAviso({ tipo: "ok", texto: `Convite ${dados.convite.codigo} criado.` });
      setNota("");
      void carregar();
    }
    setOcupado(false);
  }

  return (
    <section className="rounded-2xl bg-white p-4 sm:p-5" style={{ border: `1px solid ${COR.linha}` }}>
      <h2 className="text-[15px] font-semibold" style={{ color: COR.tinta }}>
        Entrada de usuários
      </h2>
      <p className="mt-1 text-[13px]" style={{ color: COR.suave }}>
        Quem pode criar conta. A regra vale na API, não só nesta tela.
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

      <div className="mt-4 flex flex-wrap gap-4">
        <label className="flex items-start gap-2 text-[14px]" style={{ color: COR.tinta }}>
          <input
            type="checkbox"
            checked={config?.cadastroAberto ?? true}
            disabled={ocupado}
            onChange={(e) => void alternar("cadastroAberto", e.target.checked)}
            className="mt-0.5 size-4"
            style={{ accentColor: COR.acao }}
          />
          <span>
            Cadastro público aberto
            <span className="block text-[12px]" style={{ color: COR.fraco }}>
              {(config?.cadastroAberto ?? true)
                ? "Ligado: qualquer pessoa cria conta em /cadastro."
                : "Desligado: a tela de cadastro fica fechada e a API recusa."}
            </span>
          </span>
        </label>

        <label className="flex items-start gap-2 text-[14px]" style={{ color: COR.tinta }}>
          <input
            type="checkbox"
            checked={config?.exigirConvite ?? false}
            disabled={ocupado}
            onChange={(e) => void alternar("exigirConvite", e.target.checked)}
            className="mt-0.5 size-4"
            style={{ accentColor: COR.acao }}
          />
          <span>
            Exigir código de convite
            <span className="block text-[12px]" style={{ color: COR.fraco }}>
              {(config?.exigirConvite ?? false)
                ? "Ligado: cadastro aberto, mas só com código válido."
                : "Desligado: cadastro sem código (ou fechado, se o de cima estiver off)."}
            </span>
          </span>
        </label>
      </div>

      <div className="mt-5 grid gap-3 border-t pt-4" style={{ borderColor: COR.linha }}>
        <h3 className="text-[14px] font-semibold" style={{ color: COR.tinta }}>
          Criar conta direto
        </h3>
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome (opcional)"
            className="h-10 rounded-lg px-3 text-[14px]"
            style={{ border: `1px solid ${COR.linha}` }}
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@dominio.com"
            className="h-10 rounded-lg px-3 text-[14px]"
            style={{ border: `1px solid ${COR.linha}` }}
          />
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="senha (8+ caracteres)"
            className="h-10 rounded-lg px-3 text-[14px]"
            style={{ border: `1px solid ${COR.linha}` }}
          />
        </div>
        <button
          type="button"
          onClick={() => void criarConta()}
          disabled={ocupado || !email.trim() || senha.length < 8}
          className="w-fit rounded-lg px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: "#1C1917" }}
        >
          Criar conta
        </button>
      </div>

      <div className="mt-5 grid gap-3 border-t pt-4" style={{ borderColor: COR.linha }}>
        <h3 className="text-[14px] font-semibold" style={{ color: COR.tinta }}>
          Convites
        </h3>
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1">
            <span className="text-[12px]" style={{ color: COR.fraco }}>
              Nota (para quem)
            </span>
            <input
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="ex.: canalothor"
              className="h-10 w-56 rounded-lg px-3 text-[14px]"
              style={{ border: `1px solid ${COR.linha}` }}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-[12px]" style={{ color: COR.fraco }}>
              Validade (dias)
            </span>
            <input
              value={dias}
              onChange={(e) => setDias(e.target.value)}
              inputMode="numeric"
              className="h-10 w-24 rounded-lg px-3 text-[14px]"
              style={{ border: `1px solid ${COR.linha}` }}
            />
          </label>
          <button
            type="button"
            onClick={() => void gerarConvite()}
            disabled={ocupado}
            className="rounded-lg px-4 py-2.5 text-[13px] font-semibold disabled:opacity-50"
            style={{ backgroundColor: "#FFFFFF", color: COR.tinta, border: `1px solid ${COR.linha}` }}
          >
            Gerar convite
          </button>
        </div>

        {convites.length > 0 ? (
          <ul className="grid gap-1">
            {convites.slice(0, 8).map((c) => (
              <li
                key={c.codigo}
                className="flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-[13px]"
                style={{ backgroundColor: "#F5F4F1", color: COR.tinta }}
              >
                <code className="font-semibold tracking-wider">{c.codigo}</code>
                <span style={{ color: corDoConvite(c) }}>
                  {c.usadoPor ? "usado" : c.valido ? "válido" : "expirado"}
                </span>
                <span style={{ color: COR.fraco }}>
                  expira {new Date(c.expiraEm).toLocaleDateString("pt-BR")}
                  {c.nota ? ` · ${c.nota}` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[12px]" style={{ color: COR.fraco }}>
            Nenhum convite gerado ainda.
          </p>
        )}
      </div>
    </section>
  );
}

function corDoConvite(c: Convite): string {
  if (c.usadoPor) return COR.fraco;
  return c.valido ? COR.ok : COR.erro;
}
