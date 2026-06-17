import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-[22px] px-4 text-center text-sm font-semibold leading-tight transition duration-200 hover:-translate-y-px active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 disabled:hover:translate-y-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white shadow-glass hover:bg-primary/90 dark:text-background",
        secondary: "border border-primary/15 bg-primary-soft text-foreground hover:border-primary/35 hover:bg-primary-soft/80",
        ghost: "text-foreground hover:bg-muted hover:text-primary",
        outline: "border border-card-border bg-card hover:border-primary/35 hover:bg-muted",
        danger: "bg-danger text-white hover:bg-danger/90"
      },
      size: {
        sm: "min-h-9 px-3 text-xs",
        md: "min-h-11 px-4",
        lg: "min-h-12 px-5 text-base",
        icon: "size-11 rounded-[18px] p-0"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
