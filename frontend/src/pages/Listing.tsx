import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ProductCard, ProductGridSkeleton, type ProductLite } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useFetch, useDocumentTitle } from "@/lib/hooks";
import { useToast } from "@/components/ui/toast";

type Result = { items: ProductLite[]; total: number; page: number; page_size: number };
type Category = { slug: string; name: string };

const PRICE_BANDS = [["", "Any price"], ["0-1000", "Under ₹1,000"], ["1000-5000", "₹1,000 – ₹5,000"], ["5000-20000", "₹5,000 – ₹20,000"], ["20000-", "Over ₹20,000"]];

export default function Listing({ mode }: { mode: "category" | "search" | "deals" }) {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const cats = useFetch<Category[]>("/api/categories");

  const q = params.get("q") ?? "";
  const sort = params.get("sort") ?? (mode === "deals" ? "discount" : "relevance");
  const band = params.get("price") ?? "";
  const page = Number(params.get("page") ?? 1);
  const category = mode === "category" ? slug : params.get("category") ?? "";

  const url = useMemo(() => {
    const p = new URLSearchParams();
    const [min, max] = band ? band.split("-") : ["", ""];
    if (min) p.set("min_price", min);
    if (max) p.set("max_price", max);
    if (category) p.set("category", category);
    p.set("sort", sort);
    p.set("page", String(page));
    p.set("page_size", "12");
    if (mode === "search") { p.set("q", q); return `/api/products/search?${p}`; }
    return `/api/products?${p}`;
  }, [mode, q, sort, band, page, category]);

  const { data, loading, error, reload } = useFetch<Result>(url);
  const current = cats.data?.find((c) => c.slug === category);
  const title = mode === "search" ? (q ? `Results for “${q}”` : "All products") : mode === "deals" ? "Today's deals" : current?.name ?? "Products";
  useDocumentTitle(title);

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    if (k !== "page") next.delete("page");
    setParams(next);
  };

  const wish = async (id: number) => {
    if (!user) { toast("info", "Sign in to save items to your wishlist"); return; }
    try { await api(`/api/users/me/wishlist/${id}`, { method: "POST" }); toast("success", "Saved to wishlist"); } catch (e: any) { toast("error", e.message); }
  };

  const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  const Filters = (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Category</h3>
        <ul className="space-y-1 text-sm">
          <li><Link to="/search?q=" className={`block rounded-md px-2 py-1.5 ${!category ? "bg-brand-50 font-semibold text-brand-700" : "text-slate-600 hover:bg-slate-100"}`}>All categories</Link></li>
          {cats.data?.map((c) => <li key={c.slug}><Link to={`/category/${c.slug}`} className={`block rounded-md px-2 py-1.5 ${category === c.slug ? "bg-brand-50 font-semibold text-brand-700" : "text-slate-600 hover:bg-slate-100"}`}>{c.name}</Link></li>)}
        </ul>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Price</h3>
        <div className="space-y-1.5">
          {PRICE_BANDS.map(([v, label]) => (
            <label key={v} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"><input type="radio" name="price" checked={band === v} onChange={() => set("price", v)} className="accent-brand-600" />{label}</label>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="container-page py-6">
      <nav className="mb-3 text-sm text-slate-500" aria-label="Breadcrumb"><Link to="/" className="hover:text-slate-800">Home</Link> <span className="mx-1">/</span> <span className="text-slate-800">{title}</span></nav>
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block"><div className="card sticky top-[170px] p-5">{Filters}</div></aside>
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div><h1 className="text-xl font-bold text-slate-900">{title}</h1>{data && <p className="text-sm text-slate-500">{data.total} {data.total === 1 ? "product" : "products"}</p>}</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal className="h-4 w-4" />Filters</Button>
              <label className="sr-only" htmlFor="sort">Sort by</label>
              <select id="sort" value={sort} onChange={(e) => set("sort", e.target.value)} className="field h-9 w-auto pr-8">
                <option value="relevance">Featured</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option><option value="rating">Top rated</option><option value="newest">Newest</option>{mode !== "search" && <option value="discount">Biggest discount</option>}
              </select>
            </div>
          </div>
          {filtersOpen && <div className="card mb-4 p-5 lg:hidden">{Filters}</div>}
          {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <ProductGridSkeleton count={12} /> : data && data.items.length === 0 ? (
            <EmptyState title="No products found" text="Try a different keyword or remove some filters." action={<Link to="/"><Button variant="outline">Back to store</Button></Link>} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">{data?.items.map((p) => <ProductCard key={p.id} p={p} onWish={wish} />)}</div>
              {pages > 1 && (
                <nav className="mt-8 flex items-center justify-center gap-1" aria-label="Pagination">
                  <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => set("page", String(page - 1))} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button>
                  {Array.from({ length: pages }).map((_, i) => <Button key={i} size="icon" variant={page === i + 1 ? "primary" : "ghost"} onClick={() => set("page", String(i + 1))} aria-current={page === i + 1 ? "page" : undefined}>{i + 1}</Button>)}
                  <Button variant="outline" size="icon" disabled={page >= pages} onClick={() => set("page", String(page + 1))} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
