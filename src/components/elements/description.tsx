import React from "react";
import { cn } from "@/lib/utils";
import { fontIdToClassName } from "@/lib/fonts-map";
import { textStyleToClasses } from "@/lib/text-style-to-classes";
import { useFormContext } from "react-hook-form";
import { TextAreaFormField } from "@/components/forms/fields/text-area-form-field";
import {
  DocumentFormReturn,
  TextFieldPath,
  TextFieldStyle,
  StyleFieldPath,
  TextTextFieldPath,
} from "@/lib/document-form-types";

export function Description({
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
      placeholder={"Your description here"}
      className={cn(
        `font-medium`,
        textStyleToClasses({
          style: style,
          sizes: ["text-xl", "text-lg", "text-base"],
        }),
        elementFontFamily ? "" : fontIdToClassName(config.fonts.elementFonts?.Description || config.fonts.font2),
        className
      )}
      style={{
        color: elementColor || config.theme.secondary,
        fontFamily: elementFontFamily ? fontIdToClassName(elementFontFamily) : undefined,
        fontWeight: elementFontWeight,
      }}
    />
  );
}
