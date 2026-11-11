import type { ReactNode } from "react";
import { cn, money } from "@/lib/utils";
import { Skeleton } from "@/components/ui/states";

export function Stat({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: string; icon?: ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-500">{label}</p>{icon && <span className="text-slate-400">{icon}</span>}</div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Table({ head, children, loading }: { head: string[]; children: ReactNode; loading?: boolean }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="border-b border-surface-line bg-slate-50"><tr>{head.map((h) => <th key={h} className="table-th">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-surface-line">
            {loading ? Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={head.length} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>) : children}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function BarChart({ data, height = 180 }: { data: { label: string; value: number }[]; height?: number }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-3" style={{ height }} role="img" aria-label="Revenue by month">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center justify-end gap-1.5" style={{ height: "100%" }}>
          <span className="text-[11px] font-medium text-slate-500">{money(d.value)}</span>
          <div className={cn("w-full rounded-t-md bg-brand-500")} style={{ height: `${Math.max(4, (d.value / max) * (height - 44))}px` }} />
          <span className="text-xs text-slate-500">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
