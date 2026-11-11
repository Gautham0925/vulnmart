import { Boxes, ClipboardList, FlaskConical, Heart, LayoutDashboard, LogOut, MapPin, Menu, Package, Settings, ShieldCheck, Star, Store, UserCog, Users, UserRound, X, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Logo } from "./Logo";
import { ModeBadge } from "./StoreLayout";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type Item = { to: string; label: string; icon: LucideIcon; end?: boolean };

const MENUS: Record<string, { title: string; items: Item[] }> = {
  account: { title: "My account", items: [
    { to: "/account", label: "Overview", icon: LayoutDashboard, end: true }, { to: "/account/orders", label: "Orders", icon: Package },
    { to: "/account/wishlist", label: "Wishlist", icon: Heart }, { to: "/account/addresses", label: "Addresses", icon: MapPin },
    { to: "/account/profile", label: "Profile", icon: UserRound }, { to: "/account/security", label: "Security", icon: ShieldCheck },
    { to: "/labs", label: "Security labs", icon: FlaskConical }] },
  seller: { title: "Seller centre", items: [
    { to: "/seller", label: "Overview", icon: LayoutDashboard, end: true }, { to: "/seller/products", label: "Products & inventory", icon: Boxes },
    { to: "/seller/orders", label: "Orders", icon: ClipboardList }, { to: "/seller/reviews", label: "Reviews", icon: Star }] },
  admin: { title: "Administration", items: [
    { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true }, { to: "/admin/users", label: "Users", icon: Users },
    { to: "/admin/orders", label: "Orders", icon: Package }, { to: "/admin/products", label: "Products", icon: Boxes },
    { to: "/admin/reviews", label: "Review moderation", icon: Star }, { to: "/admin/labs", label: "Lab management", icon: FlaskConical },
    { to: "/admin/config", label: "Configuration", icon: Settings }] },
  labs: { title: "Security lab", items: [
    { to: "/labs", label: "Lab portal", icon: FlaskConical, end: true }, { to: "/", label: "Back to store", icon: Store }] },
};

export function DashboardLayout({ area, roles }: { area: keyof typeof MENUS; roles?: string[] }) {
  const { user, loading, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  const menu = MENUS[area];
  const links = (
    <nav className="space-y-0.5 px-3" aria-label={menu.title}>
      {menu.items.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={({ isActive }) => cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium", isActive ? "bg-brand-600 text-white" : "text-slate-300 hover:bg-navy-700 hover:text-white")}>
          <Icon className="h-[18px] w-[18px]" />{label}
        </NavLink>
      ))}
    </nav>
  );
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <aside className={cn("fixed inset-y-0 left-0 z-50 w-[250px] flex-col bg-navy-900 py-5 lg:static lg:flex", open ? "flex" : "hidden")}>
        <div className="px-5 pb-5"><Logo /></div>
        <p className="px-6 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{menu.title}</p>
        {links}
        <div className="mt-auto space-y-3 border-t border-white/10 px-5 pt-4">
          <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{user.full_name[0]}</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{user.full_name}</p><p className="text-xs capitalize text-slate-400">{user.role}</p></div></div>
          <button onClick={async () => { await logout(); nav("/"); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-300 hover:bg-navy-700"><LogOut className="h-4 w-4" />Sign out</button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-40 bg-navy-950/60 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-surface-line bg-white px-4 sm:px-8">
          <button className="rounded-md p-2 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(!open)} aria-label="Toggle navigation">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          <div className="hidden text-sm text-slate-500 lg:block">{menu.title}</div>
          <div className="flex items-center gap-3"><ModeBadge />{user.role !== "customer" && <NavLink to={user.role === "admin" ? "/account" : "/account"} className="text-sm text-slate-600 hover:text-slate-900"><UserCog className="inline h-4 w-4" /> Shopper view</NavLink>}</div>
        </header>
        <main className="p-4 sm:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
