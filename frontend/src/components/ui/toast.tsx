import { CheckCircle2, Info, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Toast = { id: number; kind: "success" | "error" | "info"; text: string };
const Ctx = createContext<(kind: Toast["kind"], text: string) => void>(() => {});
let seq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast["kind"], text: string) => {
    const id = ++seq;
    setItems((x) => [...x, { id, kind, text }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 4200);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-2" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={cn("pointer-events-auto flex items-start gap-3 rounded-lg border bg-white p-3 shadow-pop", t.kind === "error" ? "border-rose-200" : t.kind === "success" ? "border-emerald-200" : "border-slate-200")}>
            {t.kind === "success" ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" /> : t.kind === "error" ? <XCircle className="mt-0.5 h-5 w-5 text-rose-600" /> : <Info className="mt-0.5 h-5 w-5 text-brand-600" />}
            <p className="text-sm text-slate-800">{t.text}</p>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
