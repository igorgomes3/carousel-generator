import { useCallback, useEffect } from "react";

/**
 * O mínimo que o hook precisa de um schema: validar e devolver o dado.
 *
 * Tipar isso por `ZodType<T>` obrigava o chamador a casar o tipo de SAÍDA do
 * schema com o tipo dos defaults, e os dois divergem em todo schema que usa
 * `.default()` (na entrada o campo é opcional, na saída é obrigatório). O hook
 * não usa mais nada do Zod além do `safeParse`, então é só isso que ele declara —
 * e o dado volta como `T` depois da checagem, que é o contrato que interessa.
 */
type SchemaParseavel = {
  safeParse: (valor: unknown) => { success: boolean; data?: unknown; error?: unknown };
};

export function useRetrieveFormValues<T>(
  localStorageKey: string,
  defaultValues: T,
  schema: SchemaParseavel,
  /**
   * Conserta o que veio do navegador antes de desistir dele. Sem isto, um
   * rascunho salvo por uma versão antiga do editor que não bate com o schema
   * atual era jogado fora — junto com todo o resto do localStorage, que a versão
   * anterior limpava por inteiro. Rascunho é trabalho do usuário: o schema
   * decide o que entra na tela, o normalizador decide o que dá para salvar.
   */
  normalizar?: (bruto: unknown) => unknown
) {
  const getSavedData: () => T | undefined = useCallback(() => {
    const localStorage =
      typeof window !== "undefined" ? window.localStorage : undefined;
    if (!localStorage) {
      return undefined;
    }
    const data = localStorage.getItem(localStorageKey);
    if (data) {
      try {
        const parsedData: unknown = JSON.parse(data);
        const safeParseResult = schema.safeParse(parsedData);
        if (safeParseResult.success) {
          return safeParseResult.data as T;
        }
        console.error(safeParseResult.error);
        // `localStorage.clear()` saiu daqui: apagava também o token de refresh e
        // qualquer outra chave do produto por causa de um campo de um rascunho.
        if (normalizar) return normalizar(parsedData) as T;
        return defaultValues;
      } catch (err) {
        console.log(err);
      }
    }
    return defaultValues;
  }, [defaultValues, localStorageKey, schema, normalizar]);

  return { getSavedData };
}

export const usePersistFormValues = ({
  localStorageKey,
  values,
}: {
  localStorageKey: string;
  values: any;
}) => {
  useEffect(() => {
    const localStorage =
      typeof window !== "undefined" ? window.localStorage : undefined;
    localStorage?.setItem(localStorageKey, JSON.stringify(values));
  }, [values, localStorageKey]);

  return;
};
