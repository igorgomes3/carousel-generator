import * as z from "zod";
import { DEFAULT_IMAGE_INPUT, ImageSchema } from "./image-schema";

export const BrandSchema = z.object({
  avatar: ImageSchema.default(DEFAULT_IMAGE_INPUT),
  // Vazio é válido: marca vazia significa "não imprimir assinatura". Exigir
  // dois caracteres aqui era o que empurrava o operador para o placeholder.
  name: z
    .string()
    .max(30, {
      message: "Name must not be longer than 30 characters.",
    }),
  handle: z.string(),
});
