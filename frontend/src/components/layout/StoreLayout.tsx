import { ChevronDown, LogOut, Menu, Package, Search, Shield, ShoppingCart, User as UserIcon, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, NavLink, Outlet, useNavigate, useSearchParams } from "react-router-dom";
import { Logo } from "./Logo";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { useFetch } from "@/lib/hooks";
import { Badge } from "@/components/ui/badge";

type Category = { id: number; slug: string; name: string };

export function ModeBadge() {
  const { data } = useFetch<{ mode: string }>("/api/health");
  if (!data) return null;
  return data.mode === "training" ? <Badge tone="amber">Training mode</Badge> : <Badge tone="green">Secure mode</Badge>;
}

export function homeFor(role?: string) {
  return role === "admin" ? "/admin" : role === "seller" ? "/seller" : "/account";
}

export function StoreLayout() {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [open, setOpen] = useState(false);
  const { data: cats } = useFetch<Category[]>("/api/categories");

  useEffect(() => { setQ(params.get("q") ?? ""); }, [params]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    nav(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <div className="bg-navy-950 text-xs text-slate-300">
        <div className="container-page flex h-8 items-center justify-between">
          <span>Free delivery on orders above ₹1,500</span>
          <div className="flex items-center gap-3"><ModeBadge /><Link to="/labs" className="hidden hover:text-white sm:inline">Security labs</Link></div>
        </div>
      </div>
      <header className="sticky top-0 z-40 bg-navy-900 shadow-md">
        <div className="container-page flex h-[68px] items-center gap-4">
          <button className="rounded-md p-2 text-slate-200 hover:bg-navy-700 lg:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          <Logo />
          <form onSubmit={submit} role="search" className="mx-2 hidden flex-1 md:flex">
            <div className="flex w-full overflow-hidden rounded-lg bg-white ring-2 ring-transparent focus-within:ring-brand-500">
              <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" placeholder="Search for products, brands and more" className="h-10 flex-1 bg-transparent px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none" />
              <button className="flex h-10 w-12 items-center justify-center bg-brand-600 text-white hover:bg-brand-700" aria-label="Search"><Search className="h-[18px] w-[18px]" /></button>
            </div>
          </form>
          <div className="ml-auto flex items-center gap-1 text-slate-100">
            {user ? (
              <div className="group relative">
                <button className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-left hover:bg-navy-700">
                  <UserIcon className="h-5 w-5" />
                  <span className="hidden leading-tight sm:block"><span className="block text-[11px] text-slate-400">Hello, {user.full_name.split(" ")[0]}</span><span className="flex items-center gap-1 text-sm font-semibold">Account <ChevronDown className="h-3.5 w-3.5" /></span></span>
                </button>
                <div className="invisible absolute right-0 top-full w-56 pt-2 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                  <div className="card p-1.5 text-sm text-slate-800">
                    <Link to={homeFor(user.role)} className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-slate-50"><Shield className="h-4 w-4 text-slate-500" />{user.role === "customer" ? "My account" : "Dashboard"}</Link>
                    <Link to="/account/orders" className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-slate-50"><Package className="h-4 w-4 text-slate-500" />Orders</Link>
                    <Link to="/labs" className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-slate-50"><Shield className="h-4 w-4 text-slate-500" />Security lab</Link>
                    <button onClick={async () => { await logout(); nav("/"); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-slate-50"><LogOut className="h-4 w-4 text-slate-500" />Sign out</button>
                  </div>
                </div>
              </div>
            ) : (
              <Link to="/login" className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold hover:bg-navy-700">Sign in</Link>
            )}
            <Link to="/cart" className="relative flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-navy-700" aria-label={`Cart with ${cart.item_count} items`}>
              <ShoppingCart className="h-5 w-5" />
              <span className="hidden text-sm font-semibold sm:inline">Cart</span>
              {cart.item_count > 0 && <span className="absolute left-6 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-400 px-1 text-[11px] font-bold text-slate-900">{cart.item_count}</span>}
            </Link>
          </div>
        </div>
        <form onSubmit={submit} className="container-page pb-3 md:hidden">
          <div className="flex overflow-hidden rounded-lg bg-white">
            <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" placeholder="Search products" className="h-10 flex-1 px-3 text-sm focus:outline-none" />
            <button className="flex h-10 w-11 items-center justify-center bg-brand-600 text-white" aria-label="Search"><Search className="h-4 w-4" /></button>
          </div>
        </form>
        <nav className={`border-t border-white/5 bg-navy-800 ${open ? "block" : "hidden"} lg:block`} aria-label="Categories">
          <div className="container-page flex flex-col gap-0.5 py-1 lg:flex-row lg:items-center lg:gap-1 lg:overflow-x-auto">
            <NavLink to="/deals" onClick={() => setOpen(false)} className={({ isActive }) => `whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${isActive ? "bg-navy-600 text-white" : "text-amber-300 hover:bg-navy-700"}`}>Today's deals</NavLink>
            {cats?.map((c) => (
              <NavLink key={c.id} to={`/category/${c.slug}`} onClick={() => setOpen(false)} className={({ isActive }) => `whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${isActive ? "bg-navy-600 text-white" : "text-slate-300 hover:bg-navy-700 hover:text-white"}`}>{c.name}</NavLink>
            ))}
          </div>
        </nav>
      </header>
      <main className="flex-1"><Outlet /></main>
      <Footer />
    </div>
  );
}

function Footer() {
  const cols = [
    { h: "Shop", links: [["All products", "/search?q="], ["Today's deals", "/deals"], ["Electronics", "/category/electronics"], ["Fashion", "/category/fashion"]] },
    { h: "Account", links: [["Your orders", "/account/orders"], ["Addresses", "/account/addresses"], ["Wishlist", "/account/wishlist"], ["Security", "/account/security"]] },
    { h: "Sell & Learn", links: [["Seller centre", "/seller"], ["Security labs", "/labs"], ["Classic search", "/legacy/search"], ["Flash sale", "/promo/flash-sale"]] },
  ];
  return (
    <footer className="mt-14 bg-navy-950 text-slate-400">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo tagline />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">VulnMarket is a self-hosted e-commerce platform built for authorised web application security training. Every transaction is simulated.</p>
        </div>
        {cols.map((c) => (
          <div key={c.h}>
            <h4 className="mb-3 text-sm font-semibold text-white">{c.h}</h4>
            <ul className="space-y-2 text-sm">
              {c.links.map(([label, to]) => (
                <li key={label}>{to.startsWith("/legacy") || to.startsWith("/promo") ? <a href={to} className="hover:text-white">{label}</a> : <Link to={to} className="hover:text-white">{label}</Link>}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-wrap items-center justify-between gap-2 py-4 text-xs">
          <span>© 2026 VulnMarket Labs. Local training environment, not a real store.</span>
          <span>No real payments are processed.</span>
        </div>
      </div>
    </footer>
  );
}
