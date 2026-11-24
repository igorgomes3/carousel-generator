"use client";

/**
 * `/autopilot` — a entrevista que liga o post diário.
 *
 * Quatro perguntas, uma por bloco, na ordem em que a pessoa pensa: o que vende
 * (nicho), para quem, o que oferece, e como fala. O @ do Instagram entra como
 * campo visual e NÃO é lido: scraping em IP de datacenter é bloqueado, e a bio
 * não diz objetivo de negócio — a entrevista é a fonte de verdade (decisão de
 * 24/11/2026 com o critic).
 *
 * Estados que a tela precisa deixar honestos:
 * - entrevista incompleta → diz o que falta, sem ligar o autopilot;
 * - salvo mas não liberado → explica que um administrador libera (custo);
 * - liberado e ativo → mostra o último status e o que fazer se falhou.
 */
import { useCallback, useEffect, useState } from "react";

import { MenuConta } from "@/components/conta/menu-conta";
import { carregarUsuario, type UsuarioCarrossel } from "@/lib/auth/sessao";

const COR = {
  tinta: "#1C1917",
  suave: "#57534E",
  fraco: "#6B6660",
  linha: "#E7E5E4",
  fundo: "#F5F4F1",
  laranja: "#F4511E",
  acao: "#C2410C",
  ok: "#166534",
  erro: "#B91C1C",
};

interface Briefing {
  nicho: string;
  publico: string;
  oferta: string;
  tom: string;
  pilares: string[];
  instagram?: string;
}

interface Perfil {
  ativo: boolean;
  liberado: boolean;
  briefing: Briefing;
  postsSemAbrir: number;
  ultimaExecucaoEm: string | null;
  ultimoStatus: string | null;
  ultimoErro: string | null;
}

const PERGUNTAS: { campo: keyof Briefing; titulo: string; ajuda: string; exemplo: string }[] = [
  {
    campo: "nicho",
    titulo: "1. O que você vende, em uma frase?",
    ajuda: "O serviço ou produto principal. É isso que o post precisa fazer o leitor considerar.",
    exemplo: "Consultoria de precificação para agências de social media",
  },
  {
    campo: "publico",
    titulo: "2. Para quem exatamente?",
    ajuda: "Quem paga, com o detalhe que separa esse público dos outros.",
    exemplo: "Dono de agência pequena, 1 a 5 pessoas, que cobra por pacote fechado",
  },
  {
    campo: "oferta",
    titulo: "3. Qual é a oferta (e o problema que ela resolve)?",
    ajuda: "O que a pessoa compra e qual dor real deixa de sentir.",
    exemplo: "Mentoria de 6 semanas para reprecificar a carteira sem perder cliente",
  },
  {
    campo: "tom",
    titulo: "4. Como você fala com esse público?",
    ajuda: "Tom de voz. Se não souber, escreva 'direto e prático'.",
    exemplo: "Direto, sem jargão, com exemplo de planilha",
  },
];

