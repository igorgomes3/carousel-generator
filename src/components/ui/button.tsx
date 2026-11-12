import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Botão da direção A: 32 px de altura no desktop (densidade de ferramenta) e
 * 44 px no mobile, que é o alvo mínimo de toque. Raio de 6 px, texto de 14 px,
 * um acento só — o preenchimento indigo é a ação primária da região.
 *
 * O foco não é declarado aqui de propósito: o anel de 2 px vive em
 * globals.css (`:focus-visible`), então todo controle focável — inclusive os
 * que não são deste componente — responde igual. Declarar
 * `focus-visible:outline-none` sem anel substituto foi o que apagou o foco em
 * várias telas do shadcn.
 */
const buttonVariants = cva(
  "inline-flex min-w-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-sm text-control font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 md:min-w-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:brightness-95",
        destructive:
          "bg-destructive text-destructive-foreground hover:brightness-95",
        outline:
          "border border-input bg-background text-foreground hover:bg-secondary",
        secondary:
          "bg-secondary text-secondary-foreground hover:brightness-[0.98]",
        ghost: "text-subtle hover:bg-secondary hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-3 md:h-8",
        sm: "h-11 px-2.5 md:h-7",
        lg: "h-11 px-5",
        icon: "h-11 w-11 md:h-8 md:w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
