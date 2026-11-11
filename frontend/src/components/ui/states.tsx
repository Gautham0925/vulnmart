import { AlertTriangle, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export const Skeleton = ({ className }: { className?: string }) => <div className={cn("skeleton", className)} />;

export function EmptyState({ title, text, action, icon }: { title: string; text?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">{icon ?? <Inbox className="h-6 w-6" />}</div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-xl border border-rose-200 bg-rose-50 px-6 py-10 text-center">
      <AlertTriangle className="mb-2 h-8 w-8 text-rose-500" />
      <p className="text-sm font-medium text-rose-800">{message}</p>
      {onRetry && <Button className="mt-4" variant="outline" size="sm" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
