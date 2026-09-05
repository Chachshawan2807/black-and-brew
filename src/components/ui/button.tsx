"use client";

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-normal text-foreground bb-transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/10 focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] motion-reduce:active:scale-100",
  {
    variants: {
      variant: {
        default:
          "border-2 border-foreground/85 bg-card bb-shadow-sm hover:bg-muted/35 hover:border-foreground hover:-translate-y-px hover:bb-shadow-md",
        destructive:
          "border border-red-500/80 bg-card text-red-600 bb-shadow-sm hover:bg-red-50 hover:-translate-y-px hover:bb-shadow-md dark:hover:bg-red-950/20",
        outline:
          "border border-border/80 bg-card bb-shadow-sm hover:bg-muted/40 hover:border-border hover:-translate-y-px hover:bb-shadow-md",
        secondary:
          "border border-border/80 bg-muted/30 text-foreground hover:bg-muted/50 hover:border-border hover:-translate-y-px",
        ghost:
          "border border-transparent hover:bg-muted/35 hover:border-border/60",
        link: "border-transparent text-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 min-h-[44px] px-4 py-2",
        sm: "h-9 min-h-[44px] rounded-2xl px-3 text-xs",
        lg: "h-11 min-h-[44px] rounded-2xl px-8",
        icon: "h-10 w-10 min-h-[44px] min-w-[44px] border border-border/80 bg-card hover:bg-muted/40",
      },
    defaultVariants: {
      variant: "outline",
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
