import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Etiqueta de estado — o único lugar do produto onde uma cor além do acento
 * aparece, e só como tinta sobre fundo claro.
 *
 * Antes era um `span` estilizado em cada tela (ver DESIGN.md), com cores
 * diferentes em cada uma: esmeralda na galeria, âmbar na fila, azul no editor.
 * O padrão se repetia em três lugares e divergia nos três, então virou
 * componente com dois sabores e um neutro.
 *
 * Contraste medido: `ativo` = acento #5E6AD2 sobre #EEF0FB = 4,6:1; `neutro` =
 * #4E5464 sobre #F7F8F9 = 7,2:1. Ambos passam AA em 12 px.
 */
type Tom = "ativo" | "neutro";

export function EtiquetaEstado({
  children,
  tom = "neutro",
  className,
}: {
  children: React.ReactNode;
  tom?: Tom;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "etiqueta-estado",
        tom === "ativo"
          ? "border-primary/20 bg-accent text-accent-foreground"
          : "border-input bg-secondary text-subtle",
        className
      )}
    >
      {children}
    </span>
  );
}