export default function AutopilotPage() {
  const [usuario, setUsuario] = useState<UsuarioCarrossel | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [podeLiberar, setPodeLiberar] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const [nicho, setNicho] = useState("");
  const [publico, setPublico] = useState("");
  const [oferta, setOferta] = useState("");
  const [tom, setTom] = useState("");
  const [pilares, setPilares] = useState("");
  const [instagram, setInstagram] = useState("");

  /**
   * Conversa: o jeito fácil de preencher o briefing. Uma chamada de LLM por
   * mensagem (a rota devolve o briefing atualizado e já grava no perfil), então
   * nada de polling nem de conversa infinita.
   */
  const [mensagens, setMensagens] = useState<{ papel: "usuario" | "agente"; texto: string }[]>([
    {
      papel: "agente",
      texto:
        "Me conta em duas frases: o que você vende e para quem. Eu organizo o resto e já deixo o post diário configurado.",
    },
  ]);
  const [entrada, setEntrada] = useState("");
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const res = await fetch("/api/autopilot", { cache: "no-store" });
    const dados = (await res.json().catch(() => ({}))) as {
      perfil?: Perfil | null;
      podeLiberar?: boolean;
      erro?: string;
    };
    if (res.ok) {
      setPerfil(dados.perfil ?? null);
      setPodeLiberar(Boolean(dados.podeLiberar));
      if (dados.perfil) {
        setNicho(dados.perfil.briefing.nicho ?? "");
        setPublico(dados.perfil.briefing.publico ?? "");
        setOferta(dados.perfil.briefing.oferta ?? "");
        setTom(dados.perfil.briefing.tom ?? "");
        setPilares((dados.perfil.briefing.pilares ?? []).join(", "));
        setInstagram(dados.perfil.briefing.instagram ?? "");
      }
    } else {
      setAviso({ tipo: "erro", texto: dados.erro ?? "Não foi possível carregar." });
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    let vivo = true;
    carregarUsuario().then((u) => {
      if (vivo) setUsuario(u);
    });
    void carregar();
    return () => {
      vivo = false;
    };
  }, [carregar]);

  async function salvar(ativo?: boolean) {
    setSalvando(true);
    setAviso(null);
    const res = await fetch("/api/autopilot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        briefing: {
          nicho,
          publico,
          oferta,
          tom,
          instagram,
          pilares: pilares
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean),
        },
        ativo,
      }),
    });
    const dados = (await res.json().catch(() => ({}))) as { erro?: string };
    if (!res.ok) {
      setAviso({ tipo: "erro", texto: dados.erro ?? "Não foi possível salvar." });
      setSalvando(false);
      return;
    }
    setAviso({
      tipo: "ok",
      texto:
        ativo === false
          ? "Piloto automático pausado."
          : ativo === true
            ? "Piloto automático ativo. O post do dia é gerado de madrugada."
            : "Entrevista salva.",
    });
    setSalvando(false);
    void carregar();
  }

  async function conversar() {
    const texto = entrada.trim();
    if (!texto || enviando) return;
    const proximas = [...mensagens, { papel: "usuario" as const, texto }];
    setMensagens(proximas);
    setEntrada("");
    setEnviando(true);
    setAviso(null);

    const res = await fetch("/api/autopilot/conversa", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mensagens: proximas }),
    });
    const dados = (await res.json().catch(() => ({}))) as {
      resposta?: string;
      briefing?: Briefing;
      completo?: boolean;
      erro?: string;
    };

    if (!res.ok || !dados.resposta) {
      setAviso({ tipo: "erro", texto: dados.erro ?? "Não consegui responder agora." });
      setEnviando(false);
      return;
    }

    setMensagens((atual) => [...atual, { papel: "agente", texto: dados.resposta as string }]);
    if (dados.briefing) {
      const b = dados.briefing;
      setNicho(b.nicho ?? "");
      setPublico(b.publico ?? "");
      setOferta(b.oferta ?? "");
      setTom(b.tom ?? "");
      setPilares((b.pilares ?? []).join(", "));
      setInstagram(b.instagram ?? "");
    }
    if (dados.completo) {
      setAviso({ tipo: "ok", texto: "Briefing completo. Confira abaixo e ative o piloto automático." });
      void carregar();
    }
    setEnviando(false);
  }

  const completo = Boolean(nicho.trim() && publico.trim() && oferta.trim());
  const ativo = Boolean(perfil?.ativo && perfil?.liberado);

  return (
    <main className="min-h-screen w-full" style={{ backgroundColor: COR.fundo }}>
      <header
        className="sticky top-0 z-20 border-b"
        style={{ backgroundColor: "#FFFFFFEE", borderColor: COR.linha, backdropFilter: "blur(8px)" }}
      >
        <div className="mx-auto flex h-14 w-full max-w-[1100px] items-center justify-between px-4 sm:px-6">
          <a href="/" className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="grid h-8 w-8 place-items-center rounded-lg text-[15px] font-bold text-white"
              style={{ backgroundColor: COR.laranja }}
            >
              C
            </span>
            <span className="hidden text-[16px] font-bold tracking-tight sm:inline" style={{ color: COR.tinta }}>
              Carrossel<span style={{ color: COR.laranja }}>IA</span>
            </span>
          </a>
          <div className="flex items-center gap-2">
            <a
              href="/projetos"
              className="rounded-lg px-3 py-2 text-[13px] font-semibold"
              style={{ color: COR.tinta, border: `1px solid ${COR.linha}`, backgroundColor: "#fff" }}
            >
              Meus projetos
            </a>
            <a
              href="/"
              className="rounded-lg px-3 py-2 text-[13px] font-semibold"
              style={{ color: COR.tinta, border: `1px solid ${COR.linha}`, backgroundColor: "#fff" }}
            >
              <span className="sm:hidden">Estúdio</span>
              <span className="hidden sm:inline">Ir ao estúdio</span>
            </a>
            <MenuConta />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[860px] px-4 pb-24 pt-6 sm:px-6">
        <h1 className="text-[26px] font-bold leading-tight sm:text-[30px]" style={{ color: COR.tinta }}>
          Post diário automático
        </h1>
        <p className="mt-1 max-w-[560px] text-[14px]" style={{ color: COR.suave }}>
          Quatro respostas obrigatórias e uma opcional sobre o seu perfil. Todo dia sai um carrossel
          novo, com legenda e hashtags, pronto para baixar.
        </p>

        {aviso ? (
          <p
            className="mt-4 rounded-xl px-3 py-2 text-[13px] font-semibold"
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
          <p className="mt-4 text-[14px]" style={{ color: COR.suave }}>
            Carregando…
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {/*
              Conversa primeiro, formulário depois. Quem chega de fora não sabe
              preencher "nicho" e "público"; contar o negócio é natural e o agente
              organiza. O formulário continua visível para conferir/ajustar — é o
              que dá controle a quem já sabe o que quer.
            */}
            <section
              aria-labelledby="conversa-titulo"
              className="rounded-2xl bg-white p-4 sm:p-5"
              style={{ border: `1px solid ${COR.linha}` }}
            >
              <h2 id="conversa-titulo" className="text-[15px] font-semibold" style={{ color: COR.tinta }}>
                Conte do seu negócio
              </h2>
              <p className="mt-1 text-[13px]" style={{ color: COR.suave }}>
                Conversa com o agente: ele pergunta o que falta e preenche o briefing abaixo.
              </p>

              <ol className="mt-3 flex flex-col gap-2" aria-live="polite">
                {mensagens.map((m, i) => (
                  <li
                    key={i}
                    className="max-w-[95%] rounded-xl px-3 py-2 text-[14px] leading-relaxed"
                    style={
                      m.papel === "agente"
                        ? { backgroundColor: "#F5F4F1", color: COR.tinta }
                        : { backgroundColor: "#1C1917", color: "#FFFFFF", marginLeft: "auto" }
                    }
                  >
                    {m.texto}
                  </li>
                ))}
              </ol>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <textarea
                  value={entrada}
                  onChange={(e) => setEntrada(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void conversar();
                    }
                  }}
                  rows={2}
                  placeholder="Ex.: vendo mentoria de precificação para agências pequenas de social media"
                  aria-label="Sua mensagem para o agente"
                  className="min-h-[44px] flex-1 resize-y rounded-xl px-3 py-2 text-[14px]"
                  style={{ border: `1px solid ${COR.linha}`, color: COR.tinta }}
                />
                <button
                  type="button"
                  onClick={() => void conversar()}
                  disabled={enviando || !entrada.trim()}
                  className="min-h-[44px] rounded-xl px-4 py-2.5 text-[14px] font-semibold disabled:opacity-60"
                  style={{ backgroundColor: COR.acao, color: "#FFFFFF" }}
                >
                  {enviando ? "Pensando…" : "Enviar"}
                </button>
              </div>
            </section>
            <section className="rounded-2xl bg-white p-4 sm:p-5" style={{ border: `1px solid ${COR.linha}` }}>
              <label className="block text-[12px] font-semibold uppercase tracking-[0.12em]" style={{ color: COR.fraco }}>
                Instagram (opcional)
              </label>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[14px]" style={{ color: COR.fraco }}>
                  @
                </span>
                <input
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value.replace(/^@+/, "").toLowerCase())}
                  placeholder="seuperfil"
                  className="h-11 w-full rounded-lg px-3 text-[14px]"
                  style={{ border: `1px solid ${COR.linha}`, color: COR.tinta }}
                />
              </div>
              <p className="mt-1 text-[12px]" style={{ color: COR.fraco }}>
                Serve só para identificar o perfil. O conteúdo vem das respostas abaixo — o Instagram não
                é lido automaticamente.
              </p>
            </section>

            {PERGUNTAS.map((p) => (
              <section
                key={p.campo}
                className="rounded-2xl bg-white p-4 sm:p-5"
                style={{ border: `1px solid ${COR.linha}` }}
              >
                <label className="block text-[15px] font-semibold" style={{ color: COR.tinta }}>
                  {p.titulo}
                </label>
                <p className="mt-1 text-[13px]" style={{ color: COR.suave }}>
                  {p.ajuda}
                </p>
                <textarea
                  value={String(({ nicho, publico, oferta, tom } as Record<string, string>)[p.campo] ?? "")}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (p.campo === "nicho") setNicho(v);
                    if (p.campo === "publico") setPublico(v);
                    if (p.campo === "oferta") setOferta(v);
                    if (p.campo === "tom") setTom(v);
                  }}
                  rows={2}
                  placeholder={p.exemplo}
                  className="mt-2 w-full resize-y rounded-xl px-3 py-2 text-[14px]"
                  style={{ border: `1px solid ${COR.linha}`, color: COR.tinta }}
                />
              </section>
            ))}

            <section className="rounded-2xl bg-white p-4 sm:p-5" style={{ border: `1px solid ${COR.linha}` }}>
              <label className="block text-[15px] font-semibold" style={{ color: COR.tinta }}>
                5. Temas que você sempre aborda (opcional)
              </label>
              <p className="mt-1 text-[13px]" style={{ color: COR.suave }}>
                Separe por vírgula. Ajuda a manter o conteúdo no seu território.
              </p>
              <input
                value={pilares}
                onChange={(e) => setPilares(e.target.value)}
                placeholder="precificação, proposta comercial, gestão de cliente"
                className="mt-2 h-11 w-full rounded-lg px-3 text-[14px]"
                style={{ border: `1px solid ${COR.linha}`, color: COR.tinta }}
              />
            </section>

            <div className="flex flex-wrap items-center gap-3">
              {/* Estado antes da ação: o botão de pausar sozinho parecia rótulo
                  de status. Com o selo, "ativo" é leitura e "pausar" é ação. */}
              <span
                className="rounded-md px-2 py-1 text-[12px] font-semibold"
                style={
                  ativo
                    ? { backgroundColor: "#F0FDF4", color: COR.ok, border: "1px solid #BBF7D0" }
                    : { backgroundColor: "#F5F4F1", color: COR.suave, border: `1px solid ${COR.linha}` }
                }
              >
                {ativo ? "Piloto automático ativo" : "Piloto automático pausado"}
              </span>
              <button
                type="button"
                onClick={() => void salvar()}
                disabled={salvando || !completo}
                className="min-h-[44px] rounded-xl px-4 py-2.5 text-[14px] font-semibold disabled:opacity-100"
                style={
                  salvando || !completo
                    ? { backgroundColor: "#E7E5E4", color: "#44403C", border: "1px solid #D6D3D1" }
                    : { backgroundColor: "#1C1917", color: "#FFFFFF" }
                }
              >
                {salvando ? "Salvando…" : "Salvar entrevista"}
              </button>

              {ativo ? (
                <button
                  type="button"
                  onClick={() => void salvar(false)}
                  disabled={salvando}
                  className="min-h-[44px] rounded-xl px-4 py-2.5 text-[14px] font-semibold"
                  style={{ backgroundColor: "#FFFFFF", color: COR.erro, border: `1px solid ${COR.linha}` }}
                >
                  Pausar piloto
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void salvar(true)}
                  disabled={salvando || !completo || !perfil?.liberado}
                  className="min-h-[44px] rounded-xl px-4 py-2.5 text-[14px] font-semibold disabled:opacity-60"
                  style={{ backgroundColor: "#C2410C", color: "#FFFFFF" }}
                >
                  Ativar piloto automático
                </button>
              )}

              <span className="text-[12px]" style={{ color: COR.fraco }}>
                {!completo
                  ? "Preencha nicho, público e oferta para salvar."
                  : perfil?.liberado
                    ? ativo
                      ? "Ativo: um post por dia."
                      : "Pronto para ativar."
                    : "Salvo. Um administrador precisa liberar o piloto automático (controle de custo)."}
              </span>
            </div>

            {perfil?.ultimaExecucaoEm ? (
              <p className="text-[12px]" style={{ color: COR.fraco }}>
                Última execução: {new Date(perfil.ultimaExecucaoEm).toLocaleString("pt-BR")} ·{" "}
                {perfil.ultimoStatus ?? "sem status"}
                {perfil.ultimoErro ? ` · ${perfil.ultimoErro}` : ""}
              </p>
            ) : null}

            {perfil && perfil.postsSemAbrir >= 3 ? (
              <p className="rounded-xl px-3 py-2 text-[13px]" style={{ backgroundColor: "#FFFBEB", color: "#92400E" }}>
                O piloto automático pausou sozinho: {perfil.postsSemAbrir} posts seguidos sem você abrir. Abra
                qualquer post e ative de novo.
              </p>
            ) : null}

            {podeLiberar && perfil && !perfil.liberado ? (
              <p className="text-[12px]" style={{ color: COR.fraco }}>
                Como administrador, você pode liberar este perfil no painel Admin.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}
