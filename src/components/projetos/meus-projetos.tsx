"use client";

/**
 * "Meus projetos" — a tela de quem volta depois.
 *
 * O leigo que gerou o carrossel ontem abre esta lista e precisa reconhecer o
 * que é dele. A plataforma salva de DOIS jeitos, e esta tela lista os dois,
 * porque esconder um deles parece perda de dado:
 *
 *   1. **Projetos do estúdio** — nosso store (`/api/projetos`): cards, texto,
 *      imagem, template. Abrir, renomear e apagar acontecem aqui.
 *   2. **Carrosséis do editor** — os que já existiam na API do AutoClinic
 *      (`/carrossel/carrosseis`), lidos com a sessão de quem está logado. Esta
 *      tela só LEITURA: renomear e apagar continuam no editor antigo, porque a
 *      escrita é do outro produto.
 *
 * Regra da coordenação: se um dos dois lados não puder ser lido, a tela diz
 * isso em texto de gente e oferece a saída — nunca uma lista vazia que parece
 * que o trabalho sumiu.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { Cartao } from "@/components/estudio/cartao";
import { templatePorId } from "@/lib/templates";
import { apiJsonLeitura } from "@/lib/auth/sessao";
import {
  coresDaCapa,
  linhaDeDensidade,
  rotuloEstado,
  tituloDaCapa,
  type Carrossel,
} from "@/lib/carrosseis/lista";
import { contagemDeCards, quandoSalvo, type ResumoProjeto } from "@/lib/estudio/projetos";

type Estado = "carregando" | "pronto" | "erro";

const ORG = "org=autoclinic";

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
  perigoBorda: "#FCA5A5",
};

export function MeusProjetos() {
  /* -------- projetos do estúdio (nosso store) -------- */
  const [estado, setEstado] = useState<Estado>("carregando");
  const [projetos, setProjetos] = useState<ResumoProjeto[]>([]);
  const [renomeando, setRenomeando] = useState<ResumoProjeto | null>(null);
  const [apagando, setApagando] = useState<ResumoProjeto | null>(null);
  const [ocupado, setOcupado] = useState(false);

  /* -------- carrosséis do editor (API do AutoClinic, leitura) -------- */
  const [estadoAntigos, setEstadoAntigos] = useState<Estado>("carregando");
  const [antigos, setAntigos] = useState<Carrossel[]>([]);

  const [aviso, setAviso] = useState<string | null>(null);

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

  /**
   * Lista antiga, com `apiJsonLeitura`: manda o token da sessão e, em 401, tenta
   * renovar uma vez — mas **não** desloga. `apiJson` chama `sair()` no 401 e o
   * efeito colateral medido foi o cookie `ac_sessao` sumir só por abrir esta
   * tela, derrubando também o save do estúdio. Sem sessão a resposta é 401 e a
   * seção cai no aviso explícito — nunca numa lista vazia sem explicação.
   */
  const carregarAntigos = useCallback(async () => {
    setEstadoAntigos("carregando");
    try {
      const dados = await apiJsonLeitura<{ carrosseis?: Carrossel[] }>(`/carrossel/carrosseis?${ORG}`);
      setAntigos(dados.carrosseis ?? []);
      setEstadoAntigos("pronto");
    } catch {
      setEstadoAntigos("erro");
    }
  }, []);

  useEffect(() => {
    void carregar();
    void carregarAntigos();
  }, [carregar, carregarAntigos]);

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

  const nadaAinda =
    estado === "pronto" &&
    projetos.length === 0 &&
    estadoAntigos === "pronto" &&
    antigos.length === 0;

  return (
    <main className="min-h-screen w-full" style={{ backgroundColor: COR.fundo }}>
      <Cabecalho />

      <div className="mx-auto w-full max-w-[1100px] px-4 pb-24 pt-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-bold leading-tight sm:text-[30px]" style={{ color: COR.tinta }}>
              Meus projetos
            </h1>
            <p className="mt-1 max-w-[560px] text-[14px]" style={{ color: COR.textoSecundario }}>
              Tudo o que você salvou fica aqui: os carrosséis do estúdio e os que já existiam no
              editor.
            </p>
          </div>
          {/* Com projeto na lista, "Abrir" é o primário da tela e criar outro fica
              secundário. Sem nada salvo, o card do estado vazio já é o caminho de
              criação — dois CTAs iguais fazem o leigo escolher sem motivo. */}
          {estado === "pronto" && projetos.length > 0 ? (
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

        {nadaAinda ? (
          <Vazio />
        ) : (
          <>
            <SecaoDoEstudio
              estado={estado}
              projetos={projetos}
              onRecarregar={() => void carregar()}
              onAbrir={abrir}
              onRenomear={setRenomeando}
              onApagar={setApagando}
            />

            <SecaoDoEditor
              estado={estadoAntigos}
              carrosseis={antigos}
              onRecarregar={() => void carregarAntigos()}
            />
          </>
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

function TituloDeSecao({
  id,
  children,
  etiqueta,
  contagem,
  unidade,
  nota,
}: {
  id: string;
  children: React.ReactNode;
  etiqueta: string;
  contagem?: number;
  /** "projetos"/"carrosséis" — número solto ("2") não informa nada. */
  unidade: string;
  nota: string;
}) {
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h2
          id={id}
          className="text-[13px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: COR.textoSecundario }}
        >
          {children}
        </h2>
        <span
          className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
          style={{ backgroundColor: "#FFF1E9", color: "#9A3412" }}
        >
          {etiqueta}
        </span>
        {typeof contagem === "number" ? (
          <span className="text-[12px] tabular-nums" style={{ color: COR.textoSecundario }}>
            {contagem} {contagem === 1 ? unidade.slice(0, -1) : unidade}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-[12px]" style={{ color: COR.textoSecundario }}>
        {nota}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mundo 1 — projetos do estúdio                                       */
/* ------------------------------------------------------------------ */

function SecaoDoEstudio({
  estado,
  projetos,
  onRecarregar,
  onAbrir,
  onRenomear,
  onApagar,
}: {
  estado: Estado;
  projetos: ResumoProjeto[];
  onRecarregar: () => void;
  onAbrir: (p: ResumoProjeto) => void;
  onRenomear: (p: ResumoProjeto) => void;
  onApagar: (p: ResumoProjeto) => void;
}) {
  return (
    <section aria-labelledby="sec-estudio">
      <TituloDeSecao
        id="sec-estudio"
        etiqueta="estúdio"
        contagem={estado === "pronto" ? projetos.length : undefined}
        unidade="projetos"
        nota="Salvos aqui pelo estúdio. Você pode abrir, renomear e apagar."
      >
        Projetos do estúdio
      </TituloDeSecao>

      {estado === "carregando" && <Carregando rotulo="Carregando seus projetos do estúdio…" />}

      {estado === "erro" && (
        <AvisoDeErro
          titulo="Não conseguimos abrir seus projetos do estúdio agora"
          texto="Nada foi perdido. É a lista que não carregou — tente de novo."
          onRecarregar={onRecarregar}
        />
      )}

      {estado === "pronto" && projetos.length === 0 && (
        <div
          className="mt-2 rounded-xl bg-white px-4 py-3 text-[14px]"
          style={{ border: `1px solid ${COR.borda}`, color: COR.textoSecundario }}
        >
          Nenhum projeto salvo no estúdio ainda. Ao gerar um carrossel, toque em{" "}
          <strong>Salvar projeto</strong> para ele aparecer aqui.{" "}
          <a href="/" className="font-semibold underline" style={{ color: COR.acao }}>
            Criar agora
          </a>
        </div>
      )}

      {estado === "pronto" && projetos.length > 0 && (
        <ul className="mt-2 flex flex-col gap-2">
          {projetos.map((projeto) => (
            <li key={projeto.id}>
              <LinhaDoProjeto
                projeto={projeto}
                onAbrir={() => onAbrir(projeto)}
                onRenomear={() => onRenomear(projeto)}
                onApagar={() => onApagar(projeto)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

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
          <h3
            className="text-[15px] font-semibold [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] sm:truncate sm:[display:block]"
            style={{ color: COR.tinta }}
          >
            {projeto.nome}
          </h3>
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
/* Mundo 2 — carrosséis do editor antigo (só leitura)                  */
/* ------------------------------------------------------------------ */

function SecaoDoEditor({
  estado,
  carrosseis,
  onRecarregar,
}: {
  estado: Estado;
  carrosseis: Carrossel[];
  onRecarregar: () => void;
}) {
  return (
    <section aria-labelledby="sec-editor">
      <TituloDeSecao
        id="sec-editor"
        etiqueta="editor"
        contagem={estado === "pronto" ? carrosseis.length : undefined}
        unidade="carrosséis"
        nota="Feitos no editor antigo e salvos na API do AutoClinic. Aqui eles só abrem — renomear e apagar continuam no editor."
      >
        Carrosséis do editor
      </TituloDeSecao>

      {estado === "carregando" && <Carregando rotulo="Carregando seus carrosséis do editor…" />}

      {estado === "erro" && (
        <AvisoDeErro
          titulo="Não conseguimos ler seus carrosséis antigos"
          texto="Eles continuam salvos na API do AutoClinic — nada foi perdido. Sua sessão do painel pode ter expirado; entre de novo para vê-los aqui."
          onRecarregar={onRecarregar}
          acaoExtra={{ href: "/login?de=/projetos", rotulo: "Entrar de novo" }}
        />
      )}

      {estado === "pronto" && carrosseis.length === 0 && (
        <div
          className="mt-2 rounded-xl bg-white px-4 py-3 text-[14px]"
          style={{ border: `1px solid ${COR.borda}`, color: COR.textoSecundario }}
        >
          Nenhum carrossel antigo do editor nesta conta.
        </div>
      )}

      {estado === "pronto" && carrosseis.length > 0 && (
        <ul className="mt-2 flex flex-col gap-2">
          {carrosseis.map((carrossel) => (
            <li key={carrossel.id}>
              <LinhaDoEditor carrossel={carrossel} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function LinhaDoEditor({ carrossel }: { carrossel: Carrossel }) {
  const capa = coresDaCapa(carrossel);
  const titulo = tituloDaCapa(carrossel);

  return (
    <article
      className="flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-center sm:gap-4"
      style={{ border: `1px solid ${COR.borda}`, backgroundColor: "#FCFBF9" }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div
          aria-hidden="true"
          className="flex aspect-[4/5] w-[58px] shrink-0 flex-col justify-end overflow-hidden rounded-xl p-1.5"
          style={{ backgroundColor: capa.fundo, color: capa.texto, border: `1px solid ${COR.borda}` }}
        >
          <span className="overflow-hidden text-[8px] font-semibold leading-[1.2] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
            {titulo}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h3
            className="text-[15px] font-semibold [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] sm:truncate sm:[display:block]"
            style={{ color: COR.tinta }}
          >
            {carrossel.titulo}
          </h3>
          <p className="mt-0.5 truncate text-[13px] tabular-nums" style={{ color: COR.textoSecundario }}>
            {linhaDeDensidade(carrossel)} · {rotuloEstado(carrossel.estado)}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:justify-end">
        <a
          href={`/carrossel/${carrossel.id}/editar`}
          className="min-h-[44px] flex-1 rounded-xl px-4 py-2.5 text-center text-[14px] font-semibold sm:flex-none"
          style={{ border: `1px solid ${COR.borda}`, backgroundColor: "#fff", color: COR.tinta }}
        >
          Abrir no editor
        </a>
        <a
          href={`/carrossel/${carrossel.id}`}
          className="min-h-[44px] rounded-xl px-3 py-2.5 text-center text-[14px] font-semibold"
          style={{ border: `1px solid ${COR.borda}`, backgroundColor: "#fff", color: COR.textoSecundario }}
        >
          Ver ficha
        </a>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Estados                                                             */
/* ------------------------------------------------------------------ */

function Carregando({ rotulo }: { rotulo: string }) {
  return (
    <div aria-busy="true" aria-live="polite" className="mt-2 flex flex-col gap-2">
      <span className="sr-only">{rotulo}</span>
      {[0, 1].map((i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-3 rounded-2xl bg-white p-3"
          style={{ border: `1px solid ${COR.borda}` }}
        >
          <div className="h-[70px] w-[58px] shrink-0 rounded-xl" style={{ backgroundColor: "#EFEEEC" }} />
          <div className="flex-1">
            <div className="h-4 w-2/3 rounded" style={{ backgroundColor: "#EFEEEC" }} />
            <div className="mt-2 h-3 w-1/3 rounded" style={{ backgroundColor: "#F5F4F1" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function AvisoDeErro({
  titulo,
  texto,
  onRecarregar,
  acaoExtra,
}: {
  titulo: string;
  texto: string;
  onRecarregar: () => void;
  acaoExtra?: { href: string; rotulo: string };
}) {
  return (
    <section
      role="alert"
      className="mt-2 rounded-2xl bg-white p-5"
      style={{ border: `1px solid ${COR.perigoBorda}` }}
    >
      <h3 className="text-[16px] font-bold" style={{ color: COR.perigo }}>
        {titulo}
      </h3>
      <p className="mt-1 text-[14px]" style={{ color: COR.textoSecundario }}>
        {texto}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRecarregar}
          className="min-h-[44px] rounded-xl px-4 py-2.5 text-[14px] font-semibold"
          style={{ border: `1px solid ${COR.borda}`, backgroundColor: "#fff", color: COR.tinta }}
        >
          Tentar de novo
        </button>
        {acaoExtra ? (
          <a
            href={acaoExtra.href}
            className="min-h-[44px] rounded-xl px-4 py-2.5 text-[14px] font-semibold text-white"
            style={{ backgroundColor: COR.acao }}
          >
            {acaoExtra.rotulo}
          </a>
        ) : null}
      </div>
    </section>
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
      <p className="mx-auto mt-1 max-w-[440px] text-[14px]" style={{ color: COR.textoSecundario }}>
        Quando o carrossel ficar pronto, toque em <strong>Salvar projeto</strong> no estúdio. Ele
        aparece aqui e você pode voltar quando quiser. Carrosséis feitos no editor antigo também
        aparecem nesta tela.
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
