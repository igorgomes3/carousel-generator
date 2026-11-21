"use client";

/**
 * Estúdio — o clone do `/app` do CarrosseIA.
 *
 * Estrutura: um wizard de 3 paradas numa página só (template → tema → resultado).
 * Nenhum painel de operador, nenhuma aba lateral, nenhum seletor de tema.
 * A pergunta que cada tela responde é "o que eu faço agora?":
 *
 *   1. "Me conta a sua ideia" + galeria de templates (a vitrine é a home).
 *   2. "Confirme o template e o tema" — texto ou link colado.
 *   3. "Escrevendo…" — progresso honesto do que está acontecendo.
 *   4. "Seu carrossel está pronto" — cards 4:5, editar texto e baixar PNG.
 *
 * Fonte dos templates: `src/lib/templates.ts`, extraído do bundle do alvo.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Cartao, CartaoCard, LARGURA_CARD } from "@/components/estudio/cartao";
import type { CarrosselGerado, SlideCarrossel } from "@/lib/estudio/tipos";
import { baixarTodosOsCards, baixarUmCard } from "@/lib/estudio/exportar";
import {
  CATEGORIAS,
  TEMPLATES,
  pilhaFonte,
  templatePorId,
  templatesDaCategoria,
  type TemplateCarrossel,
} from "@/lib/templates";

type Passo = "ideia" | "tema" | "gerando" | "pronto";

interface CarrosselDaLista {
  id: string;
  titulo: string;
  estado: string;
  slides: number;
  atualizado_em: string;
}

const MAX_TEMA = 400;

/**
 * Manchete da vitrine. O sample do template tem até 140 caracteres — em um card
 * de 220 px isso sai clipado no meio da palavra e parece defeito. Corta em
 * fronteira de palavra: a vitrine mostra o estilo, não o texto inteiro.
 */
function amostraCurta(texto: string): string {
  const limpo = texto.replace(/\(\(U:([^)]+)\)\)/g, "$1").replace(/\*\*/g, "");
  if (limpo.length <= 56) return limpo;
  const corte = limpo.slice(0, 56);
  return corte.slice(0, corte.lastIndexOf(" ") > 20 ? corte.lastIndexOf(" ") : 56) + "…";
}

