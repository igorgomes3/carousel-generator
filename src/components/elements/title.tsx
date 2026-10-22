import React from "react";
import * as z from "zod";
import { ConfigSchema } from "@/lib/validation/document-schema";
import { cn } from "@/lib/utils";
import { fontIdToClassName } from "@/lib/fonts-map";
import { TitleSchema } from "@/lib/validation/text-schema";
import { textStyleToClasses } from "@/lib/text-style-to-classes";
import { useFormContext } from "react-hook-form";
import {
  DocumentFormReturn,
  TextFieldPath,
  TextFieldStyle,
  StyleFieldPath,
  TextTextFieldPath,
} from "@/lib/document-form-types";
import { TextAreaFormField } from "@/components/forms/fields/text-area-form-field";

export function Title({
  fieldName,
  className = "",
}: {
  fieldName: TextFieldPath;
  className?: string;
}) {
  const form: DocumentFormReturn = useFormContext();
  const { getValues } = form;
  const config = getValues("config");
  const style = getValues(
    `${fieldName}.style` as StyleFieldPath
  ) as TextFieldStyle;
  const textFieldName = (fieldName + ".text") as TextTextFieldPath;
  // Valores do elemento (podem vir do schema estendido)
  const element = getValues(fieldName as any);
  const elementColor = element?.color;
  const elementFontFamily = element?.fontFamily;
  const elementFontWeight = element?.fontWeight;

  return (
    <TextAreaFormField
      fieldName={textFieldName}
      form={form}
      label={""}
      placeholder={"Your title here"}
      className={cn(
        // text-balance has some issues with text area
        `font-black `,
        textStyleToClasses({
          style: style,
          sizes: ["text-7xl", "text-5xl", "text-3xl"],
        }),
        elementFontFamily ? "" : fontIdToClassName(config.fonts.elementFonts?.Title || config.fonts.font1),
        className
      )}
      style={{
        color: elementColor || config.theme.primary,
        fontFamily: elementFontFamily ? fontIdToClassName(elementFontFamily) : undefined,
        fontWeight: elementFontWeight,
      }}
    />
  );
}
