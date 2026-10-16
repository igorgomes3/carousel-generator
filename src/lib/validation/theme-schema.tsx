import * as z from "zod";

export const ColorSchema = z.object({
  // primary: z.string().min(4).max(9).regex(/^#/),
  primary: z.string().min(7).max(7).regex(/^#/),
  secondary: z.string(),
  background: z.string(),
});

export const ThemeSchema = ColorSchema.extend({
  isCustom: z.boolean(),
  pallette: z.string(),
  // Estilo do fundo do slide. Precisa de default: documentos ja salvos no
  // localStorage nao tem esse campo, e o carregamento faz safeParse — sem
  // default o parse falha e o carrossel salvo do usuario seria descartado.
  backgroundStyle: z.string().default("solido"),
});
