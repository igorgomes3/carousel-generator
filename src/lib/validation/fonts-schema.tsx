import * as z from "zod";
import { ElementType } from "@/lib/validation/element-type";

export type ElementTypeKey = "Title" | "Subtitle" | "Description";

export const FontsSchema = z.object({
  // Mapa por tipo de elemento; default: Title->font1, Subtitle->font1, Description->font2
  elementFonts: z
    .record(
      z.enum(["Title", "Subtitle", "Description"]),
      z.string()
    )
    .default({
      Title: "DM_Serif_Display",
      Subtitle: "DM_Serif_Display",
      Description: "DM_Sans",
    }),
  // Campos legados (retrocompatibilidade)
  font1: z.string().default("DM_Serif_Display"),
  font2: z.string().default("DM_Sans"),
});

export type FontsConfig = z.infer<typeof FontsSchema>;