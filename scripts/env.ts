/**
 * Carrega .env.local ANTES de qualquer import que leia process.env no topo.
 *
 * Import de módulo ES é avaliado na ordem em que aparece, então este arquivo
 * precisa ser o PRIMEIRO import de um script. Sem isso, `const MODELO =
 * process.env.OPENAI_MODEL || "gpt-4o-mini"` (lib/conteudo) congela o default
 * errado e o 9Router responde "No active credentials for provider: openai".
 */
import { config } from "dotenv";
config({ path: ".env.local" });
