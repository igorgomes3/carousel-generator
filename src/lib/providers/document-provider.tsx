"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import FormProvider from "@/lib/providers/form-provider";
import * as z from "zod";
import { useEffect, useState } from "react";
import {
  useRetrieveFormValues,
  usePersistFormValues,
} from "@/lib/hooks/use-persist-form";

import { DocumentSchema } from "@/lib/validation/document-schema";
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
import { apiJson } from "@/lib/auth/sessao";
import { useAutosaveProjeto } from "@/lib/hooks/use-autosave-projeto";
import { SalvamentoProvider } from "@/lib/providers/salvamento-context";

const FORM_DATA_KEY = "documentFormKey";

export interface ProjetoCarrossel {
  id: string;
  titulo: string;
  versao_atual: number;
  documento: unknown;
}

/** Marca da organização — nome e @ que saem no slide, não do editor. */
export interface MarcaConta {
  nome: string;
  handle: string;
  avatar_url: string | null;
}

const ORG = "org=autoclinic";

/**
 * Fonte do documento do editor. Três modos, e a diferença entre eles importa:
 *
 *   - `projetoId`: documento vem do banco e autosave grava no banco; o
 *     localStorage NÃO é usado (duas fontes de verdade produzem "salvei e sumiu");
 *   - `documentoInicial`: leitura, sem autosave (link público);
 *   - nenhum dos dois: editor novo ainda no localStorage — modo legado, que a
 *     galeria oferece para importar uma vez.
 */
export function DocumentProvider({
  children,
  projetoId = null,
  documentoInicial = null,
}: {
  children: React.ReactNode;
  projetoId?: string | null;
  documentoInicial?: unknown;
}) {
  const { getSavedData } = useRetrieveFormValues(
    FORM_DATA_KEY,
    defaultValues,
    DocumentSchema
  );

  const [pronto, setPronto] = useState(!projetoId);
  const [titulo, setTitulo] = useState("");
  const [falha, setFalha] = useState<string | null>(null);

  const lido = documentoInicial
    ? DocumentSchema.safeParse(documentoInicial)
    : null;

  const documentForm: DocumentFormReturn = useForm<
    z.infer<typeof DocumentSchema>
  >({
    resolver: zodResolver(DocumentSchema),
    defaultValues:
      (lido?.success ? lido.data : undefined) ??
      (projetoId ? defaultValues : getSavedData()),
  });

  const autosave = useAutosaveProjeto(documentForm, projetoId, titulo);

  // Marca da organização no editor novo. Carrossel que já existe não passa por
  // aqui: o servidor devolve o documento com a marca do dono aplicada (e marca
  // vazia já vem vazia, para a assinatura ser omitida).
  const [marca, setMarca] = useState<MarcaConta | null>(null);

  useEffect(() => {
    if (projetoId || documentoInicial) return;
    let cancelado = false;
    apiJson<{ marca: MarcaConta }>(`/carrossel/marca?${ORG}`)
      .then((r) => {
        if (!cancelado && r?.marca) setMarca(r.marca);
      })
      .catch(() => {
        // Sem marca a assinatura fica vazia — o editor não pode deixar de abrir
        // porque a leitura da marca falhou.
      });
    return () => {
      cancelado = true;
    };
  }, [projetoId, documentoInicial]);

  useEffect(() => {
    if (!marca) return;
    const atual = documentForm.getValues("config.brand") as
      | { name?: string; handle?: string }
      | undefined;
    const nomeAtual = (atual?.name ?? "").trim();
    // Só preenche o que está vazio: marca escrita à mão (inclusive num rascunho
    // importado do navegador) continua valendo.
    if (!nomeAtual) documentForm.setValue("config.brand.name", marca.nome);
    if (!(atual?.handle ?? "").trim())
      documentForm.setValue("config.brand.handle", marca.handle);
  }, [marca, documentForm]);

  // Carrega o projeto antes de liberar o editor: abrir com o documento padrão e
  // trocar depois mostraria o conteúdo errado por um instante e, pior,
  // dispararia autosave por cima do que estava sendo carregado.
  useEffect(() => {
    if (!projetoId) return;
    let cancelado = false;
    (async () => {
      try {
        const r = await apiJson<{ carrossel: ProjetoCarrossel }>(
          `/carrossel/carrosseis/${projetoId}?org=autoclinic`
        );
        if (cancelado) return;
        const parsed = DocumentSchema.safeParse(r.carrossel.documento);
        documentForm.reset(parsed.success ? parsed.data : defaultValues);
        setTitulo(r.carrossel.titulo);
        autosave.definirTitulo(r.carrossel.titulo);
      } catch (e) {
        if (!cancelado) {
          setFalha(
            e instanceof Error ? e.message : "Não foi possível abrir o projeto"
          );
        }
      } finally {
        if (!cancelado) setPronto(true);
      }
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projetoId]);

  usePersistFormValues({
    localStorageKey: FORM_DATA_KEY,
    // Em modo projeto o banco é a fonte; gravar no navegador criaria duas.
    values: projetoId ? undefined : documentForm.getValues(),
  });

  const keys = useKeys();

  const selection = useSelection();

  const pager = usePager(0);

  if (!pronto) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Abrindo carrossel…</p>
      </div>
    );
  }

  if (falha) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <p className="text-sm text-destructive text-center">
          {falha}. Volte para a galeria e abra de novo.
        </p>
      </div>
    );
  }

  return (
    <KeysProvider value={keys}>
      <FormProvider {...documentForm}>
        <StatusProvider>
          <PlanoProvider>
            <SelectionProvider value={selection}>
              <PagerProvider value={pager}>
                <SalvamentoProvider
                  value={{
                    estado: autosave.estado,
                    erro: autosave.erro,
                    titulo,
                    projetoId,
                  }}
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
