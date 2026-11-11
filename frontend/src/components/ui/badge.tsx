import { cn } from "@/lib/utils";

const tones = {
  slate: "bg-slate-100 text-slate-700",
  brand: "bg-brand-50 text-brand-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-800",
  red: "bg-rose-50 text-rose-700",
  sky: "bg-sky-50 text-sky-700",
  dark: "bg-navy-800 text-slate-100",
};

export function Badge({ tone = "slate", className, children }: { tone?: keyof typeof tones; className?: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}>{children}</span>;
}

export const statusTone = (s: string): keyof typeof tones =>
  ({ delivered: "green", shipped: "sky", placed: "brand", cancelled: "red", approved: "green", hidden: "red", pending: "amber" } as Record<string, keyof typeof tones>)[s] ?? "slate";
