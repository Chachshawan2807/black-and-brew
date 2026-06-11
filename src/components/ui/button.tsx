"use client";

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-3xl text-sm font-normal text-foreground bb-transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/10 focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[#000000] text-white bb-shadow-sm hover:bg-[#1a1a1a] dark:bg-[#f2f1e6] dark:text-[#161614] dark:hover:bg-[#e8e7dc]",
        destructive:
          "bg-red-50 text-red-500 bb-shadow-sm hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/15",
        outline:
          "border border-black/5 dark:border-white/10 bg-transparent bb-shadow-sm hover:bg-black/5 dark:hover:bg-white/10",
        secondary:
          "bg-black/5 text-foreground hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15",
        ghost: "hover:bg-black/5 dark:hover:bg-white/10",
        link: "text-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-3xl px-3 text-xs",
        lg: "h-10 rounded-3xl px-8",
        icon: "h-9 w-9",
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
