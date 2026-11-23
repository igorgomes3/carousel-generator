"use client";
/**
 * Fonte do documento do editor legado.
 *
 * ## O que sobrou aqui (W97, 23/11/2026)
 *
 * O editor antigo foi desligado em 22/11 (`/carrossel/<id>/editar` redireciona
 * para o estúdio) e a única superfície que ainda monta este provider é o link
 * público `/p/<token>` — que passa `documentoInicial` e não salva nada.
 *
 * Por isso o provider perdeu, de propósito:
 *
 *   - a leitura da **marca** da organização (`/api/ac/carrossel/marca`), que era
 *     dado do AutoClinic. Quem assina o card agora é o `arroba`/`estilo` do
 *     projeto do estúdio;
 *   - a leitura do projeto por id (`/api/ac/carrossel/carrosseis/<id>`) e o
 *     autosave (`useAutosaveProjeto`) — os dois falavam com a API do AutoClinic,
 *     que não está mais no caminho do carrossel.
 *
 * Carregar documento salvo nunca passa pelo schema rígido: `normalizarDocumento`
 * preenche o que falta e devolve o que dá para desenhar. Ler direto com o schema
 * descartava o carrossel inteiro por causa de um campo.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import FormProvider from "@/lib/providers/form-provider";
import { useRetrieveFormValues, usePersistFormValues } from "@/lib/hooks/use-persist-form";
import { DocumentSchema } from "@/lib/validation/document-schema";
import { normalizarDocumento } from "@/lib/compat/documento-salvo";
import { PagerProvider } from "@/lib/providers/pager-context";
import { usePager } from "@/lib/hooks/use-pager";
import { SelectionProvider } from "@/lib/providers/selection-context";
import { useSelection } from "@/lib/hooks/use-selection";
import { DocumentFormReturn } from "@/lib/document-form-types";
import { defaultValues } from "@/lib/default-document";
import { KeysProvider } from "@/lib/providers/keys-context";
import { useKeys } from "@/lib/hooks/use-keys";
import { StatusProvider } from "@/lib/providers/editor-status-context";
import { PlanoProvider } from "@/lib/providers/plano-context";
import { SalvamentoProvider } from "@/lib/providers/salvamento-context";

const FORM_DATA_KEY = "documentFormKey";

export function DocumentProvider({
  children,
  documentoInicial = null,
}: {
  children: React.ReactNode;
  documentoInicial?: unknown;
}) {
  const { getSavedData } = useRetrieveFormValues(
    FORM_DATA_KEY,
    defaultValues,
    DocumentSchema,
    normalizarDocumento,
  );

  const documentoNormalizado = documentoInicial
    ? normalizarDocumento(documentoInicial)
    : null;

  const documentForm: DocumentFormReturn = useForm<z.infer<typeof DocumentSchema>>({
    resolver: zodResolver(DocumentSchema),
    defaultValues: documentoNormalizado ?? getSavedData(),
  });

  usePersistFormValues({
    localStorageKey: FORM_DATA_KEY,
    values: documentForm.getValues(),
  });

  const keys = useKeys();
  const selection = useSelection();
  const pager = usePager(0);

  return (
    <KeysProvider value={keys}>
      <FormProvider {...documentForm}>
        <StatusProvider>
          <PlanoProvider>
            <SelectionProvider value={selection}>
              <PagerProvider value={pager}>
                <SalvamentoProvider
                  value={{ estado: "ocioso", erro: null, titulo: "", projetoId: null }}
                >
                  {/* min-h-0 é obrigatório: sem ele o `min-height: auto` do
                      flex deixa o palco crescer até a altura do conteúdo e o
                      filmstrip sai da dobra. */}
                  <div className="flex min-h-0 flex-1 flex-col">{children}</div>
                </SalvamentoProvider>
              </PagerProvider>
            </SelectionProvider>
          </PlanoProvider>
        </StatusProvider>
      </FormProvider>
    </KeysProvider>
  );
}
