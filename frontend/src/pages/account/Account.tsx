import { ArrowRight, Package, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { Stat, Table } from "@/components/data";
import { ProductCard } from "@/components/ProductCard";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState, ErrorState, PageHeader, Skeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { AddressForm, type Address } from "@/pages/Checkout";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useDocumentTitle, useFetch } from "@/lib/hooks";
import { dateShort, money } from "@/lib/utils";

type OrderRow = { id: number; order_number: string; status: string; total: number; item_count: number; created_at: string; preview: string[] };

export function AccountOverview() {
  useDocumentTitle("My account");
  const { user } = useAuth();
  const orders = useFetch<OrderRow[]>("/api/orders");
  const addrs = useFetch<Address[]>("/api/users/me/addresses");
  const wish = useFetch<any[]>("/api/users/me/wishlist");
  return (
    <div>
      <PageHeader title={`Welcome back, ${user?.full_name.split(" ")[0]}`} subtitle="Here is what's happening with your account." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Orders" value={orders.data?.length ?? "–"} hint="All time" /><Stat label="Total spent" value={orders.data ? money(orders.data.reduce((a, o) => a + o.total, 0)) : "–"} />
        <Stat label="Saved addresses" value={addrs.data?.length ?? "–"} /><Stat label="Wishlist" value={wish.data?.length ?? "–"} hint="Saved items" />
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section><div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Recent purchases</h2><Link to="/account/orders" className="flex items-center gap-1 text-sm font-semibold text-brand-700">All orders <ArrowRight className="h-4 w-4" /></Link></div>
          {orders.loading ? <Skeleton className="h-40" /> : orders.data?.length ? (
            <div className="card divide-y divide-surface-line">{orders.data.slice(0, 4).map((o) => (
              <Link key={o.id} to={`/account/orders/${o.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-slate-50"><div><p className="text-sm font-semibold">{o.order_number}</p><p className="text-xs text-slate-500">{o.preview.join(", ")}</p></div><div className="text-right"><p className="text-sm font-bold">{money(o.total)}</p><Badge tone={statusTone(o.status)}>{o.status}</Badge></div></Link>))}</div>
          ) : <EmptyState title="No orders yet" text="Your purchases will appear here." />}
        </section>
        <section><h2 className="mb-3 font-bold">Account security</h2><div className="card space-y-3 p-5 text-sm"><div className="flex justify-between"><span className="text-slate-600">Email</span><span className="font-medium">{user?.email}</span></div><div className="flex justify-between"><span className="text-slate-600">Two-step verification</span><Badge tone={user?.mfa_enabled ? "green" : "amber"}>{user?.mfa_enabled ? "On" : "Off"}</Badge></div><Link to="/account/security"><Button variant="outline" size="sm" className="w-full">Manage security</Button></Link></div></section>
      </div>
    </div>
  );
}

export function Orders() {
  useDocumentTitle("Your orders");
  const { data, loading, error, reload } = useFetch<OrderRow[]>("/api/orders");
  return (
    <div><PageHeader title="Your orders" subtitle="Track, review and download invoices." />
      {error ? <ErrorState message={error} onRetry={reload} /> : !loading && data?.length === 0 ? <EmptyState icon={<Package className="h-6 w-6" />} title="No orders yet" action={<Link to="/"><Button>Start shopping</Button></Link>} /> : (
        <Table head={["Order", "Placed", "Items", "Total", "Status", ""]} loading={loading}>
          {data?.map((o) => <tr key={o.id}><td className="table-td font-semibold text-slate-900">{o.order_number}</td><td className="table-td">{dateShort(o.created_at)}</td><td className="table-td max-w-[260px] truncate">{o.preview.join(", ")}</td><td className="table-td font-semibold">{money(o.total)}</td><td className="table-td"><Badge tone={statusTone(o.status)}>{o.status}</Badge></td><td className="table-td text-right"><Link to={`/account/orders/${o.id}`} className="font-semibold text-brand-700">Details</Link></td></tr>)}
        </Table>)}
    </div>
  );
}

export function OrderDetail() {
  const { id } = useParams();
  const { data: o, loading, error, reload } = useFetch<any>(`/api/orders/${id}`);
  useDocumentTitle(o ? `Order ${o.order_number}` : "Order");
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !o) return <Skeleton className="h-72" />;
  return (
    <div><PageHeader title={`Order ${o.order_number}`} subtitle={`Placed on ${dateShort(o.created_at)}`} actions={<div className="flex items-center gap-2"><Badge tone={statusTone(o.status)}>{o.status}</Badge>{o.invoice_id && <Link to={`/account/invoices/${o.invoice_id}`}><Button variant="outline" size="sm">View invoice</Button></Link>}</div>} />
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="card divide-y divide-surface-line">{o.items.map((i: any) => <div key={i.product_id} className="flex items-center justify-between p-4 text-sm"><Link to={`/products/${i.product_id}`} className="font-medium hover:text-brand-700">{i.title}<span className="block text-xs text-slate-500">Qty {i.quantity}</span></Link><span className="font-semibold">{money(i.unit_price * i.quantity)}</span></div>)}</div>
        <div className="space-y-4"><div className="card p-5 text-sm"><h3 className="mb-2 font-bold">Delivery address</h3><p className="text-slate-600">{o.shipping_address.recipient}<br />{o.shipping_address.line1}<br />{o.shipping_address.city}, {o.shipping_address.state} {o.shipping_address.postal_code}</p></div>
          <div className="card space-y-2 p-5 text-sm"><h3 className="mb-1 font-bold">Payment</h3>{[["Subtotal", o.subtotal], ["Discount", -o.discount], ["Shipping", o.shipping]].map(([l, v]: any) => <div key={l} className="flex justify-between"><span className="text-slate-600">{l}</span><span>{money(v)}</span></div>)}<div className="flex justify-between border-t pt-2 font-bold"><span>Total ({o.payment_method.toUpperCase()})</span><span>{money(o.total)}</span></div></div>
          {o.gift_message && <div className="card p-5 text-sm"><h3 className="mb-1 font-bold">Gift message</h3><p className="break-words text-slate-600">{o.gift_message}</p></div>}</div>
      </div>
    </div>
  );
}

export function Invoice() {
  const { id } = useParams();
  const { data: v, loading, error, reload } = useFetch<any>(`/api/invoices/${id}`);
  useDocumentTitle("Invoice");
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !v) return <Skeleton className="h-96" />;
  return (
    <div className="mx-auto max-w-3xl"><div className="card p-8"><div className="flex justify-between"><div><h1 className="text-2xl font-bold">Tax invoice</h1><p className="text-sm text-slate-500">{v.invoice_number} · Order {v.order_number}</p></div><p className="text-sm text-slate-500">{dateShort(v.issued_at)}</p></div>
      <div className="mt-6 grid gap-6 text-sm sm:grid-cols-2"><div><p className="text-xs font-semibold uppercase text-slate-500">Billed to</p><p className="mt-1 font-medium">{v.billing_name}</p><p className="text-slate-600">{v.billing_email}</p></div><div><p className="text-xs font-semibold uppercase text-slate-500">Ship to</p><p className="mt-1 text-slate-600">{v.shipping_address.recipient}<br />{v.shipping_address.line1}<br />{v.shipping_address.city} {v.shipping_address.postal_code}</p></div></div>
      <table className="mt-6 w-full text-sm"><thead><tr className="border-b text-left text-xs uppercase text-slate-500"><th className="py-2">Item</th><th>Qty</th><th className="text-right">Amount</th></tr></thead><tbody>{v.items.map((i: any) => <tr key={i.title} className="border-b border-surface-line"><td className="py-2.5">{i.title}</td><td>{i.quantity}</td><td className="text-right">{money(i.unit_price * i.quantity)}</td></tr>)}</tbody></table>
      <dl className="ml-auto mt-4 max-w-xs space-y-1.5 text-sm"><div className="flex justify-between"><dt className="text-slate-600">Shipping</dt><dd>{money(v.shipping)}</dd></div><div className="flex justify-between"><dt className="text-slate-600">GST included</dt><dd>{money(v.tax_amount)}</dd></div><div className="flex justify-between border-t pt-2 text-base font-bold"><dt>Total</dt><dd>{money(v.total)}</dd></div></dl>
      <Button variant="outline" className="mt-6" onClick={() => window.print()}>Print invoice</Button></div></div>
  );
}

export function Wishlist() {
  useDocumentTitle("Wishlist");
  const { data, loading, reload } = useFetch<any[]>("/api/users/me/wishlist");
  const toast = useToast();
  const remove = async (id: number) => { await api(`/api/users/me/wishlist/${id}`, { method: "DELETE" }); toast("success", "Removed from wishlist"); reload(); };
  return (
    <div><PageHeader title="Wishlist" subtitle="Items you saved for later." />
      {loading ? <Skeleton className="h-48" /> : data?.length ? <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">{data.map((p) => <div key={p.id}><ProductCard p={p} /><Button variant="ghost" size="sm" className="mt-1 w-full text-rose-600" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" />Remove</Button></div>)}</div> : <EmptyState title="Your wishlist is empty" text="Tap the heart on any product to save it." action={<Link to="/"><Button>Browse products</Button></Link>} />}
    </div>
  );
}

export function Addresses() {
  useDocumentTitle("Addresses");
  const { data, loading, reload } = useFetch<Address[]>("/api/users/me/addresses");
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [del, setDel] = useState<Address | null>(null);
  return (
    <div><PageHeader title="Saved addresses" actions={<Button onClick={() => setAdding(true)}>Add address</Button>} />
      {adding && <div className="card mb-6 p-5"><AddressForm onCancel={() => setAdding(false)} onSaved={() => { setAdding(false); toast("success", "Address saved"); reload(); }} /></div>}
      {loading ? <Skeleton className="h-40" /> : <div className="grid gap-4 md:grid-cols-2">{data?.map((a) => <div key={a.id} className="card p-5 text-sm"><div className="flex items-center justify-between"><h3 className="font-bold">{a.label}</h3>{a.is_default && <Badge tone="brand">Default</Badge>}</div><p className="mt-2 text-slate-600">{a.recipient}<br />{a.line1}<br />{a.city}, {a.state} {a.postal_code}</p>{a.delivery_notes && <p className="mt-2 text-xs text-slate-500">Note: {a.delivery_notes}</p>}<Button variant="ghost" size="sm" className="mt-3 text-rose-600" onClick={() => setDel(a)}><Trash2 className="h-4 w-4" />Remove</Button></div>)}</div>}
      <ConfirmDialog open={!!del} onOpenChange={(v) => !v && setDel(null)} danger title="Remove address?" description={`${del?.label} will be deleted from your address book.`} confirmLabel="Remove" onConfirm={async () => { await api(`/api/users/me/addresses/${del!.id}`, { method: "DELETE" }); toast("success", "Address removed"); reload(); }} />
    </div>
  );
}

export function Profile() {
  useDocumentTitle("Profile");
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => { e.preventDefault(); setBusy(true); try { await api("/api/users/me", { method: "PATCH", body: { full_name: name, phone } }); await refreshUser(); toast("success", "Profile updated"); } catch (err: any) { toast("error", err.message); } finally { setBusy(false); } };
  return (
    <div className="max-w-xl"><PageHeader title="Profile" subtitle="Manage your personal details." />
      <form onSubmit={submit} className="card space-y-4 p-6"><div><label className="label" htmlFor="pn">Full name</label><input id="pn" className="field" value={name} onChange={(e) => setName(e.target.value)} required /></div><div><label className="label" htmlFor="pe">Email</label><input id="pe" className="field" value={user?.email} disabled /></div><div><label className="label" htmlFor="pp">Phone</label><input id="pp" className="field" value={phone} onChange={(e) => setPhone(e.target.value)} /></div><Button loading={busy}>Save changes</Button></form>
    </div>
  );
}

export function SecurityPage() {
  useDocumentTitle("Account security");
  const { user, logout } = useAuth();
  const toast = useToast();
  const overview = useFetch<any>("/api/account/security-overview");
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => { e.preventDefault(); setBusy(true); try { await api("/api/auth/change-password", { body: { current_password: cur, new_password: next } }); toast("success", "Password changed"); setCur(""); setNext(""); } catch (err: any) { toast("error", err.message); } finally { setBusy(false); } };
  return (
    <div className="max-w-xl space-y-6"><PageHeader title="Account security" />
      <div className="card space-y-3 p-6 text-sm"><div className="flex justify-between"><span className="text-slate-600">Two-step verification</span><Badge tone={user?.mfa_enabled ? "green" : "amber"}>{user?.mfa_enabled ? "Enabled" : "Not enabled"}</Badge></div><div className="flex justify-between"><span className="text-slate-600">Active sessions</span><span className="font-medium">{overview.data?.active_sessions ?? "–"}</span></div><div className="flex justify-between"><span className="text-slate-600">Password last changed</span><span className="font-medium">{overview.data ? dateShort(overview.data.password_changed_at) : "–"}</span></div></div>
      <form onSubmit={submit} className="card space-y-4 p-6"><h2 className="font-bold">Change password</h2><div><label className="label" htmlFor="cp">Current password</label><input id="cp" type="password" required className="field" value={cur} onChange={(e) => setCur(e.target.value)} /></div><div><label className="label" htmlFor="np2">New password</label><input id="np2" type="password" required minLength={8} className="field" value={next} onChange={(e) => setNext(e.target.value)} /></div><Button loading={busy}>Update password</Button></form>
      <Button variant="outline" onClick={logout}>Sign out of this device</Button>
    </div>
  );
}