export function Estudio() {
  const [passo, setPasso] = useState<Passo>("ideia");
  const [categoria, setCategoria] = useState("Todos");
  const [templateId, setTemplateId] = useState("minimalist");
  const [tema, setTema] = useState("");
  const [carrossel, setCarrossel] = useState<CarrosselGerado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [fase, setFase] = useState(0);
  const [editando, setEditando] = useState<number | null>(null);
  const [gerandoImagem, setGerandoImagem] = useState<number | null>(null);
  const [baixando, setBaixando] = useState(false);
  const [lista, setLista] = useState<CarrosselDaLista[] | null>(null);

  const palcoRef = useRef<HTMLDivElement>(null);
  const template = templatePorId(templateId);

  // "Meus carrosséis": se a API não responder, a seção simplesmente não aparece.
  // O estúdio não depende dela para funcionar — download é client-side.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const res = await fetch("/api/ac/carrossel/carrosseis?org=autoclinic", {
          headers: { accept: "application/json" },
        });
        if (!res.ok) return;
        const dados = (await res.json()) as { carrosseis?: CarrosselDaLista[] } | CarrosselDaLista[];
        const itens = Array.isArray(dados) ? dados : (dados.carrosseis ?? []);
        if (vivo) setLista(itens.slice(0, 6));
      } catch {
        /* silêncio: a lista é conveniência, não caminho crítico */
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const gerarCarrossel = useCallback(
    async (templateEscolhido: TemplateCarrossel) => {
      setErro(null);
      setPasso("gerando");
      setFase(0);

      try {
        setFase(1);
        const res = await fetch("/api/gerar", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ tema, templateId: templateEscolhido.id }),
        });
        const dados = (await res.json().catch(() => ({}))) as {
          carrossel?: CarrosselGerado;
          erro?: string;
        };
        if (!res.ok || !dados.carrossel) {
          throw new Error(dados.erro ?? "A IA não conseguiu escrever o carrossel agora.");
        }

        let gerado = dados.carrossel;
        setFase(2);

        // A capa por IA só existe em template que pede capa por IA — igual ao alvo.
        if (templateEscolhido.capaIA) {
          try {
            const imagem = await gerarImagem(
              `${templateEscolhido.styleText} Cena de capa para um carrossel de Instagram sobre: ${tema}. Composição vertical, sem texto, sem letras, sem palavras, sem marca d'água, sem logo.`,
            );
            gerado = {
              ...gerado,
              slides: gerado.slides.map((s, i) => (i === 0 ? { ...s, imagem } : s)),
            };
          } catch (e) {
            // Capa falhou: o carrossel continua válido e baixável. Avisa e segue.
            console.error("[estudio] capa por IA falhou:", e);
            setErro(
              "A capa por IA não saiu agora. O carrossel está pronto e você pode tentar a imagem de novo em cada card.",
            );
          }
        }

        setCarrossel(gerado);
        setPasso("pronto");
        setFase(3);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao gerar o carrossel.");
        setPasso("tema");
      }
    },
    [tema],
  );

  const gerarImagemDoSlide = useCallback(
    async (indice: number) => {
      if (!carrossel) return;
      const alvo = carrossel.slides[indice];
      setGerandoImagem(indice);
      setErro(null);
      try {
        const imagem = await gerarImagem(
          `Imagem para um card de carrossel de Instagram sobre: ${tema}. ${template.styleText} Tema visual do card: ${alvo.titulo}. Sem texto, sem letras, sem palavras, sem marca d'água.`,
        );
        setCarrossel((atual) =>
          atual
            ? { ...atual, slides: atual.slides.map((s, i) => (i === indice ? { ...s, imagem } : s)) }
            : atual,
        );
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao gerar a imagem.");
      } finally {
        setGerandoImagem(null);
      }
    },
    [carrossel, template.styleText, tema],
  );

  const baixarTodos = useCallback(async () => {
    const palco = palcoRef.current;
    if (!palco || !carrossel) return;
    setBaixando(true);
    try {
      const nodes = Array.from(palco.querySelectorAll<HTMLElement>("[data-card-export]"));
      await baixarTodosOsCards(nodes, carrossel.titulo);
    } finally {
      setBaixando(false);
    }
  }, [carrossel]);

  const recomecar = useCallback(() => {
    setCarrossel(null);
    setTema("");
    setPasso("ideia");
    setErro(null);
    setEditando(null);
  }, []);

  return (
    <main className="min-h-screen w-full" style={{ backgroundColor: "#F5F4F1" }}>
      <Topo passo={passo} onRecomecar={recomecar} />

      <div className="mx-auto w-full max-w-[1100px] px-4 pb-24 pt-6 sm:px-6">
        {passo === "ideia" && (
          <PassoIdeia
            categoria={categoria}
            setCategoria={setCategoria}
            templateId={templateId}
            tema={tema}
            setTema={setTema}
            lista={lista}
            onEscolherTemplate={(id) => {
              setTemplateId(id);
              setPasso("tema");
            }}
            onCriar={() => {
              if (tema.trim().length < 3) return;
              void gerarCarrossel(template);
            }}
          />
        )}

        {passo === "tema" && (
          <PassoTema
            template={template}
            tema={tema}
            setTema={setTema}
            erro={erro}
            onVoltar={() => setPasso("ideia")}
            onGerar={() => void gerarCarrossel(template)}
          />
        )}

        {passo === "gerando" && <PassoGerando fase={fase} template={template} />}

        {passo === "pronto" && carrossel && (
          <PassoPronto
            carrossel={carrossel}
            template={template}
            erro={erro}
            editando={editando}
            setEditando={setEditando}
            gerandoImagem={gerandoImagem}
            baixando={baixando}
            onBaixarTodos={() => void baixarTodos()}
            onBaixarUm={(node, i) => void baixarUmCard(node, carrossel.titulo, i)}
            onGerarImagem={(i) => void gerarImagemDoSlide(i)}
            onEditar={(i, campo, valor) =>
              setCarrossel((atual) =>
                atual
                  ? {
                      ...atual,
                      slides: atual.slides.map((s, idx) => (idx === i ? { ...s, [campo]: valor } : s)),
                    }
                  : atual,
              )
            }
            onNovo={recomecar}
          />
        )}
      </div>

      {/* Palco de export: os mesmos cards em tamanho real, fora da tela. */}
      {carrossel ? (
        <div
          ref={palcoRef}
          aria-hidden
          style={{ position: "fixed", left: -100000, top: 0, width: LARGURA_CARD }}
        >
          {carrossel.slides.map((slide, i) => (
            <div key={i} data-card-export>
              <CartaoCard slide={slide} template={template} indice={i} total={carrossel.slides.length} />
            </div>
          ))}
        </div>
      ) : null}
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Chrome                                                              */
/* ------------------------------------------------------------------ */

function Topo({ passo, onRecomecar }: { passo: Passo; onRecomecar: () => void }) {
  return (
    <header className="sticky top-0 z-20 border-b" style={{ backgroundColor: "#FFFFFFEE", borderColor: "#E7E5E4", backdropFilter: "blur(8px)" }}>
      <div className="mx-auto flex h-14 w-full max-w-[1100px] items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <span
            className="grid h-8 w-8 place-items-center rounded-lg text-[15px] font-bold text-white"
            style={{ backgroundColor: "#F4511E" }}
          >
            C
          </span>
          <span className="text-[16px] font-bold tracking-tight" style={{ color: "#1C1917" }}>
            Carrossel<span style={{ color: "#F4511E" }}>IA</span>
          </span>
        </div>
        <div className="flex items-center gap-3 text-[13px]">
          <span style={{ color: "#78716C" }}>
            {passo === "pronto" ? "Pronto" : passo === "gerando" ? "Gerando" : "Criar carrossel"}
          </span>
          {passo !== "ideia" ? (
            <button
              type="button"
              onClick={onRecomecar}
              className="rounded-lg px-3 py-2.5 font-semibold"
              style={{ color: "#1C1917", border: "1px solid #E7E5E4", backgroundColor: "#fff" }}
            >
              Novo
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Passo 1 — ideia + vitrine                                           */
/* ------------------------------------------------------------------ */

function PassoIdeia({
  categoria,
  setCategoria,
  templateId,
  tema,
  setTema,
  lista,
  onEscolherTemplate,
  onCriar,
}: {
  categoria: string;
  setCategoria: (c: string) => void;
  templateId: string;
  tema: string;
  setTema: (t: string) => void;
  lista: CarrosselDaLista[] | null;
  onEscolherTemplate: (id: string) => void;
  onCriar: () => void;
}) {
  const visiveis = templatesDaCategoria(categoria);

  /**
   * A vitrine é uma grade de 2/3/4 colunas; o card do template tem layout
   * interno fixo (1080 px) e é escalado. Sem medir a coluna, 220 px fixos
   * estouravam a coluna em 390 px e a manchete do preview saía cortada.
   */
  const gradeRef = useRef<HTMLDivElement>(null);
  const [larguraThumb, setLarguraThumb] = useState(220);
  useEffect(() => {
    const grade = gradeRef.current;
    if (!grade) return;
    const medir = () => {
      const colunas = window.innerWidth < 640 ? 2 : window.innerWidth < 1024 ? 3 : 4;
      const largura = (grade.clientWidth - 12 * (colunas - 1)) / colunas;
      if (largura > 0) setLarguraThumb(Math.floor(largura));
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(grade);
    return () => observador.disconnect();
  }, [categoria]);

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl bg-white p-5 sm:p-7" style={{ boxShadow: "0 10px 30px rgba(0,0,0,.06)" }}>
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: "#B45309" }}>
          Criação rápida com IA
        </p>
        <h1 className="mt-2 text-[26px] font-bold leading-tight sm:text-[32px]" style={{ color: "#1C1917" }}>
          Pronto para criar? Me conta a sua ideia.
        </h1>
        <p className="mt-2 text-[14px]" style={{ color: "#57534E" }}>
          A IA escreve o roteiro e desenha as artes. Você baixa os PNGs e posta no Instagram.
        </p>

        <textarea
          value={tema}
          onChange={(e) => setTema(e.target.value.slice(0, MAX_TEMA))}
          rows={3}
          placeholder="Ex.: 5 erros que fazem seu carrossel não ser salvo"
          className="mt-4 w-full resize-none rounded-xl border px-4 py-3 text-[15px] outline-none focus:ring-2"
          style={{ borderColor: "#E7E5E4", color: "#1C1917" }}
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[12px]" style={{ color: "#78716C" }}>
            {tema.trim().length < 3 ? "Digite o tema para liberar" : `${tema.length}/${MAX_TEMA}`}
          </span>
          <button
            type="button"
            onClick={onCriar}
            disabled={tema.trim().length < 3}
            className="rounded-xl px-5 py-3 text-[15px] font-semibold text-white"
            style={{
              backgroundColor: tema.trim().length < 3 ? "#E7E5E4" : "#F4511E",
              color: tema.trim().length < 3 ? "#57534E" : "#FFFFFF",
            }}
          >
            ✨ Criar com IA
          </button>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em]" style={{ color: "#57534E" }}>
            Ou escolha um template para começar
          </h2>
          <span className="text-[12px]" style={{ color: "#78716C" }}>
            {visiveis.length} templates
          </span>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-2 pr-4">
          {CATEGORIAS.map((cat) => {
            const ativo = cat === categoria;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoria(cat)}
                className="shrink-0 rounded-lg px-3.5 py-2.5 text-[12px] font-semibold uppercase tracking-wide"
                style={{
                  backgroundColor: ativo ? "#1C1917" : "#FFFFFF",
                  color: ativo ? "#FFFFFF" : "#57534E",
                  border: "1px solid #E7E5E4",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div ref={gradeRef} className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visiveis.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onEscolherTemplate(t.id)}
              className="group flex flex-col gap-2 rounded-2xl bg-white p-2 text-left transition hover:-translate-y-0.5"
              style={{
                border: t.id === templateId ? "2px solid #F4511E" : "1px solid #E7E5E4",
                boxShadow: "0 2px 10px rgba(0,0,0,.04)",
              }}
            >
              <div className="overflow-hidden rounded-xl">
                <Cartao
                  slide={{
                    tipo: "capa",
                    titulo: amostraCurta(t.sample.title || t.nome),
                    corpo: "",
                    imagem: null,
                  }}
                  template={t}
                  indice={0}
                  total={6}
                  largura={larguraThumb}
                />
              </div>
              <span className="flex items-center justify-between px-1 pb-1">
                <span className="text-[13px] font-semibold" style={{ color: "#1C1917" }}>
                  {t.nome}
                </span>
                <span
                  className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
                  style={{ backgroundColor: "#FFF1E9", color: "#C2410C" }}
                >
                  Usar
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {lista && lista.length > 0 ? (
        <section>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em]" style={{ color: "#57534E" }}>
            Meus carrosséis
          </h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {lista.map((c) => (
              <a
                key={c.id}
                href={`/carrossel/${c.id}`}
                className="flex items-center justify-between rounded-xl bg-white px-4 py-3"
                style={{ border: "1px solid #E7E5E4" }}
              >
                <span className="truncate text-[14px] font-medium" style={{ color: "#1C1917" }}>
                  {c.titulo || "Sem título"}
                </span>
                <span className="ml-3 shrink-0 text-[12px]" style={{ color: "#A8A29E" }}>
                  {c.slides} cards
                </span>
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Passo 2 — tema                                                      */
/* ------------------------------------------------------------------ */

function PassoTema({
  template,
  tema,
  setTema,
  erro,
  onVoltar,
  onGerar,
}: {
  template: TemplateCarrossel;
  tema: string;
  setTema: (t: string) => void;
  erro: string | null;
  onVoltar: () => void;
  onGerar: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-5">
      <button
        type="button"
        onClick={onVoltar}
        className="w-fit text-[13px] font-semibold"
        style={{ color: "#57534E" }}
      >
        ← Trocar template
      </button>

      <div className="rounded-2xl bg-white p-5 sm:p-7" style={{ boxShadow: "0 10px 30px rgba(0,0,0,.06)" }}>
        <div className="flex items-center gap-3">
          <div className="overflow-hidden rounded-xl" style={{ border: "1px solid #E7E5E4" }}>
            <Cartao
              slide={{ tipo: "capa", titulo: template.sample.title || template.nome, corpo: template.sample.body, imagem: null }}
              template={template}
              indice={0}
              total={6}
              largura={64}
            />
          </div>
          <div>
            <p className="text-[12px] uppercase tracking-[0.14em]" style={{ color: "#A8A29E" }}>
              Template
            </p>
            <p className="text-[16px] font-bold" style={{ color: "#1C1917" }}>
              {template.nome}
            </p>
          </div>
        </div>

        <h2 className="mt-5 text-[22px] font-bold" style={{ color: "#1C1917" }}>
          Qual é o tema do carrossel?
        </h2>
        <p className="mt-1 text-[14px]" style={{ color: "#57534E" }}>
          Uma frase basta. Se tiver o link de uma matéria, cole o link.
        </p>

        <textarea
          value={tema}
          onChange={(e) => setTema(e.target.value.slice(0, MAX_TEMA))}
          rows={4}
          autoFocus
          placeholder="Ex.: por que ninguém salva seu carrossel"
          className="mt-4 w-full resize-none rounded-xl border px-4 py-3 text-[15px] outline-none"
          style={{ borderColor: "#E7E5E4", color: "#1C1917" }}
        />

        {erro ? (
          <p className="mt-3 rounded-lg px-3 py-2 text-[13px]" style={{ backgroundColor: "#FEF2F2", color: "#B91C1C" }}>
            {erro}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onGerar}
          disabled={tema.trim().length < 3}
          className="mt-4 w-full rounded-xl px-5 py-3.5 text-[15px] font-semibold text-white disabled:opacity-40"
          style={{ backgroundColor: "#F4511E" }}
        >
          ✨ Gerar carrossel
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Passo 3 — gerando                                                   */
/* ------------------------------------------------------------------ */

function PassoGerando({ fase, template }: { fase: number; template: TemplateCarrossel }) {
  const etapas = [
    { rotulo: "Entendendo a ideia", ativa: fase >= 1 },
    { rotulo: "Escrevendo o roteiro", ativa: fase >= 1 },
    {
      rotulo: template.capaIA ? "Desenhando a capa com IA" : "Montando os cards",
      ativa: fase >= 2,
    },
  ];

  return (
    <div className="mx-auto flex max-w-[560px] flex-col items-center gap-6 py-16 text-center">
      <div
        className="grid h-14 w-14 animate-pulse place-items-center rounded-full text-2xl"
        style={{ backgroundColor: "#F4511E", color: "#fff" }}
      >
        ✨
      </div>
      <h2 className="text-[22px] font-bold" style={{ color: "#1C1917" }}>
        Montando seu carrossel…
      </h2>
      <p className="text-[14px]" style={{ color: "#57534E" }}>
        {template.capaIA
          ? "O roteiro fica pronto primeiro; a capa leva alguns segundos a mais."
          : "Só o roteiro — este template não usa capa gerada."}
      </p>
      <ul className="w-full space-y-2 text-left">
        {etapas.map((e, i) => (
          <li
            key={e.rotulo}
            className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-[14px]"
            style={{ border: "1px solid #E7E5E4", color: e.ativa ? "#1C1917" : "#A8A29E" }}
          >
            <span className="text-[15px]">{e.ativa ? (i === 0 || fase > i + 1 ? "✓" : "◐") : "○"}</span>
            {e.rotulo}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Passo 4 — resultado                                                 */
/* ------------------------------------------------------------------ */

function PassoPronto({
  carrossel,
  template,
  erro,
  editando,
  setEditando,
  gerandoImagem,
  baixando,
  onBaixarTodos,
  onBaixarUm,
  onGerarImagem,
  onEditar,
  onNovo,
}: {
  carrossel: CarrosselGerado;
  template: TemplateCarrossel;
  erro: string | null;
  editando: number | null;
  setEditando: (i: number | null) => void;
  gerandoImagem: number | null;
  baixando: boolean;
  onBaixarTodos: () => void;
  onBaixarUm: (node: HTMLElement, i: number) => void;
  onGerarImagem: (i: number) => void;
  onEditar: (i: number, campo: keyof SlideCarrossel, valor: string) => void;
  onNovo: () => void;
}) {
  const faixaRef = useRef<HTMLDivElement>(null);
  const slideEmEdicao = editando !== null ? carrossel.slides[editando] : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: "#1C1917" }}>
            Seu carrossel está pronto
          </h1>
          <p className="text-[13px]" style={{ color: "#57534E" }}>
            {carrossel.slides.length} cards em 1080×1350 · {template.nome}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onNovo}
            className="rounded-xl px-4 py-2.5 text-[14px] font-semibold"
            style={{ border: "1px solid #E7E5E4", backgroundColor: "#fff", color: "#1C1917" }}
          >
            Criar outro
          </button>
          <button
            type="button"
            onClick={onBaixarTodos}
            disabled={baixando}
            className="rounded-xl px-4 py-2.5 text-[14px] font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: "#F4511E" }}
          >
            {baixando ? "Gerando arquivos…" : "Baixar todos (.zip)"}
          </button>
        </div>
      </div>

      {erro ? (
        <p className="rounded-lg px-3 py-2 text-[13px]" style={{ backgroundColor: "#FEF2F2", color: "#B91C1C" }}>
          {erro}
        </p>
      ) : null}

      <div
        ref={faixaRef}
        className="flex w-full max-w-full min-w-0 snap-x snap-mandatory gap-4 overflow-x-auto pb-3"
        style={{ scrollbarWidth: "thin" }}
      >
        {carrossel.slides.map((slide, i) => (
          <div key={i} className="shrink-0 snap-start">
            <Cartao
              slide={slide}
              template={template}
              indice={i}
              total={carrossel.slides.length}
              largura={300}
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const palco = document.querySelectorAll<HTMLElement>("[data-card-export]")[i];
                  if (palco) onBaixarUm(palco, i);
                }}
                aria-label={`Baixar card ${i + 1} de ${carrossel.slides.length} em PNG`}
                className="flex-1 rounded-lg px-3 py-2 text-[13px] font-semibold"
                style={{ border: "1px solid #E7E5E4", backgroundColor: "#fff", color: "#1C1917" }}
              >
                Baixar PNG
              </button>
              <button
                type="button"
                onClick={() => setEditando(editando === i ? null : i)}
                className="rounded-lg px-3 py-2 text-[13px] font-semibold"
                style={{ border: "1px solid #E7E5E4", backgroundColor: "#fff", color: "#57534E" }}
              >
                Editar
              </button>
            </div>
            <button
              type="button"
              onClick={() => onGerarImagem(i)}
              disabled={gerandoImagem === i}
              className="mt-2 w-full rounded-lg px-3 py-2 text-[12px] font-semibold disabled:opacity-50"
              style={{ backgroundColor: "#FFF7ED", color: "#C2410C", border: "1px solid #FED7AA" }}
            >
              {gerandoImagem === i ? "Desenhando…" : slide.imagem ? "Trocar imagem por IA" : "Gerar imagem por IA"}
            </button>
          </div>
        ))}
      </div>

      <p className="text-[12px]" style={{ color: "#57534E" }}>
        {carrossel.slides.length} cards · arraste a faixa para o lado para ver todos
      </p>

      {slideEmEdicao && editando !== null ? (
        <section className="rounded-2xl bg-white p-4" style={{ border: "1px solid #E7E5E4" }}>
          <p className="text-[12px] uppercase tracking-[0.14em]" style={{ color: "#A8A29E" }}>
            Card {editando + 1}
          </p>
          <label className="mt-2 block text-[12px] font-semibold" style={{ color: "#57534E" }}>
            Título
          </label>
          <textarea
            value={slideEmEdicao.titulo}
            onChange={(e) => onEditar(editando, "titulo", e.target.value)}
            rows={2}
            className="mt-1 w-full resize-none rounded-lg border px-3 py-2 text-[14px]"
            style={{ borderColor: "#E7E5E4", color: "#1C1917" }}
          />
          <label className="mt-3 block text-[12px] font-semibold" style={{ color: "#57534E" }}>
            Texto
          </label>
          <textarea
            value={slideEmEdicao.corpo}
            onChange={(e) => onEditar(editando, "corpo", e.target.value)}
            rows={3}
            className="mt-1 w-full resize-none rounded-lg border px-3 py-2 text-[14px]"
            style={{ borderColor: "#E7E5E4", color: "#1C1917" }}
          />
        </section>
      ) : null}

      <p className="text-[12px]" style={{ color: "#A8A29E", fontFamily: pilhaFonte(template.fontBody) }}>
        Os PNGs saem em 1080×1350, prontos para postar no Instagram na ordem dos cards.
      </p>
    </div>
  );
}

/** POST + poll, igual ao `/api/art` do alvo: job assíncrono e progresso honesto. */
async function gerarImagem(prompt: string): Promise<string> {
  const res = await fetch("/api/imagem", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const dados = (await res.json().catch(() => ({}))) as { jobId?: string; erro?: string };
  if (!res.ok || !dados.jobId) throw new Error(dados.erro ?? "Não consegui iniciar a imagem.");

  const prazo = Date.now() + 260_000;
  while (Date.now() < prazo) {
    await new Promise((ok) => setTimeout(ok, 4000));
    const pr = await fetch(`/api/imagem?job=${encodeURIComponent(dados.jobId)}`);
    const pd = (await pr.json().catch(() => ({}))) as { status?: string; imagem?: string; erro?: string };
    if (pd.status === "done" && pd.imagem) return pd.imagem;
    if (pd.status === "erro") throw new Error(pd.erro ?? "A imagem não saiu.");
  }
  throw new Error("A imagem está demorando demais.");
}
