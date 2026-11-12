"use client";

/**
 * Controles da tela inicial (§2.1, §2.4).
 *
 * Um campo de busca de 32 px com lupa, um `select` nativo de ordenação, as
 * quatro abas como chips com contagem e, num segundo nível, os seis estados
 * exatos. Tudo é `button`/`input`/`select` de verdade — o Radix Select resolve
 * portal e teclado, mas cobra um botão fantasma no DOM que o axe acusa quando o
 * rótulo fica só no `placeholder`. `<select>` nativo é 32 px, funciona no
 * teclado do sistema e no leitor de tela sem teste extra.
 *
 * Alvo: 44 px no mobile, 28–32 px no desktop — o padrão que a galeria já usava
 * (`min-h-touch md:min-h-0 md:h-7`).
 */
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ABAS,
  ESTADOS,
  ORDENS,
  contagensPorAba,
  contagensPorEstado,
  rotuloEstado,
  type Aba,
  type Carrossel,
  type Estado,
  type Ordem,
} from "@/lib/carrosseis/lista";

export function CampoBusca({
  valor,
  onMudar,
}: {
  valor: string;
  onMudar: (v: string) => void;
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search
        className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={valor}
        onChange={(e) => onMudar(e.target.value)}
        placeholder="Buscar título, legenda ou hashtag"
        aria-label="Buscar título, legenda ou hashtag"
        className="h-11 pl-8 text-body md:h-8"
      />
    </div>
  );
}

export function SeletorOrdem({
  valor,
  onMudar,
}: {
  valor: Ordem;
  onMudar: (v: Ordem) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-meta text-muted-foreground">
      <span className="sr-only md:not-sr-only md:inline">Ordenar</span>
      <select
        value={valor}
        onChange={(e) => onMudar(e.target.value as Ordem)}
        aria-label="Ordenar carrosséis"
        className="h-11 rounded-sm border border-input bg-background px-2 text-control text-foreground md:h-8"
      >
        {ORDENS.map((o) => (
          <option key={o.chave} value={o.chave}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </label>
  );
}

function Chip({
  rotulo,
  contagem,
  ativo,
  onClicar,
}: {
  rotulo: string;
  contagem: number;
  ativo: boolean;
  onClicar: () => void;
}) {
  return (
    // Sem `aria-label`: o texto visível JÁ é o nome acessível. Um `aria-label`
    // que não contém o texto visível viola `label-content-name-mismatch`
    // (impacto sério) — quem usa controle por voz lê "A produzir 0" na tela e
    // não consegue falar o rótulo escondido. O estado do filtro vai em
    // `aria-pressed`.
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClicar}
      className={cn(
        "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-pill border px-3 text-control transition-colors md:h-7",
        ativo
          ? "border-primary/30 bg-accent font-semibold text-accent-foreground"
          : "border-input bg-background text-subtle hover:bg-secondary",
      )}
    >
      {rotulo}
      <span className="tabular-nums opacity-70">
        {contagem}
        <span className="sr-only">{contagem === 1 ? " carrossel" : " carrosséis"}</span>
      </span>
    </button>
  );
}

/** Chips das quatro abas, com contagem sempre visível. */
export function ChipsAbas({
  lista,
  aba,
  onAba,
  totalBusca,
}: {
  lista: Carrossel[];
  aba: Aba;
  onAba: (aba: Aba) => void;
  /** Quando há busca ativa a contagem é a do resultado, não a da organização. */
  totalBusca?: Record<Aba, number> | null;
}) {
  const contagens = totalBusca ?? contagensPorAba(lista);
  return (
    <div
      role="group"
      aria-label="Filtrar por aba"
      className="flex w-full min-w-0 max-w-full snap-x gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 [contain:paint] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {ABAS.map((def) => (
        <Chip
          key={def.chave}
          rotulo={def.rotulo}
          contagem={contagens[def.chave]}
          ativo={aba === def.chave}
          onClicar={() => onAba(def.chave)}
        />
      ))}
    </div>
  );
}

/** Chips dos seis estados exatos — segundo nível, sem contagem zero à mostra. */
export function ChipsEstados({
  lista,
  estado,
  onEstado,
}: {
  lista: Carrossel[];
  estado: Estado | null;
  onEstado: (e: Estado | null) => void;
}) {
  const contagens = contagensPorEstado(lista);
  return (
    <div
      role="group"
      aria-label="Filtrar por estado exato"
      className="flex w-full min-w-0 max-w-full snap-x gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 [contain:paint] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <Chip
        rotulo="Todos os estados"
        contagem={contagensPorAba(lista).todas}
        ativo={estado === null}
        onClicar={() => onEstado(null)}
      />
      {ESTADOS.map((e) => (
        <Chip
          key={e}
          rotulo={rotuloEstado(e)}
          contagem={contagens[e]}
          ativo={estado === e}
          onClicar={() => onEstado(estado === e ? null : e)}
        />
      ))}
    </div>
  );
}
