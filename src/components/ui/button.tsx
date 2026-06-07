"use client";

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-3xl text-sm font-normal bb-transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#000000]/10 focus-visible:ring-offset-1 focus-visible:ring-offset-[#fdfcf0] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[#000000] text-white bb-shadow-sm hover:bg-[#1a1a1a]",
        destructive:
          "bg-red-50 text-red-500 bb-shadow-sm hover:bg-red-100",
        outline:
          "border border-[#000000]/5 bg-transparent bb-shadow-sm hover:bg-[#000000]/5 hover:text-[#000000]",
        secondary:
          "bg-[#000000]/5 text-[#000000] hover:bg-[#000000]/10",
        ghost: "hover:bg-[#000000]/5 hover:text-[#000000]",
        link: "text-[#000000] underline-offset-4 hover:underline",
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
