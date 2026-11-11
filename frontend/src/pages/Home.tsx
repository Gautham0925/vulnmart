import { ArrowRight, BookOpen, Cpu, Dumbbell, Gamepad2, RotateCcw, ShieldCheck, Smartphone, Shirt, Sofa, Sparkles, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ProductCard, ProductGridSkeleton, type ProductLite } from "@/components/ProductCard";
import { ErrorState } from "@/components/ui/states";
import { api } from "@/lib/api";
import { useFetch, useDocumentTitle } from "@/lib/hooks";
import { readRecent } from "@/lib/recent";
import { money } from "@/lib/utils";

type Feed = { featured: ProductLite[]; trending: ProductLite[]; recommended: ProductLite[]; deals: ProductLite[] };
type Category = { id: number; slug: string; name: string; icon: string; accent: string; product_count: number };

const icons: Record<string, typeof Cpu> = { cpu: Cpu, smartphone: Smartphone, shirt: Shirt, sofa: Sofa, "book-open": BookOpen, dumbbell: Dumbbell, sparkles: Sparkles, "gamepad-2": Gamepad2 };

function Section({ title, to, children }: { title: string; to?: string; children: React.ReactNode }) {
  return (
    <section className="container-page mt-12">
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        {to && <Link to={to} className="flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800">See all <ArrowRight className="h-4 w-4" /></Link>}
      </div>
      {children}
    </section>
  );
}

function Grid({ items }: { items: ProductLite[] }) {
  return <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{items.slice(0, 8).map((p) => <ProductCard key={p.id} p={p} />)}</div>;
}

export default function Home() {
  useDocumentTitle("Shop. Explore. Exploit. Learn.");
  const feed = useFetch<Feed>("/api/products/home");
  const cats = useFetch<Category[]>("/api/categories");
  const [recent, setRecent] = useState<ProductLite[]>([]);

  useEffect(() => {
    const ids = readRecent();
    Promise.all(ids.slice(0, 4).map((id) => api<ProductLite>(`/api/products/${id}`).catch(() => null))).then((r) => setRecent(r.filter(Boolean) as ProductLite[]));
  }, []);

  const hero = feed.data?.featured[0];

  return (
    <div className="pb-4">
      <div className="container-page mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-900 via-navy-800 to-brand-800 p-8 text-white sm:p-12">
          <div className="relative z-10 max-w-sm lg:max-w-[26rem]">
            <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-200">Festive electronics sale</span>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl">Upgrade your setup for up to 25% less</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">Headphones, laptops, cameras and wearables from trusted sellers, delivered free above ₹1,500.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/category/electronics" className="inline-flex h-11 items-center rounded-lg bg-amber-400 px-5 text-sm font-semibold text-slate-900 hover:bg-amber-300">Shop electronics</Link>
              <Link to="/deals" className="inline-flex h-11 items-center rounded-lg border border-white/25 px-5 text-sm font-semibold hover:bg-white/10">View all deals</Link>
            </div>
          </div>
          {hero?.image && <img src={hero.image} alt="" className="pointer-events-none absolute bottom-6 right-8 top-6 hidden aspect-square h-[calc(100%-3rem)] rounded-2xl object-cover shadow-pop ring-1 ring-white/15 md:block" />}
        </div>
        <div className="grid gap-4">
          <Link to="/category/fashion" className="group relative overflow-hidden rounded-2xl bg-rose-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">New season</p>
            <h3 className="mt-1 text-lg font-bold text-slate-900">Fashion essentials</h3>
            <p className="text-sm text-slate-600">Jackets, sneakers and more</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-rose-700 group-hover:gap-2">Explore <ArrowRight className="h-4 w-4" /></span>
          </Link>
          <Link to="/category/books" className="group relative overflow-hidden rounded-2xl bg-emerald-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Learn something</p>
            <h3 className="mt-1 text-lg font-bold text-slate-900">Books under ₹1,100</h3>
            <p className="text-sm text-slate-600">Security, systems and cloud</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-emerald-800 group-hover:gap-2">Browse <ArrowRight className="h-4 w-4" /></span>
          </Link>
        </div>
      </div>

      <div className="container-page mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[[Truck, "Free delivery", "On orders above ₹1,500"], [RotateCcw, "Easy returns", "7 day replacement on eligible items"], [ShieldCheck, "Secure checkout", "Simulated payments only"]].map(([Icon, t, d]: any) => (
          <div key={t} className="card flex items-center gap-3 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon className="h-5 w-5" /></span><div><p className="text-sm font-semibold text-slate-900">{t}</p><p className="text-xs text-slate-500">{d}</p></div></div>
        ))}
      </div>

      <Section title="Shop by category">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {(cats.data ?? Array.from({ length: 8 })).map((c: any, i) => {
            if (!c) return <div key={i} className="skeleton h-28" />;
            const Icon = icons[c.icon] ?? Cpu;
            return (
              <Link key={c.id} to={`/category/${c.slug}`} className="card flex flex-col items-center gap-2.5 p-4 text-center transition hover:-translate-y-0.5 hover:shadow-pop">
                <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: `${c.accent}1a`, color: c.accent }}><Icon className="h-6 w-6" /></span>
                <span className="text-sm font-semibold text-slate-800">{c.name}</span>
              </Link>
            );
          })}
        </div>
      </Section>

      {feed.error ? <div className="container-page mt-12"><ErrorState message={feed.error} onRetry={feed.reload} /></div> : (
        <>
          <Section title="Featured products" to="/search?q="><>{feed.loading ? <ProductGridSkeleton /> : <Grid items={feed.data!.featured} />}</></Section>
          {!feed.loading && feed.data && feed.data.deals.length > 0 && (
            <section className="mt-12 bg-navy-900 py-10">
              <div className="container-page">
                <div className="mb-4 flex items-end justify-between"><div><h2 className="text-xl font-bold text-white">Deals of the day</h2><p className="text-sm text-slate-400">Biggest discounts right now</p></div><Link to="/deals" className="flex items-center gap-1 text-sm font-semibold text-amber-300">All deals <ArrowRight className="h-4 w-4" /></Link></div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                  {feed.data.deals.map((p) => (
                    <Link key={p.id} to={`/products/${p.id}`} className="overflow-hidden rounded-xl bg-white">
                      <div className="relative aspect-square bg-slate-50">{p.image && <img src={p.image} alt={p.title} className="h-full w-full object-cover" />}<span className="absolute left-2 top-2 rounded-md bg-rose-600 px-2 py-0.5 text-xs font-bold text-white">{p.discount_percent}% off</span></div>
                      <div className="p-3"><p className="line-clamp-1 text-xs font-medium text-slate-700">{p.title}</p><p className="mt-0.5 text-sm font-bold text-slate-900">{money(p.sale_price)}</p></div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}
          <Section title="Trending now" to="/deals"><>{feed.loading ? <ProductGridSkeleton /> : <Grid items={feed.data!.trending} />}</></Section>
          <Section title="Recommended for you"><>{feed.loading ? <ProductGridSkeleton /> : <Grid items={feed.data!.recommended} />}</></Section>
        </>
      )}
      {recent.length > 0 && <Section title="Recently viewed"><Grid items={recent} /></Section>}
    </div>
  );
}
