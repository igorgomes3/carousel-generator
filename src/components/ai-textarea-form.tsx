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
import { toast } from "@/components/ui/use-toast";
import { Sparkles } from "lucide-react";
import { generateCarouselSlides } from "@/lib/langchain";
import { DocumentFormReturn } from "@/lib/document-form-types";
import { useState } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Textarea } from "@/components/ui/textarea";
import { useKeysContext } from "@/lib/providers/keys-context";
import { generateCarouselSlidesAction } from "@/app/actions";
import { usePlanoContext } from "@/lib/providers/plano-context";

const FormSchema = z.object({
  prompt: z.string().min(2, {
    message: "Prompt must be at least 2 characters.",
  }),
});

export function AITextAreaForm() {
  const { apiKey } = useKeysContext();
  const { setValue }: DocumentFormReturn = useFormContext(); // retrieve those props
  const [isLoading, setIsLoading] = useState(false);
  const { setPlano } = usePlanoContext();
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      prompt: "",
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setIsLoading(true);

    // Artigo colado: o planejamento continua valendo — a etapa 1 identifica o
    // ângulo dentro do texto, em vez de pedir ao modelo que adivinhe.
    const resultado = await generateCarouselSlidesAction(data.prompt);

    if (resultado) {
      setValue("slides", resultado.slides);
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
                  <Textarea
                    placeholder="An article with content for your carousel"
                    className="flex-1"
                    {...field}
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
