"use client";
import { useFieldArrayValues } from "@/lib/hooks/use-field-array-values";
import { usePagerContext } from "@/lib/providers/pager-context";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Paginador compacto da direção A: duas setas e o contador dentro de uma caixa
 * de borda fina, 32 px de altura. Antes eram quatro botões outline de 36 px que
 * ocupavam 220 px da barra e gritavam mais que o conteúdo.
 *
 * Alvo de toque: 44 px no mobile (min-h-11 no container), 26 px no desktop.
 */
export default function Pager() {
  const { currentPage, onPreviousClick, onNextClick } = usePagerContext();
  const { numPages } = useFieldArrayValues("slides");
  const total = numPages ?? 0;
  const primeiro = currentPage === 0;
  const ultimo = currentPage === total - 1 || total === 0;

  return (
    <div className="flex h-11 items-center rounded-md border border-border bg-background p-0.5 md:h-8">
      <button
        type="button"
        onClick={onPreviousClick}
        disabled={primeiro}
        aria-label="Slide anterior"
        className="grid size-10 place-items-center rounded-sm text-subtle hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-40 md:size-[26px]"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>
      <span
        className="min-w-12 border-x border-border px-2 text-center text-meta font-medium tabular-nums text-subtle"
        aria-live="polite"
        suppressHydrationWarning
      >
        {Math.min(currentPage + 1, Math.max(total, 1))} / {total}
      </span>
      <button
        type="button"
        onClick={onNextClick}
        disabled={ultimo}
        aria-label="Próximo slide"
        className="grid size-10 place-items-center rounded-sm text-subtle hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-40 md:size-[26px]"
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
