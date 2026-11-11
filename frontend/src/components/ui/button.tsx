import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const variants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm",
        dark: "bg-navy-900 text-white hover:bg-navy-700",
        accent: "bg-amber-400 text-slate-900 hover:bg-amber-300",
        outline: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
        ghost: "text-slate-700 hover:bg-slate-100",
        danger: "bg-rose-600 text-white hover:bg-rose-700",
        subtle: "bg-brand-50 text-brand-700 hover:bg-brand-100",
      },
      size: { sm: "h-8 px-3", md: "h-10 px-4", lg: "h-12 px-6 text-base", icon: "h-9 w-9" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type Props = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof variants> & { loading?: boolean };

export const Button = forwardRef<HTMLButtonElement, Props>(({ className, variant, size, loading, children, disabled, ...rest }, ref) => (
  <button ref={ref} className={cn(variants({ variant, size }), className)} disabled={disabled || loading} {...rest}>
    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
    {children}
  </button>
));
Button.displayName = "Button";
