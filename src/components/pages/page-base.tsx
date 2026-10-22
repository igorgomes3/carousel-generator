import React from "react";
import { cn } from "@/lib/utils";
import { usePagerContext } from "@/lib/providers/pager-context";
import { getSlideNumber } from "@/lib/field-path";
import { useSelection } from "@/lib/hooks/use-selection";
import { useSelectionContext } from "@/lib/providers/selection-context";

export function PageBase({
  size,
  children,
  fieldName,
  className,
  style,
}: {
  size: { width: number; height: number };
  children: React.ReactNode;
  fieldName: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { currentSelection } = useSelectionContext();
  const pageNumber = getSlideNumber(fieldName);

  return (
    <div
      id={"page-base-" + pageNumber}
      className={cn(
        "overflow-clip relative outline-2 outline-transparent ring-offset-background",
        currentSelection == fieldName &&
          "outline-input ring-2 ring-offset-2 ring-ring",
        className
      )}
      style={{
        width: `${size.width}px`,
        height: `${size.height}px`,
        minWidth: `${size.width}px`,
        minHeight: `${size.height}px`,
        // O fundo fica aqui, no proprio elemento do slide, e nao numa camada
        // filha com z-index negativo. A exportacao desenha o slide dentro de um
        // SVG foreignObject, e ali um filho com z negativo e pintado atras da
        // raiz: o fundo sumia e o PNG saia branco.
        ...style,
      }}
    >
      {children}
    </div>
  );
}
