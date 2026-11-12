import { useFieldArray, useFormContext } from "react-hook-form";
import {
  DocumentFormReturn,
  SlidesFieldArrayReturn,
} from "@/lib/document-form-types";
import { Document } from "./pages/document";
import { SIZE } from "@/lib/page-size";
import { usePagerContext } from "@/lib/providers/pager-context";
import { useFieldArrayValues } from "@/lib/hooks/use-field-array-values";
import { useSelectionContext } from "@/lib/providers/selection-context";
import { useStatusContext } from "@/lib/providers/editor-status-context";
import { DocumentSkeleton } from "@/components/editor-skeleton";
import { EditorStatusBar } from "@/components/editor-status-bar";
import { Filmstrip } from "@/components/filmstrip";
import { SugestoesPanel } from "@/components/sugestoes-panel";
import { AIPanel } from "@/components/ai-panel";
import { PlanoPanel } from "@/components/plano-panel";
import { useEscalaSlide } from "@/lib/hooks/use-escala-slide";
import { useEffect } from "react";

/**
 * Palco do editor.
 *
 * Direção A: superfície neutra (`bg-canvas`), o slide como única peça colorida,
 * linha de status acima e filmstrip abaixo. Saiu o empilhamento
 * `bg-muted/20` + `bg-primary/10` que o DESIGN.md apontava como lilás sem
 * intenção — agora o palco é um cinza neutro e o slide é o que chama atenção.
 *
 * O palco continua sendo um carrossel do embla com todos os slides na mesma
 * faixa (é o que permite arrastar e editar o slide vizinho); a largura da faixa
 * é de um slide só, então a tela mostra o slide atual, não dois.
 */
interface SlidesEditorProps {}

export function SlidesEditor({}: SlidesEditorProps) {
  const form: DocumentFormReturn = useFormContext();
  const { control, watch } = form;
  const document = watch();
  const { escala, larguraPronta } = useEscalaSlide();
  const { numPages } = useFieldArrayValues("slides");
  const slidesFieldArray: SlidesFieldArrayReturn = useFieldArray({
    control, // control props comes from useForm (optional: if you are using FormContext)
    name: "slides", // unique name for your Field Array
  });
  const { setCurrentSelection } = useSelectionContext();
  const { status, setStatus } = useStatusContext();

  useEffect(() => {
    setStatus("ready");
  }, [setStatus]);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-canvas">
      <EditorStatusBar />

      <div
        className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto overflow-x-hidden"
        // Clicar no palco desmarca o elemento selecionado.
        onClick={(event) => {
          setCurrentSelection("", event);
        }}
      >
        <div className="flex w-full flex-col items-center px-2 py-4 md:px-5 md:py-5">
          {!larguraPronta || status == "loading" ? (
            <DocumentSkeleton />
          ) : (
            <Document
              document={document}
              slidesFieldArray={slidesFieldArray}
              scale={escala}
            />
          )}
        </div>

        {/* Os painéis de pauta/plano são conteúdo, não chrome: ficam na coluna
            do palco, com largura de leitura, abaixo do slide. */}
        <div className="flex w-full flex-col items-center gap-3 px-3 pb-4 md:px-5">
          <SugestoesPanel
            onDocumento={(slides) => {
              // Desenha na hora o que a fila gerou: sem isso a pessoa gera e não
              // vê nada mudar, que é exatamente a queixa de "não mudou nada".
              form.setValue("slides", slides as never, { shouldDirty: true });
            }}
          />
          <AIPanel />
          <PlanoPanel />
        </div>
      </div>

      {numPages ? <Filmstrip /> : null}
    </div>
  );
}
