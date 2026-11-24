import { TypographyH3 } from "@/components/typography";
import { Sparkles } from "lucide-react";
import { AIInputForm } from "@/components/ai-input-form";

/**
 * Painel de geração do editor legado.
 *
 * Aqui havia um portão de "informe SUA chave da OpenAI" (`NoApiKeysText` +
 * `BringYourKeysDialog`, com a chave guardada no navegador). Saiu por decisão do
 * produto: a chave é do DONO, definida uma vez no painel do administrador
 * (`/admin`) e herdada por todos os usuários. Pedir a chave a cada cliente num
 * SaaS é transferir para ele uma configuração que ele não tem como fazer.
 */
export function AIPanel() {
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <TypographyH3 className="flex flex-row items-center gap-2">
        <Sparkles className="h-6 w-6" /> Gerar com IA
      </TypographyH3>
      <p className="max-w-sm text-center text-xs text-muted-foreground">
        Seis etapas antes de desenhar: ângulo, esqueleto, copy, direção visual, montagem e
        publicação. O plano aparece abaixo para você conferir.
      </p>
      <AIInputForm />
    </div>
  );
}
