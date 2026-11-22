import * as z from "zod";

export const ColorSchema = z.object({
  // primary: z.string().min(4).max(9).regex(/^#/),
  primary: z.string().min(7).max(7).regex(/^#/),
  secondary: z.string(),
  background: z.string(),
});

export const ThemeSchema = ColorSchema.extend({
  isCustom: z.boolean().default(false),
  /**
   * Legado: nome da paleta daisyUI (`black`, `olivia`…). O produto não oferece
   * paleta desde a issue #8 — a cor vem do template. O campo continua no
   * documento, com default, porque carrossel salvo o traz e o editor o regrava:
   * removê-lo do schema faria documento antigo falhar no parse e a peça do
   * usuário ser descartada. Nada lê este campo para decidir cor.
   */
  pallette: z.string().default("black"),
  // Estilo do fundo do slide. Precisa de default: documentos ja salvos no
  // localStorage nao tem esse campo, e o carregamento faz safeParse — sem
  // default o parse falha e o carrossel salvo do usuario seria descartado.
  backgroundStyle: z.string().default("solido"),
  // Imagem de fundo do slide (opcional)
  backgroundImage: z
    .object({
      source: z.object({
        src: z.string().url().or(z.literal("")),
        type: z.enum(["URL", "UPLOAD", "GENERATED"]),
      }).default({ src: "", type: "URL" }),
      style: z.object({
        opacity: z.number().min(0).max(100).default(100),
      }).default({ opacity: 100 }),
    })
    .optional(),
});
