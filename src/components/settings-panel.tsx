"use client";

/**
 * Inspetor do editor — direção A.
 *
 * O que mudou e por quê:
 *   - saiu o rail de ícones de 80 px (Brand/Theme/Fonts/Numbers) e as seções
 *     passaram a ser uma coluna única de 280 px com rótulos de 12 px. O rail
 *     gastava largura para repetir o que o rótulo da seção já diz, e obrigava a
 *     dois cliques para chegar ao campo;
 *   - padding de 14 px, linhas de 44 px, borda fina entre seções. Densidade é o
 *     eixo da direção: o operador passa o dia aqui;
 *   - quando há um elemento selecionado, o painel mostra o estilo dele no topo
 *     (mesmo componente StyleMenu de antes), porque a tarefa do momento é
 *     aquela, não o tema do documento.
 *
 * No mobile o painel vira dois drawers (configurações e estilo do elemento) com
 * gatilhos de 44 px, que é o alvo mínimo de toque.
 */
import { cn } from "@/lib/utils";
import { BrandForm } from "@/components/forms/brand-form";
import { ThemeForm } from "@/components/forms/theme-form";
import { FontsForm } from "@/components/forms/fonts-form";
import { PageNumberForm } from "./forms/page-number-form";
import { Brush, Plus } from "lucide-react";
import { Drawer } from "vaul";
import { DrawerContent, DrawerTrigger } from "@/components/drawer";
import { ReactNode } from "react";
import { buttonVariants } from "./ui/button";
import { useSelectionContext } from "@/lib/providers/selection-context";
import { StyleMenu } from "@/components/style-menu";
import { useFormContext } from "react-hook-form";
import { DocumentFormReturn } from "@/lib/document-form-types";

/** Cabeçalho de seção do inspetor: 12 px, caixa alta, discreto. */
function SecaoInspetor({
  titulo,
  extra,
  children,
  primeiro = false,
}: {
  titulo: string;
  extra?: ReactNode;
  children: ReactNode;
  primeiro?: boolean;
}) {
  return (
    <section className={cn(!primeiro && "border-t border-border", "p-section")}>
      <h2 className="rotulo-secao mb-3">
        <span>{titulo}</span>
        {extra}
      </h2>
      {children}
    </section>
  );
}

export function SidebarPanel({ className }: { className?: string }) {
  const form: DocumentFormReturn = useFormContext();
  const { currentSelection } = useSelectionContext();

  return (
    <div className={cn("flex min-h-0 shrink-0 md:h-full", className)}>
      <aside
        className="hidden h-full w-inspector shrink-0 overflow-y-auto border-r border-border bg-background md:block"
        aria-label="Configurações do carrossel"
      >
        <InspetorConteudo />
      </aside>

      {/* Mobile: dois gatilhos, dois drawers. 44 px de alvo. */}
      <div className="block h-0 md:hidden">
        <Drawer.Root modal={true}>
          <DrawerTrigger aria-label="Abrir configurações do carrossel">
            <CircularFloatingButton className="bottom-28 left-3">
              <Plus className="size-4" aria-hidden="true" />
            </CircularFloatingButton>
          </DrawerTrigger>
          <DrawerContent className="h-[60%]">
            <div className="mt-8 overflow-y-auto">
              <InspetorConteudo />
            </div>
          </DrawerContent>
        </Drawer.Root>
      </div>
      <div className="block h-0 md:hidden">
        <Drawer.Root modal={true}>
          <DrawerTrigger aria-label="Abrir estilo do elemento selecionado">
            {currentSelection ? (
              <CircularFloatingButton className="bottom-28 right-3">
                <Brush className="size-4" aria-hidden="true" />
              </CircularFloatingButton>
            ) : null}
          </DrawerTrigger>
          <DrawerContent className="h-[40%]">
            <StyleMenu form={form} className="m-4" />
          </DrawerContent>
        </Drawer.Root>
      </div>
    </div>
  );
}

function InspetorConteudo() {
  const form: DocumentFormReturn = useFormContext();
  const { currentSelection } = useSelectionContext();

  return (
    <div className="flex flex-col">
      {currentSelection ? (
        <div className="border-b border-border p-section">
          <StyleMenu form={form} />
        </div>
      ) : null}

      <SecaoInspetor titulo="Marca" primeiro={!currentSelection}>
        <BrandForm />
      </SecaoInspetor>

      <SecaoInspetor titulo="Tema">
        <ThemeForm />
      </SecaoInspetor>

      <SecaoInspetor titulo="Tipografia">
        <FontsForm />
      </SecaoInspetor>

      <SecaoInspetor titulo="Numeração">
        <PageNumberForm />
      </SecaoInspetor>
    </div>
  );
}

const CircularFloatingButton = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        buttonVariants({
          variant: "default",
          size: "icon",
        }),
        "fixed size-11 rounded-pill p-0",
        className
      )}
    >
      {children}
    </div>
  );
};
