"use client";

/**
 * Filmstrip: uma miniatura por slide, com o conteúdo real (fundo do tema e o
 * título do slide), colada no rodapé do palco.
 *
 * É o gesto da direção A — o operador sabe em que slide está sem abrir nada.
 * As miniaturas NÃO renderizam o slide inteiro em escala: isso registraria um
 * segundo conjunto de campos do mesmo nome no react-hook-form e os dois
 * passariam a escrever no mesmo campo. Aqui a miniatura lê o documento (fundo +
 * título) e desenha, como o mockup aprovado faz.
 */
import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus } from "lucide-react";
import type * as z from "zod";

import { DocumentFormReturn } from "@/lib/document-form-types";
import { usePagerContext } from "@/lib/providers/pager-context";
import { cssDoFundo } from "@/lib/background-styles";
import { getDefaultSlideOfType } from "@/lib/default-slides";
import { SlideType } from "@/lib/validation/slide-schema";
import type { DocumentSchema } from "@/lib/validation/document-schema";
import { cn } from "@/lib/utils";

type Documento = z.infer<typeof DocumentSchema>;

/** Texto do primeiro elemento do tipo Title, se houver. */
function tituloDoSlide(slide: Documento["slides"][number]): string {
  const titulo = slide.elements.find((el) => el.type === "Title") as
    | { text?: string }
    | undefined;
  return (titulo?.text ?? "").trim();
}

export function Filmstrip() {
  const form: DocumentFormReturn = useFormContext();
  const documento = form.watch() as Documento;
  const { control } = form;
  const slides = documento.slides ?? [];
  const config = documento.config;
  const { currentPage, setCurrentPage } = usePagerContext();
  const { append } = useFieldArray({ control, name: "slides" });

  const fundo = cssDoFundo(config?.theme?.backgroundStyle, {
    primary: config?.theme?.primary ?? "#111318",
    secondary: config?.theme?.secondary ?? "#4E5464",
    background: config?.theme?.background ?? "#FFFFFF",
  });

  return (
    <div
      className="flex h-filmstrip shrink-0 items-center gap-2 overflow-x-auto border-t border-border bg-background px-3 md:gap-2.5 md:px-4"
      role="group"
      aria-label="Slides do carrossel"
    >
      {slides.map((slide, index) => {
        const ativo = index === currentPage;
        const titulo = tituloDoSlide(slide);
        return (
          <button
            key={index}
            type="button"
            onClick={() => setCurrentPage(index)}
            aria-label={`Ir para o slide ${index + 1}${titulo ? `: ${titulo}` : ""}`}
            aria-current={ativo ? "true" : undefined}
            className={cn(
              "relative grid size-11 shrink-0 place-items-end overflow-hidden rounded-sm border text-left transition-colors md:size-[41px]",
              ativo
                ? "border-primary ring-2 ring-primary ring-offset-1 ring-offset-background"
                : "border-black/10 hover:border-input"
            )}
            style={{ ...fundo }}
          >
            <span
              className="absolute inset-x-1 top-1 line-clamp-2 text-[8px] font-semibold leading-[1.2] md:text-[9px]"
              style={{ color: config?.theme?.primary ?? "#111318" }}
              aria-hidden="true"
            >
              {titulo}
            </span>
            <span
              className="absolute bottom-0.5 right-1 text-[8px] font-semibold tabular-nums"
              style={{ color: config?.theme?.primary ?? "#111318", opacity: 0.7 }}
              aria-hidden="true"
            >
              {index + 1}
            </span>
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => append(getDefaultSlideOfType(SlideType.enum.Common))}
        aria-label="Adicionar slide ao fim"
        className="grid size-11 shrink-0 place-items-center rounded-sm border border-dashed border-input text-muted-foreground hover:bg-secondary hover:text-foreground md:size-[41px]"
      >
        <Plus className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
