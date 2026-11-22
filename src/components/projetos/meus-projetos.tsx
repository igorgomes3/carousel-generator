"use client";

/**
 * "Meus projetos" — a tela de quem volta depois.
 *
 * O leigo que gerou o carrossel ontem abre esta lista e precisa de três coisas,
 * nesta ordem: reconhecer o que é dele (nome + miniatura da capa), saber quando
 * mexeu (data), e agir sem medo (abrir, renomear, apagar). Nada de tabela, nada
 * de filtro: são poucos projetos e a pergunta é sempre a mesma.
 *
 * Estados: carregando, vazio, erro e lista. Os três primeiros são texto de
 * gente, não código de erro — "Não conseguimos abrir seus projetos agora"
 * resolve mais que "HTTP 500".
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { Cartao } from "@/components/estudio/cartao";
import { templatePorId } from "@/lib/templates";
import { contagemDeCards, quandoSalvo, type ResumoProjeto } from "@/lib/estudio/projetos";

type Estado = "carregando" | "pronto" | "erro";

const COR = {
  tinta: "#1C1917",
  textoSecundario: "#57534E",
  fraco: "#A8A29E",
  borda: "#E7E5E4",
  laranja: "#F4511E",
  /**
   * Laranja de AÇÃO, mais escuro que o da marca. Medido: branco sobre #F4511E
   * dá 3,48:1 (reprova AA para texto pequeno); sobre #C2410C dá 5,18:1. O selo
   * do logo continua #F4511E porque é marca, não texto de leitura.
   */
  acao: "#C2410C",
  fundo: "#F5F4F1",
  perigo: "#B91C1C",
  perigoFundo: "#FEF2F2",
  perigoBorda: "#FCA5A5",
};

