"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFormContext } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Sparkles } from "lucide-react";
import { generateCarouselSlides } from "@/lib/langchain";
import { DocumentFormReturn } from "@/lib/document-form-types";
import { useState } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { useKeys } from "@/lib/hooks/use-keys";
import { useKeysContext } from "@/lib/providers/keys-context";
import { useStatusContext } from "@/lib/providers/editor-status-context";
import { generateCarouselSlidesAction } from "@/app/actions";
import { usePlanoContext } from "@/lib/providers/plano-context";

const FormSchema = z.object({
  prompt: z.string().min(2, {
    message: "Prompt must be at least 2 characters.",
  }),
});

export function AIInputForm() {
  const { apiKey } = useKeysContext();
  const { setValue }: DocumentFormReturn = useFormContext(); // retrieve those props
  const [isLoading, setIsLoading] = useState(false);
  const { status, setStatus } = useStatusContext();
  const { setPlano } = usePlanoContext();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      prompt: "",
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setIsLoading(true);
    setStatus("loading");

    // Deixa de embrulhar o texto em "A carousel with about ..." — o
    // planejamento já trata o tema como tema. Embrulhar fazia o modelo
    // escrever sobre "um carrossel" em vez de sobre o assunto.
    const resultado = await generateCarouselSlidesAction(data.prompt);

    if (resultado) {
      setValue("slides", resultado.slides);
      // Guarda o material de estratégia para a aba de planejamento.
      setPlano(resultado.estrategia);
      toast({
        title: "Carrossel gerado",
        description: resultado.estrategia.ideia.angulo
          ? `Ângulo: ${resultado.estrategia.ideia.angulo.slice(0, 80)}`
          : "Gerado sem planejamento — a etapa de estratégia falhou.",
      });
    } else {
      toast({
        title: "Falha ao gerar",
        description: "O modelo não devolveu um carrossel válido. Tente de novo.",
        variant: "destructive",
      });
    }
    setStatus("ready");
    setIsLoading(false);
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="max-w-lg w-full m-auto"
      >
        <FormField
          control={form.control}
          name="prompt"
          render={({ field }) => (
            <FormItem>
              <FormLabel></FormLabel>
              <FormControl>
                <div className="flex flex-row gap-2 items-center w-full">
                  <Input
                    placeholder="What's your carousel about"
                    {...field}
                    className="flex-1"
                  />
                  <Button type="submit" className="flex-0">
                    {isLoading ? (
                      <LoadingSpinner />
                    ) : (
                      <span className="flex flex-row gap-1.5">
                        {" "}
                        <Sparkles className="w-4 h-4" /> Generate{" "}
                      </span>
                    )}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
