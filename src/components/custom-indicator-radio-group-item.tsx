"use client";

import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";

import { cn } from "@/lib/utils";

export const CustomIndicatorRadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, children, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      // Nome acessível de reserva: os swatches de paleta são só cor, então sem
      // isto o leitor de tela anuncia "botão" e nada mais. O valor do grupo
      // ("black", "aqua", …) é o único nome honesto disponível no componente.
      aria-label={
        props["aria-label"] ??
        props["aria-labelledby"] ??
        String(props.value ?? "opção")
      }
      className={cn(
        "border-2 p-0.5 text-primary disabled:cursor-not-allowed disabled:opacity-50 data-[state=unchecked]:border-muted data-[state=checked]:border-foreground rounded",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        asChild
        className="flex items-center justify-center"
      ></RadioGroupPrimitive.Indicator>
      {children}
    </RadioGroupPrimitive.Item>
  );
});
CustomIndicatorRadioGroupItem.displayName =
  RadioGroupPrimitive.Item.displayName;