export function MeusProjetos() {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [projetos, setProjetos] = useState<ResumoProjeto[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [renomeando, setRenomeando] = useState<ResumoProjeto | null>(null);
  const [apagando, setApagando] = useState<ResumoProjeto | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    setEstado("carregando");
    try {
      const res = await fetch("/api/projetos", { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(String(res.status));
      const dados = (await res.json()) as { projetos?: ResumoProjeto[] };
      setProjetos(dados.projetos ?? []);
      setEstado("pronto");
    } catch {
      setEstado("erro");
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Aviso que some sozinho: some em 4 s, mas fica para leitor de tela.
  const timerAviso = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anunciar = useCallback((texto: string) => {
    setAviso(texto);
    if (timerAviso.current) clearTimeout(timerAviso.current);
    timerAviso.current = setTimeout(() => setAviso(null), 4000);
  }, []);
  useEffect(() => () => {
    if (timerAviso.current) clearTimeout(timerAviso.current);
  }, []);

  const abrir = useCallback((projeto: ResumoProjeto) => {
    // Navegação inteira, não router.push: o estúdio precisa montar do zero com o
    // projeto carregado (o estado do wizard não é reconstruível por props).
    window.location.href = `/?abrir=${encodeURIComponent(projeto.id)}`;
  }, []);

  const renomear = useCallback(
    async (projeto: ResumoProjeto, nome: string) => {
      const limpo = nome.replace(/\s+/g, " ").trim();
      if (!limpo || limpo === projeto.nome) {
        setRenomeando(null);
        return;
      }
      setOcupado(true);
      try {
        const res = await fetch(`/api/projetos/${projeto.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ nome: limpo }),
        });
        const dados = (await res.json().catch(() => ({}))) as { projeto?: { nome?: string }; erro?: string };
        if (!res.ok) throw new Error(dados.erro ?? "Não foi possível renomear.");
        const novoNome = dados.projeto?.nome ?? limpo;
        setProjetos((atual) =>
          atual.map((p) => (p.id === projeto.id ? { ...p, nome: novoNome } : p)),
        );
        setRenomeando(null);
        anunciar(`Nome alterado para “${novoNome}”.`);
      } catch (e) {
        anunciar(e instanceof Error ? e.message : "Não foi possível renomear agora.");
      } finally {
        setOcupado(false);
      }
    },
    [anunciar],
  );

  const apagar = useCallback(
    async (projeto: ResumoProjeto) => {
      setOcupado(true);
      try {
        const res = await fetch(`/api/projetos/${projeto.id}`, { method: "DELETE" });
        if (!res.ok) {
          const dados = (await res.json().catch(() => ({}))) as { erro?: string };
          throw new Error(dados.erro ?? "Não foi possível apagar agora.");
        }
        setProjetos((atual) => atual.filter((p) => p.id !== projeto.id));
        setApagando(null);
        anunciar(`“${projeto.nome}” foi apagado.`);
      } catch (e) {
        anunciar(e instanceof Error ? e.message : "Não foi possível apagar agora.");
      } finally {
        setOcupado(false);
      }
    },
    [anunciar],
  );

  return (
    <main className="min-h-screen w-full" style={{ backgroundColor: COR.fundo }}>
      <Cabecalho />

      <div className="mx-auto w-full max-w-[1100px] px-4 pb-24 pt-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-bold leading-tight sm:text-[30px]" style={{ color: COR.tinta }}>
              Meus projetos
            </h1>
            <p className="mt-1 text-[14px]" style={{ color: COR.textoSecundario }}>
              Tudo o que você salvou fica aqui. Abra para continuar de onde parou.
            </p>
          </div>
          {/* Com projeto na lista, "Abrir" é o primário da tela e criar outro
              fica secundário. Sem projeto, este botão não aparece: o card do
              estado vazio já é o caminho de criação — dois CTAs iguais na mesma
              tela fazem o leigo escolher sem motivo. */}
          {projetos.length > 0 ? (
            <a
              href="/"
              className="min-h-[44px] rounded-xl px-4 py-3 text-[14px] font-semibold"
              style={{ backgroundColor: "#FFFFFF", color: COR.tinta, border: `1px solid ${COR.borda}` }}
            >
              Criar novo carrossel
            </a>
          ) : null}
        </div>

        <p
          role="status"
          aria-live="polite"
          className="mt-3 text-[13px] font-semibold"
          style={{ color: "#166534", minHeight: 20 }}
        >
          {aviso ?? ""}
        </p>

        {estado === "carregando" && <Carregando />}

        {estado === "erro" && (
          <section
            role="alert"
            className="mt-2 rounded-2xl bg-white p-5"
            style={{ border: `1px solid ${COR.perigoBorda}` }}
          >
            <h2 className="text-[16px] font-bold" style={{ color: COR.perigo }}>
              Não conseguimos abrir seus projetos agora
            </h2>
            <p className="mt-1 text-[14px]" style={{ color: COR.textoSecundario }}>
              Nada foi perdido. É a lista que não carregou — tente de novo.
            </p>
            <button
              type="button"
              onClick={() => void carregar()}
              className="mt-3 rounded-xl px-4 py-2.5 text-[14px] font-semibold"
              style={{ border: `1px solid ${COR.borda}`, backgroundColor: "#fff", color: COR.tinta }}
            >
              Tentar de novo
            </button>
          </section>
        )}

        {estado === "pronto" && projetos.length === 0 && <Vazio />}

        {estado === "pronto" && projetos.length > 0 && (
          <ul className="mt-2 flex flex-col gap-2">
            {projetos.map((projeto) => (
              <li key={projeto.id}>
                <LinhaDoProjeto
                  projeto={projeto}
                  onAbrir={() => abrir(projeto)}
                  onRenomear={() => setRenomeando(projeto)}
                  onApagar={() => setApagando(projeto)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <DialogRenomear
        projeto={renomeando}
        ocupado={ocupado}
        onCancelar={() => setRenomeando(null)}
        onConfirmar={(nome) => renomeando && void renomear(renomeando, nome)}
      />

      <DialogApagar
        projeto={apagando}
        ocupado={ocupado}
        onCancelar={() => setApagando(null)}
        onConfirmar={() => apagando && void apagar(apagando)}
      />
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Chrome                                                              */
/* ------------------------------------------------------------------ */

function Cabecalho() {
  return (
    <header
      className="sticky top-0 z-20 border-b"
      style={{ backgroundColor: "#FFFFFFEE", borderColor: COR.borda, backdropFilter: "blur(8px)" }}
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
          <span className="text-[16px] font-bold tracking-tight" style={{ color: COR.tinta }}>
            Carrossel<span style={{ color: COR.laranja }}>IA</span>
          </span>
        </a>
        <a
          href="/"
          className="rounded-lg px-3 py-2 text-[13px] font-semibold"
          style={{ color: COR.tinta, border: `1px solid ${COR.borda}`, backgroundColor: "#fff" }}
        >
          Ir ao estúdio
        </a>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Linha da lista                                                      */
/* ------------------------------------------------------------------ */

function LinhaDoProjeto({
  projeto,
  onAbrir,
  onRenomear,
  onApagar,
}: {
  projeto: ResumoProjeto;
  onAbrir: () => void;
  onRenomear: () => void;
  onApagar: () => void;
}) {
  const template = useMemo(() => templatePorId(projeto.templateId), [projeto.templateId]);

  return (
    <article
      className="flex flex-col gap-3 rounded-2xl bg-white p-3 sm:flex-row sm:items-center sm:gap-4"
      style={{ border: `1px solid ${COR.borda}`, boxShadow: "0 2px 10px rgba(0,0,0,.04)" }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div aria-hidden="true" className="shrink-0 overflow-hidden rounded-xl" style={{ border: `1px solid ${COR.borda}` }}>
          <Cartao
            slide={projeto.capa}
            template={template}
            indice={0}
            total={projeto.slides}
            largura={72}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h2
            className="text-[15px] font-semibold [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] sm:truncate sm:[display:block]"
            style={{ color: COR.tinta }}
          >
            {projeto.nome}
          </h2>
          {/* Uma linha só: "3 cards · Salvo às 14:32" responde quantidade e
              quando mexi. Duas linhas diziam a mesma hora duas vezes. */}
          <p className="mt-0.5 truncate text-[13px] tabular-nums" style={{ color: COR.textoSecundario }}>
            {contagemDeCards(projeto.slides)} · {quandoSalvo(projeto.salvoEm)}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:justify-end">
        <button
          type="button"
          onClick={onAbrir}
          className="min-h-[44px] flex-1 rounded-xl px-4 py-2.5 text-[14px] font-semibold text-white sm:flex-none"
          style={{ backgroundColor: COR.acao }}
        >
          Abrir
        </button>
        <button
          type="button"
          onClick={onRenomear}
          className="min-h-[44px] rounded-xl px-3 py-2.5 text-[14px] font-semibold"
          style={{ border: `1px solid ${COR.borda}`, backgroundColor: "#fff", color: COR.tinta }}
        >
          Renomear
        </button>
        <button
          type="button"
          onClick={onApagar}
          className="min-h-[44px] rounded-xl px-3 py-2.5 text-[14px] font-semibold"
          style={{ border: `1px solid ${COR.borda}`, backgroundColor: "#fff", color: COR.perigo }}
        >
          Apagar
        </button>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Estados                                                             */
/* ------------------------------------------------------------------ */

function Carregando() {
  return (
    <div aria-busy="true" aria-live="polite" className="mt-2 flex flex-col gap-2">
      <span className="sr-only">Carregando seus projetos…</span>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-3 rounded-2xl bg-white p-3"
          style={{ border: `1px solid ${COR.borda}` }}
        >
          <div className="h-[90px] w-[72px] shrink-0 rounded-xl" style={{ backgroundColor: "#EFEEEC" }} />
          <div className="flex-1">
            <div className="h-4 w-2/3 rounded" style={{ backgroundColor: "#EFEEEC" }} />
            <div className="mt-2 h-3 w-1/3 rounded" style={{ backgroundColor: "#F5F4F1" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Vazio() {
  return (
    <section
      className="mt-2 rounded-2xl bg-white p-6 text-center sm:p-10"
      style={{ border: `1px solid ${COR.borda}` }}
    >
      <div
        aria-hidden="true"
        className="mx-auto grid h-14 w-14 place-items-center rounded-2xl text-[24px]"
        style={{ backgroundColor: "#FFF1E9" }}
      >
        🗂️
      </div>
      <h2 className="mt-3 text-[20px] font-bold" style={{ color: COR.tinta }}>
        Você ainda não salvou nenhum projeto
      </h2>
      <p className="mx-auto mt-1 max-w-[420px] text-[14px]" style={{ color: COR.textoSecundario }}>
        Quando o carrossel ficar pronto, toque em <strong>Salvar projeto</strong> no estúdio. Ele aparece
        aqui e você pode voltar quando quiser.
      </p>
      <a
        href="/"
        className="mt-4 inline-block min-h-[44px] rounded-xl px-5 py-3 text-[14px] font-semibold text-white"
        style={{ backgroundColor: COR.acao }}
      >
        Criar meu primeiro carrossel
      </a>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Diálogos                                                            */
/* ------------------------------------------------------------------ */

function Dialogo({
  aberto,
  onFechar,
  titulo,
  descricao,
  children,
}: {
  aberto: boolean;
  onFechar: () => void;
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={aberto} onOpenChange={(valor) => !valor && onFechar()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 animate-in fade-in-0"
          style={{ backgroundColor: "rgba(28,25,23,.45)" }}
        />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5"
          style={{ boxShadow: "0 24px 60px rgba(0,0,0,.24)" }}
        >
          <DialogPrimitive.Title className="text-[18px] font-bold" style={{ color: COR.tinta }}>
            {titulo}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1 text-[14px]" style={{ color: COR.textoSecundario }}>
            {descricao}
          </DialogPrimitive.Description>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function DialogRenomear({
  projeto,
  ocupado,
  onCancelar,
  onConfirmar,
}: {
  projeto: ResumoProjeto | null;
  ocupado: boolean;
  onCancelar: () => void;
  onConfirmar: (nome: string) => void;
}) {
  const [nome, setNome] = useState("");
  useEffect(() => {
    setNome(projeto?.nome ?? "");
  }, [projeto]);

  return (
    <Dialogo
      aberto={Boolean(projeto)}
      onFechar={onCancelar}
      titulo="Renomear projeto"
      descricao="O nome aparece na lista de Meus projetos."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onConfirmar(nome);
        }}
      >
        <label htmlFor="nome-projeto" className="mt-3 block text-[12px] font-semibold" style={{ color: COR.textoSecundario }}>
          Nome do projeto
        </label>
        <input
          id="nome-projeto"
          value={nome}
          onChange={(e) => setNome(e.target.value.slice(0, 80))}
          maxLength={80}
          autoFocus
          className="mt-1 w-full rounded-lg border px-3 py-2.5 text-[15px] outline-none"
          style={{ borderColor: COR.borda, color: COR.tinta }}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancelar}
            className="min-h-[44px] rounded-xl px-4 py-2.5 text-[14px] font-semibold"
            style={{ border: `1px solid ${COR.borda}`, backgroundColor: "#fff", color: COR.tinta }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={ocupado || !nome.trim()}
            className="min-h-[44px] rounded-xl px-4 py-2.5 text-[14px] font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: COR.acao }}
          >
            {ocupado ? "Salvando…" : "Salvar nome"}
          </button>
        </div>
      </form>
    </Dialogo>
  );
}

function DialogApagar({
  projeto,
  ocupado,
  onCancelar,
  onConfirmar,
}: {
  projeto: ResumoProjeto | null;
  ocupado: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
}) {
  return (
    <Dialogo
      aberto={Boolean(projeto)}
      onFechar={onCancelar}
      titulo="Apagar este projeto?"
      descricao={`“${projeto?.nome ?? ""}” vai ser apagado, junto com as imagens. Não tem como desfazer.`}
    >
      <p className="mt-3 rounded-lg px-3 py-2 text-[13px]" style={{ backgroundColor: "#F5F4F1", color: COR.textoSecundario }}>
        Se você só quer baixar os PNGs, use <strong>Manter projeto</strong> e abra o carrossel.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancelar}
          autoFocus
          className="min-h-[44px] rounded-xl px-4 py-2.5 text-[14px] font-semibold"
          style={{ border: `1px solid ${COR.borda}`, backgroundColor: "#fff", color: COR.tinta }}
        >
          Manter projeto
        </button>
        <button
          type="button"
          onClick={onConfirmar}
          disabled={ocupado}
          className="min-h-[44px] rounded-xl px-4 py-2.5 text-[14px] font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: COR.perigo }}
        >
          {ocupado ? "Apagando…" : "Apagar projeto"}
        </button>
      </div>
    </Dialogo>
  );
}
