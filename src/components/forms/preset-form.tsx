"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";

import { cn } from "@/lib/utils";
import { fontIdToClassName } from "@/lib/fonts-map";
import { cssDoFundo, ESTILOS_FUNDO } from "@/lib/background-styles";
import { PRESETS, type Preset } from "@/lib/presets";
import { DocumentFormReturn } from "@/lib/document-form-types";

/** Miniatura de um slide de verdade: fundo, barra de titulo e linhas de corpo. */
function PreviaDoPreset({ preset }: { preset: Preset }) {
  const { cores, fundo } = preset;
  return (
    <span
      className="relative flex h-16 w-[51px] shrink-0 flex-col justify-between overflow-hidden rounded border p-1.5"
      style={cssDoFundo(fundo, cores)}
      aria-hidden
    >
      <span
        className={cn(
          "block text-[7px] font-black leading-[0.95]",
          fontIdToClassName(preset.fontes.font1),
        )}
        style={{ color: cores.primary }}
      >
        Aa
      </span>
      <span className="flex flex-col gap-[3px]">
        <span
          className="block h-[2px] w-full rounded-full"
          style={{ background: cores.secondary, opacity: 0.65 }}
        />
        <span
          className="block h-[2px] w-3/4 rounded-full"
          style={{ background: cores.secondary, opacity: 0.4 }}
        />
      </span>
    </span>
  );
}

/** Descobre qual preset esta aplicado, comparando os valores de verdade. */
function presetAtivo(form: DocumentFormReturn): string | null {
  const valores = form.getValues();
  const t = valores.config.theme;
  const f = valores.config.fonts;
  const encontrado = PRESETS.find(
    (p) =>
      p.cores.primary === t.primary &&
      p.cores.secondary === t.secondary &&
      p.cores.background === t.background &&
      p.fundo === t.backgroundStyle &&
      p.fontes.font1 === f.font1 &&
      p.fontes.font2 === f.font2,
  );
  return encontrado?.slug ?? null;
}

export function PresetPicker() {
  const form: DocumentFormReturn = useFormContext();
  const { setValue, watch } = form;

  // Observar os campos faz o painel redesenhar quando um preset muda algo.
  watch("config.theme.primary");
  watch("config.theme.secondary");
  watch("config.theme.background");
  watch("config.theme.backgroundStyle");
  watch("config.fonts.font1");
  watch("config.fonts.font2");

  const ativo = presetAtivo(form);

  function aplicar(p: Preset) {
    setValue("config.theme.primary", p.cores.primary);
    setValue("config.theme.secondary", p.cores.secondary);
    setValue("config.theme.background", p.cores.background);
    setValue("config.theme.backgroundStyle", p.fundo);
    // Entra no modo personalizado: assim os campos abaixo mostram o que o
    // preset escreveu, em vez de deixar um estado escondido.
    setValue("config.theme.isCustom", true);
    setValue("config.fonts.font1", p.fontes.font1);
    setValue("config.fonts.font2", p.fontes.font2);
  }

  return (
    <div className="space-y-3">
      {/* Uma coluna, nao duas. O painel tem 190px: em duas colunas cada cartao
          fica com 91px, a miniatura consome 51px e sobram 14px para o texto —
          que entao vaza por cima do cartao vizinho. Em uma coluna o nome e a
          descricao cabem de verdade. */}
      <div className="flex flex-col gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.slug}
            type="button"
            onClick={() => aplicar(p)}
            title={`${p.nome} — ${p.descricao}`}
            className={cn(
              "flex w-full items-center gap-2.5 overflow-hidden rounded-md border p-2 text-left transition-colors",
              ativo === p.slug
                ? "border-primary ring-2 ring-primary/30"
                : "hover:border-primary/40",
            )}
          >
            <PreviaDoPreset preset={p} />
            {/* min-w-0 deixa o bloco encolher; break-words impede que uma
                palavra longa escape em vez de quebrar linha. */}
            <span className="min-w-0 flex-1 break-words">
              <span className="block text-xs font-semibold leading-tight">
                {p.nome}
              </span>
              <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
                {p.descricao}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function FundoPicker() {
  const form: DocumentFormReturn = useFormContext();
  const { setValue, watch } = form;
  const estilo = watch("config.theme.backgroundStyle");
  const cores = watch("config.theme");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-6 gap-1.5">
        {ESTILOS_FUNDO.map((e) => (
          <button
            key={e.slug}
            type="button"
            onClick={() => setValue("config.theme.backgroundStyle", e.slug)}
            title={`${e.nome} — ${e.descricao}`}
            className={cn(
              "h-9 overflow-hidden rounded border",
              estilo === e.slug
                ? "ring-2 ring-primary ring-offset-1"
                : "hover:border-primary/40",
            )}
            style={cssDoFundo(e.slug, cores)}
          >
            <span className="sr-only">{e.nome}</span>
          </button>
        ))}
      </div>
      <p className="break-words text-xs leading-snug text-muted-foreground">
        {ESTILOS_FUNDO.find((e) => e.slug === estilo)?.nome ?? "Sólido"} —{" "}
        {ESTILOS_FUNDO.find((e) => e.slug === estilo)?.descricao ?? "Cor chapada"}
      </p>
    </div>
  );
}
