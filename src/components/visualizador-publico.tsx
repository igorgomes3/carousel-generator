"use client";

/**
 * Visualização pública (somente leitura) de um carrossel.
 *
 * Mesmo pipeline de render do editor — `CommonPage` — porque duas telas
 * desenhando o mesmo documento divergem e o cliente recebe um link que não é o
 * que ele aprovou. A diferença é só interação: `pointer-events-none` e nenhum
 * autosave.
 */
import * as z from "zod";
import { DocumentSchema } from "@/lib/validation/document-schema";
import { CommonPage } from "@/components/pages/common-page";
import { useFieldArrayValues } from "@/lib/hooks/use-field-array-values";
import { useFormContext } from "react-hook-form";

const TAMANHO = { width: 480, height: 600 };

export function VisualizadorPublico() {
  const form = useFormContext<z.infer<typeof DocumentSchema>>();
  const documento = form.watch();
  const { numPages } = useFieldArrayValues("slides");

  if (!numPages) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        Este carrossel está vazio.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8 pointer-events-none select-none">
      {documento.slides.map((slide, index) => (
        <div
          key={index}
          className="rounded-xl overflow-hidden border shadow-sm bg-white"
          style={{ width: TAMANHO.width, height: TAMANHO.height }}
        >
          <CommonPage
            index={index}
            config={documento.config}
            slide={slide}
            size={TAMANHO}
            fieldName={`slides.${index}`}
            somenteLeitura
          />
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        {documento.slides.length} slide{documento.slides.length === 1 ? "" : "s"} · somente leitura
      </p>
    </div>
  );
}
