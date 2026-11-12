"use client";

import { SidebarPanel } from "@/components/settings-panel";
import { SlidesEditor } from "@/components/slides-editor";
import React from "react";
import { useComponentPrinter } from "@/lib/hooks/use-component-printer";

import { RefProvider } from "@/lib/providers/reference-context";
import { MainNav } from "./main-nav";

/**
 * Editor — direção A: barra de 48 px, inspetor de 280 px, palco neutro.
 *
 * A grade virou flex de propósito: o inspetor tem largura de token
 * (`w-inspector`) e o palco ocupa o resto com `min-w-0`, então em nenhuma
 * largura de 360 a 1440 o conteúdo empurra a página para fora — o que estoura é
 * o que tem `min-w-0` faltando, não o que tem largura fixa.
 */
export default function Editor({}: {}) {
  const { componentRef, handleDownloadPngs, isExporting } =
    useComponentPrinter();

  return (
    <RefProvider myRef={componentRef}>
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <MainNav
          handleDownloadPngs={handleDownloadPngs}
          isExporting={isExporting}
        />
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <SidebarPanel />
          <SlidesEditor />
        </div>
      </div>
    </RefProvider>
  );
}
