import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function Logo({ className, tagline }: { className?: string; tagline?: boolean }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2.5", className)} aria-label="VulnMarket home">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 shadow-sm">
        <svg viewBox="0 0 64 64" className="h-6 w-6" aria-hidden><path d="M14 18h9l9 24 9-24h9L36 50h-8z" fill="#fff" /></svg>
      </span>
      <span className="leading-none">
        <span className="block text-[17px] font-extrabold tracking-wide text-white">VULNMARKET</span>
        {tagline && <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Shop. Explore. Exploit. Learn.</span>}
      </span>
    </Link>
  );
}
