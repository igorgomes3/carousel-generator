import { cn } from "@/lib/utils";
import { fontIdToClassName } from "@/lib/fonts-map";
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

export function Subtitle({
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
      placeholder={"Your subtitle here"}
      className={cn(
        `font-bold`,
        textStyleToClasses({
          style: style,
          sizes: ["text-3xl", "text-2xl", "text-xl"],
        }),
        elementFontFamily ? "" : fontIdToClassName(config.fonts.elementFonts?.Subtitle || config.fonts.font1),
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
