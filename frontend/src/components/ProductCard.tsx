import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "./ui/badge";
import { Stars } from "./ui/stars";
import { money } from "@/lib/utils";

export type ProductLite = {
  id: number; title: string; brand: string; price: number; sale_price: number; discount_percent: number;
  rating_avg: number; rating_count?: number; image: string | null; category?: string; stock?: { status: string; quantity: number };
};

export function ProductCard({ p, onWish }: { p: ProductLite; onWish?: (id: number) => void }) {
  return (
    <article className="group card relative flex flex-col overflow-hidden transition-shadow hover:shadow-pop">
      {p.discount_percent > 0 && <Badge tone="red" className="absolute left-3 top-3 z-10">{p.discount_percent}% off</Badge>}
      {onWish && (
        <button onClick={() => onWish(p.id)} aria-label="Add to wishlist" className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-1.5 text-slate-500 shadow-sm hover:text-rose-600">
          <Heart className="h-4 w-4" />
        </button>
      )}
      <Link to={`/products/${p.id}`} className="block aspect-square overflow-hidden bg-slate-50">
        {p.image && <img src={p.image} alt={p.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />}
      </Link>
      <div className="flex flex-1 flex-col p-3.5">
        <p className="text-xs font-medium text-slate-500">{p.brand}</p>
        <Link to={`/products/${p.id}`} className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-slate-900 hover:text-brand-700">{p.title}</Link>
        <div className="mt-1.5 flex items-center gap-1.5">
          <Stars value={p.rating_avg} />
          {p.rating_count !== undefined && <span className="text-xs text-slate-500">({p.rating_count})</span>}
        </div>
        <div className="mt-auto flex items-baseline gap-2 pt-2.5">
          <span className="text-lg font-bold text-slate-900">{money(p.sale_price)}</span>
          {p.discount_percent > 0 && <span className="text-xs text-slate-400 line-through">{money(p.price)}</span>}
        </div>
        {p.stock?.status === "low_stock" && <p className="mt-1 text-xs font-medium text-amber-700">Only {p.stock.quantity} left</p>}
        {p.stock?.status === "out_of_stock" && <p className="mt-1 text-xs font-medium text-rose-600">Out of stock</p>}
      </div>
    </article>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card overflow-hidden">
          <div className="skeleton aspect-square rounded-none" />
          <div className="space-y-2 p-3.5"><div className="skeleton h-3 w-1/3" /><div className="skeleton h-4 w-full" /><div className="skeleton h-4 w-2/3" /><div className="skeleton h-5 w-1/2" /></div>
        </div>
      ))}
    </div>
  );
}
