/* eslint-disable @next/next/no-img-element */
import React from "react";
import * as z from "zod";
import { cn } from "@/lib/utils";
import {
  ObjectFitType,
  ImageSchema,
  ContentImageSchema,
} from "@/lib/validation/image-schema";
import { useSelectionContext } from "@/lib/providers/selection-context";
import { getSlideNumber } from "@/lib/field-path";
import { usePagerContext } from "@/lib/providers/pager-context";
import { useFormContext } from "react-hook-form";
import {
  DocumentFormReturn,
  ElementFieldPath,
} from "@/lib/document-form-types";

export function ContentImage({
  fieldName,
  className,
  somenteLeitura = false,
}: {
  fieldName: ElementFieldPath;
  className?: string;
  /** No link público não existe placeholder de editor nem borda de seleção. */
  somenteLeitura?: boolean;
}) {
  const form: DocumentFormReturn = useFormContext();
  const { getValues } = form;
  const image = getValues(fieldName) as z.infer<typeof ContentImageSchema>;

  const { setCurrentPage } = usePagerContext();
  const { currentSelection, setCurrentSelection } = useSelectionContext();
  const pageNumber = getSlideNumber(fieldName);
  // Placeholder "400 x 200" é ferramenta de editor: no link público ele vira
  // conteúdo falso na cara do cliente. Sem imagem, não renderiza nada.
  if (somenteLeitura && !image.source.src) return null;
  const source = image.source.src || "https://placehold.co/400x200";

  // TODO: Convert to Toggle to make it accessible. Control with selection

  return (
    <div
      id={"content-image-" + fieldName}
      className={cn(
        "flex flex-col h-full w-full outline-transparent rounded-md ring-offset-background",
        currentSelection == fieldName &&
          "outline-input ring-2 ring-offset-2 ring-ring",
        className
      )}
    >
      {/* // TODO: Extract to component */}
      <img
        alt="slide image"
        src={source} // TODO: Extract cover/contain into a setting for images
        className={cn(
          // shadow-md or any box shadow not supported by html2canvas
          "rounded-md overflow-hidden",
          image.style.objectFit == ObjectFitType.enum.Cover
            ? "object-cover w-full h-full"
            : image.style.objectFit == ObjectFitType.enum.Contain
            ? "object-contain w-fit h-fit"
            : ""
        )}
        style={{
          opacity: image.style.opacity / 100,
        }}
        onClick={(event) => {
          setCurrentPage(pageNumber);
          setCurrentSelection(fieldName, event);
        }}
      />
    </div>
  );
}
