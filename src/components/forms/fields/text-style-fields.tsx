"use client";

import { useFormContext } from "react-hook-form";
import {
  DocumentFormReturn,
  ElementFieldPath,
  TextStyleColorFieldPath,
  TextStyleFontFamilyFieldPath,
  TextStyleFontWeightFieldPath,
} from "@/lib/document-form-types";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fontsMap } from "@/lib/fonts-map";
import { Separator } from "@/components/ui/separator";
import { Palette } from "lucide-react";

const fontWeightOptions = [
  { value: "normal", label: "Normal" },
  { value: "bold", label: "Bold" },
  { value: "100", label: "Thin (100)" },
  { value: "200", label: "Extra Light (200)" },
  { value: "300", label: "Light (300)" },
  { value: "400", label: "Regular (400)" },
  { value: "500", label: "Medium (500)" },
  { value: "600", label: "Semi Bold (600)" },
  { value: "700", label: "Bold (700)" },
  { value: "800", label: "Extra Bold (800)" },
  { value: "900", label: "Black (900)" },
];

export function TextStyleFields({
  form,
  elementPath,
}: {
  form: DocumentFormReturn;
  elementPath: ElementFieldPath;
}) {
  const { watch, control } = form;

  const color = watch(`${elementPath}.color` as TextStyleColorFieldPath);
  const fontFamily = watch(`${elementPath}.fontFamily` as TextStyleFontFamilyFieldPath);
  const fontWeight = watch(`${elementPath}.fontWeight` as TextStyleFontWeightFieldPath);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Palette className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-base font-semibold">Texto</h4>
      </div>

      {/* Color Picker */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Cor do texto</label>
        <Input
          type="color"
          value={color || "#000000"}
          onChange={(e) => {
            const val = e.target.value;
            form.setValue(`${elementPath}.color` as TextStyleColorFieldPath, val === "#000000" ? undefined : val);
          }}
          className="w-full h-10 p-1 border rounded"
        />
        <p className="text-xs text-muted-foreground">
          Deixe #000000 para usar a cor do tema
        </p>
      </div>

      {/* Font Family */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Fonte</label>
        <Select
          value={fontFamily || ""}
          onValueChange={(val) => {
            form.setValue(
              `${elementPath}.fontFamily` as TextStyleFontFamilyFieldPath,
              val === "" ? undefined : val
            );
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Usar fonte do tema" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Usar fonte do tema</SelectItem>
            {Object.entries(fontsMap).map(([key, info]) => (
              <SelectItem key={key} value={key}>
                {info.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Font Weight */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Peso da fonte</label>
        <Select
          value={fontWeight || ""}
          onValueChange={(val) => {
            form.setValue(
              `${elementPath}.fontWeight` as TextStyleFontWeightFieldPath,
              val === "" ? undefined : (val as any)
            );
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Usar peso do tema" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Usar peso do tema</SelectItem>
            {fontWeightOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator orientation="horizontal" />
    </div>
  );
}