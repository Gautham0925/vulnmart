import { Check, Heart, Minus, Plus, ShieldCheck, Store, Truck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ProductCard, type ProductLite } from "@/components/ProductCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { Stars } from "@/components/ui/stars";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { useDocumentTitle, useFetch } from "@/lib/hooks";
import { pushRecent } from "@/lib/recent";
import { dateShort, money } from "@/lib/utils";

type Detail = ProductLite & {
  sku: string; description: string; specs: Record<string, string>; images: { url: string; alt: string }[];
  seller: { id: number; store_name: string; name: string }; rating_breakdown: Record<string, number>; related: ProductLite[];
};
type Review = { id: number; rating: number; title: string; body_html: string; author: string; created_at: string };

export default function ProductDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { add } = useCart();
  const { data: p, loading, error, reload } = useFetch<Detail>(`/api/products/${id}`);
  const reviews = useFetch<Review[]>(`/api/products/${id}/reviews`);
  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  useDocumentTitle(p?.title ?? "Product");

  useEffect(() => { if (id) pushRecent(Number(id)); setActive(0); setQty(1); }, [id]);

  const requireAuth = () => { if (!user) { nav("/login", { state: { from: `/products/${id}` } }); return false; } return true; };

  const addToCart = async (buyNow = false) => {
    if (!requireAuth()) return;
    setBusy(true);
    try { await add(p!.id, qty); if (buyNow) nav("/cart"); else toast("success", "Added to your cart"); } catch (e: any) { toast("error", e.message); } finally { setBusy(false); }
  };

  const wish = async () => {
    if (!requireAuth()) return;
    try { await api(`/api/users/me/wishlist/${p!.id}`, { method: "POST" }); toast("success", "Saved to wishlist"); } catch (e: any) { toast("error", e.message); }
  };

  if (error) return <div className="container-page py-10"><ErrorState message={error} onRetry={reload} /></div>;
  if (loading || !p) return (
    <div className="container-page grid gap-8 py-8 md:grid-cols-2"><Skeleton className="aspect-square" /><div className="space-y-4"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-5 w-1/3" /><Skeleton className="h-10 w-1/2" /><Skeleton className="h-32" /></div></div>
  );

  const total = Object.values(p.rating_breakdown).reduce((a, b) => a + b, 0) || 1;
  const out = p.stock?.status === "out_of_stock";

  return (
    <div className="container-page py-6">
      <nav className="mb-4 text-sm text-slate-500" aria-label="Breadcrumb"><Link to="/" className="hover:text-slate-800">Home</Link> / <Link to={`/category/${(p as any).category_slug}`} className="hover:text-slate-800">{p.category}</Link> / <span className="text-slate-800">{p.title}</span></nav>
      <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr_320px]">
        <div>
          <div className="card overflow-hidden"><img src={p.images[active]?.url} alt={p.images[active]?.alt} className="aspect-square w-full object-cover" /></div>
          <div className="mt-3 flex gap-2">
            {p.images.map((im, i) => <button key={im.url} onClick={() => setActive(i)} className={`h-16 w-16 overflow-hidden rounded-lg border-2 ${i === active ? "border-brand-600" : "border-transparent"}`} aria-label={`View image ${i + 1}`}><img src={im.url} alt="" className="h-full w-full object-cover" /></button>)}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-brand-700">{p.brand}</p>
          <h1 className="mt-1 text-2xl font-bold leading-snug text-slate-900">{p.title}</h1>
          <div className="mt-2 flex items-center gap-2"><Stars value={p.rating_avg} size={16} /><span className="text-sm font-medium text-slate-700">{p.rating_avg.toFixed(1)}</span><a href="#reviews" className="text-sm text-brand-700 hover:underline">{p.rating_count} ratings</a></div>
          <hr className="my-4 border-surface-line" />
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-bold text-slate-900">{money(p.sale_price)}</span>
            {p.discount_percent > 0 && <><span className="text-base text-slate-400 line-through">{money(p.price)}</span><Badge tone="red">{p.discount_percent}% off</Badge></>}
          </div>
          <p className="mt-1 text-xs text-slate-500">Inclusive of all taxes · SKU {p.sku}</p>
          <p className="mt-4 text-sm leading-relaxed text-slate-700">{p.description}</p>
          <h2 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500">Specifications</h2>
          <dl className="card divide-y divide-surface-line overflow-hidden text-sm">
            {Object.entries(p.specs).map(([k, v]) => <div key={k} className="grid grid-cols-[130px_1fr] px-4 py-2.5"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-800">{v}</dd></div>)}
          </dl>
        </div>

        <aside className="card h-fit space-y-4 p-5 lg:sticky lg:top-[170px]">
          <p className="text-2xl font-bold text-slate-900">{money(p.sale_price)}</p>
          <p className="flex items-center gap-2 text-sm text-slate-600"><Truck className="h-4 w-4" />{p.sale_price >= 1500 ? "Free delivery" : "Delivery ₹79"} · 2–4 days</p>
          <p className={`flex items-center gap-1.5 text-sm font-semibold ${out ? "text-rose-600" : p.stock?.status === "low_stock" ? "text-amber-700" : "text-emerald-700"}`}>{!out && <Check className="h-4 w-4" />}{out ? "Out of stock" : p.stock?.status === "low_stock" ? `Only ${p.stock.quantity} left in stock` : "In stock"}</p>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-700">Qty</span>
            <div className="flex items-center rounded-lg border border-slate-300">
              <button className="p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40" disabled={qty <= 1} onClick={() => setQty(qty - 1)} aria-label="Decrease quantity"><Minus className="h-4 w-4" /></button>
              <span className="w-8 text-center text-sm font-semibold" aria-live="polite">{qty}</span>
              <button className="p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40" disabled={qty >= Math.min(10, p.stock?.quantity ?? 1)} onClick={() => setQty(qty + 1)} aria-label="Increase quantity"><Plus className="h-4 w-4" /></button>
            </div>
          </div>
          <Button className="w-full" size="lg" disabled={out} loading={busy} onClick={() => addToCart(false)}>Add to cart</Button>
          <Button className="w-full" size="lg" variant="accent" disabled={out} onClick={() => addToCart(true)}>Buy now</Button>
          <Button className="w-full" variant="outline" onClick={wish}><Heart className="h-4 w-4" />Save to wishlist</Button>
          <div className="space-y-2 border-t border-surface-line pt-4 text-sm text-slate-600">
            <p className="flex items-center gap-2"><Store className="h-4 w-4" />Sold by <span className="font-semibold text-slate-800">{p.seller.store_name}</span></p>
            <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Simulated secure payment</p>
          </div>
        </aside>
      </div>

      <section id="reviews" className="mt-12 grid gap-8 lg:grid-cols-[320px_1fr]">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Customer reviews</h2>
          <div className="mt-3 flex items-center gap-3"><span className="text-4xl font-bold">{p.rating_avg.toFixed(1)}</span><div><Stars value={p.rating_avg} size={18} /><p className="text-xs text-slate-500">{p.rating_count} ratings</p></div></div>
          <div className="mt-4 space-y-1.5">
            {[5, 4, 3, 2, 1].map((s) => <div key={s} className="flex items-center gap-2 text-xs text-slate-600"><span className="w-6">{s} ★</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-amber-400" style={{ width: `${(p.rating_breakdown[String(s)] / total) * 100}%` }} /></div><span className="w-6 text-right">{p.rating_breakdown[String(s)]}</span></div>)}
          </div>
          <ReviewForm productId={p.id} loggedIn={!!user} onPosted={() => { reviews.reload(); reload(); }} />
        </div>
        <div className="space-y-4">
          {reviews.loading ? <Skeleton className="h-28" /> : reviews.data?.length === 0 ? <p className="text-sm text-slate-500">No reviews yet. Be the first to share your experience.</p> : reviews.data?.map((r) => (
            <article key={r.id} className="card p-5">
              <div className="flex items-center justify-between"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{r.author.split(" ").map((s) => s[0]).join("").slice(0, 2)}</span><div><p className="text-sm font-semibold text-slate-900">{r.author}</p><p className="text-xs text-slate-500">{dateShort(r.created_at)}</p></div></div><Stars value={r.rating} /></div>
              {r.title && <h3 className="mt-3 text-sm font-semibold text-slate-900">{r.title}</h3>}
              <div className="mt-1 text-sm leading-relaxed text-slate-700" dangerouslySetInnerHTML={{ __html: r.body_html }} />
            </article>
          ))}
        </div>
      </section>

      {p.related.length > 0 && (
        <section className="mt-12"><h2 className="mb-4 text-xl font-bold text-slate-900">Customers also viewed</h2><div className="grid grid-cols-2 gap-4 md:grid-cols-4">{p.related.map((r) => <ProductCard key={r.id} p={r} />)}</div></section>
      )}
    </div>
  );
}

function ReviewForm({ productId, loggedIn, onPosted }: { productId: number; loggedIn: boolean; onPosted: () => void }) {
  const toast = useToast();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loggedIn) return <div className="card mt-6 p-4 text-sm text-slate-600"><Link to="/login" className="font-semibold text-brand-700">Sign in</Link> to write a review.</div>;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try { await api("/api/reviews", { body: { product_id: productId, rating, title, body } }); setTitle(""); setBody(""); toast("success", "Thanks, your review is live"); onPosted(); } catch (err: any) { toast("error", err.message); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="card mt-6 space-y-3 p-4">
      <h3 className="text-sm font-semibold text-slate-900">Write a review</h3>
      <div><label className="label" htmlFor="rating">Rating</label><select id="rating" className="field" value={rating} onChange={(e) => setRating(Number(e.target.value))}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} stars</option>)}</select></div>
      <div><label className="label" htmlFor="rtitle">Headline</label><input id="rtitle" className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} /></div>
      <div><label className="label" htmlFor="rbody">Your review</label><textarea id="rbody" required minLength={3} rows={4} className="field h-auto py-2" value={body} onChange={(e) => setBody(e.target.value)} /></div>
      <Button loading={busy} className="w-full">Submit review</Button>
    </form>
  );
}
