import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Input denso: 32 px no desktop, 44 px no mobile (alvo de toque), raio 6 px,
 * texto de 14 px — nunca abaixo disso, porque input é conteúdo digitado.
 * O anel de foco vem de `:focus-visible` em globals.css.
 */
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-sm border border-input bg-background px-2.5 py-2 text-control text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:h-8",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
