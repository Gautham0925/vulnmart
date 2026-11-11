import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./button";

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = "Confirm", danger, onConfirm }: {
  open: boolean; onOpenChange: (v: boolean) => void; title: string; description: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void;
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button variant={danger ? "danger" : "primary"} onClick={() => { onConfirm(); onOpenChange(false); }}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}

export function Modal({ open, onOpenChange, title, description, children }: { open: boolean; onOpenChange: (v: boolean) => void; title: string; description?: string; children?: ReactNode }) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-[1px]" />
        <D.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,460px)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-pop">
          <D.Title className="text-lg font-semibold text-slate-900">{title}</D.Title>
          {description ? <D.Description className="mt-1.5 text-sm text-slate-600">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
          {children}
          <D.Close className="absolute right-4 top-4 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close"><X className="h-4 w-4" /></D.Close>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
