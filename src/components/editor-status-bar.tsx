"use client";

/**
 * Linha de status do palco — o gesto da direção A: o operador sabe quantos
 * slides existem, em que tamanho o PNG sai e em que escala está vendo, sem
 * abrir nada.
 *
 * O texto de salvamento diz onde o documento está de verdade. Em modo projeto é
 * o banco; no editor novo é o navegador, e prometer "salvo automaticamente" ali
 * seria mentira — fechar a aba e limpar o cache apaga o trabalho.
 */
import { useFieldArrayValues } from "@/lib/hooks/use-field-array-values";
import { useSalvamento } from "@/lib/providers/salvamento-context";
import { useEscalaSlide } from "@/lib/hooks/use-escala-slide";

export function EditorStatusBar() {
  const { numPages } = useFieldArrayValues("slides");
  const salvamento = useSalvamento();
  const { escala } = useEscalaSlide();

  const total = numPages ?? 0;
  const estado = salvamento?.estado ?? "ocioso";
  const semProjeto = !salvamento?.projetoId;

  const rotuloSalvamento = (() => {
    if (semProjeto) return "Salvo neste navegador";
    if (estado === "salvando") return "Salvando…";
    if (estado === "erro") return salvamento?.erro ?? "Falha ao salvar";
    return "Salvo automaticamente";
  })();

  return (
    <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border bg-background px-3 text-meta md:px-5">
      <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-subtle">
        <span
          aria-hidden="true"
          className={
            estado === "erro"
              ? "size-1.5 shrink-0 rounded-pill bg-destructive"
              : "size-1.5 shrink-0 rounded-pill bg-primary"
          }
        />
        <span className="truncate">{rotuloSalvamento}</span>
      </span>
      <span aria-hidden="true" className="text-muted-foreground">
        ·
      </span>
      {/* 1080×1350 é o tamanho do PNG exportado, não do slide em CSS (400×500). */}
      <span className="whitespace-nowrap tabular-nums text-muted-foreground">
        {total} {total === 1 ? "slide" : "slides"} · 1080×1350
      </span>
      <span className="ml-auto hidden whitespace-nowrap tabular-nums text-muted-foreground sm:inline">
        Ajustar {Math.round(escala * 100)}%
      </span>
    </div>
  );
}
