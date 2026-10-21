"use client";

import { useFormContext, FormProvider } from "react-hook-form";
import * as z from "zod";

import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { DocumentFormReturn } from "@/lib/document-form-types";

const ImageInputType = z.enum(["URL", "UPLOAD", "GENERATED"]);
type ImageInputType = z.infer<typeof ImageInputType>;

interface BackgroundImagePickerProps {
  form: DocumentFormReturn;
}

export function BackgroundImagePicker({ form }: BackgroundImagePickerProps) {
  const { control, watch } = form;

  const fieldName = "config.theme.backgroundImage";
  const sourceType = watch(`${fieldName}.source.type`) || "URL";
  const sourceSrc = watch(`${fieldName}.source.src`) || "";
  const opacity = watch(`${fieldName}.style.opacity`) || 100;

  return (
    <FormProvider {...form}>
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        {/* Tipo de fonte da imagem */}
        <FormField
          control={control}
          name={`${fieldName}.source.type`}
          render={({ field }) => (
            <div className="space-y-2">
              <label className="text-sm font-medium">Origem da imagem</label>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="URL">URL externa</SelectItem>
                  <SelectItem value="UPLOAD">Upload (data URL)</SelectItem>
                  <SelectItem value="GENERATED">Gerada por IA (futuro)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        />

        {/* URL da imagem */}
        {sourceType === "URL" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">URL da imagem</label>
            <Input
              placeholder="https://exemplo.com/imagem.jpg"
              {...form.register(`${fieldName}.source.src`)}
              type="url"
            />
          </div>
        )}

        {/* Upload (data URL) */}
        {sourceType === "UPLOAD" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Data URL (base64)</label>
            <Input
              placeholder="data:image/png;base64,..."
              {...form.register(`${fieldName}.source.src`)}
            />
            <p className="text-xs text-muted-foreground">
              Cole a data URL completa (começando com data:image/...;base64,)
            </p>
          </div>
        )}

        {/* Opacidade */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Opacidade: {opacity}%</label>
          <Slider
            min={0}
            max={100}
            step={1}
            value={[opacity]}
            onValueChange={([v]) => form.setValue(`${fieldName}.style.opacity`, v)}
          />
        </div>

        {/* Botão aplicar a todos os slides */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              const slides = form.getValues("slides");
              const bg = (form.getValues("config.theme.backgroundImage") || {
                type: "Image",
                style: { opacity: 100 },
                source: { type: "URL", src: "" },
              }) as any;
              slides.forEach((_, index) => {
                form.setValue(`slides.${index}.backgroundImage`, bg);
              });
            }}
            className="text-sm text-primary hover:underline"
          >
            Aplicar esta imagem a todos os slides
          </button>
        </div>
      </form>
    </FormProvider>
  );
}