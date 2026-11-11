import { CheckCircle2, CreditCard, Landmark, MapPin, Plus, Smartphone, Wallet } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { OrderSummary } from "./Cart";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { useDocumentTitle, useFetch } from "@/lib/hooks";
import { cn, dateShort, money } from "@/lib/utils";

export type Address = { id: number; label: string; recipient: string; line1: string; city: string; state: string; postal_code: string; delivery_notes: string; is_default: boolean };

const METHODS = [
  { id: "upi", label: "UPI", hint: "Pay with any UPI app (simulated)", icon: Smartphone },
  { id: "card", label: "Credit / debit card", hint: "Visa, Mastercard, RuPay (simulated)", icon: CreditCard },
  { id: "netbanking", label: "Net banking", hint: "All major banks (simulated)", icon: Landmark },
  { id: "cod", label: "Cash on delivery", hint: "Pay when the order arrives", icon: Wallet },
];

export function AddressForm({ onSaved, onCancel }: { onSaved: (a: Address) => void; onCancel?: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ label: "Home", recipient: "", line1: "", city: "", state: "", postal_code: "", delivery_notes: "", is_default: false });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try { onSaved(await api<Address>("/api/users/me/addresses", { body: f })); } catch (err: any) { toast("error", err.message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <div><label className="label" htmlFor="a-label">Label</label><input id="a-label" className="field" required value={f.label} onChange={(e) => set("label", e.target.value)} /></div>
      <div><label className="label" htmlFor="a-rec">Recipient name</label><input id="a-rec" className="field" required value={f.recipient} onChange={(e) => set("recipient", e.target.value)} /></div>
      <div className="sm:col-span-2"><label className="label" htmlFor="a-line">Address</label><input id="a-line" className="field" required value={f.line1} onChange={(e) => set("line1", e.target.value)} /></div>
      <div><label className="label" htmlFor="a-city">City</label><input id="a-city" className="field" required value={f.city} onChange={(e) => set("city", e.target.value)} /></div>
      <div><label className="label" htmlFor="a-state">State</label><input id="a-state" className="field" required value={f.state} onChange={(e) => set("state", e.target.value)} /></div>
      <div><label className="label" htmlFor="a-pin">PIN code</label><input id="a-pin" className="field" required pattern="[0-9]{6}" value={f.postal_code} onChange={(e) => set("postal_code", e.target.value)} /></div>
      <div><label className="label" htmlFor="a-notes">Delivery notes</label><input id="a-notes" className="field" value={f.delivery_notes} onChange={(e) => set("delivery_notes", e.target.value)} /></div>
      <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2"><input type="checkbox" className="accent-brand-600" checked={f.is_default} onChange={(e) => set("is_default", e.target.checked)} />Make this my default address</label>
      <div className="flex gap-2 sm:col-span-2"><Button loading={busy}>Save address</Button>{onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}</div>
    </form>
  );
}

export default function Checkout() {
  useDocumentTitle("Checkout");
  const { user, loading: authLoading } = useAuth();
  const { cart, loading, reload } = useCart();
  const addresses = useFetch<Address[]>(user ? "/api/users/me/addresses" : null);
  const toast = useToast();
  const nav = useNavigate();
  const [addressId, setAddressId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [method, setMethod] = useState("upi");
  const [gift, setGift] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (addresses.data && addressId === null) setAddressId((addresses.data.find((a) => a.is_default) ?? addresses.data[0])?.id ?? null);
  }, [addresses.data, addressId]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" state={{ from: "/checkout" }} replace />;
  if (loading || addresses.loading) return <div className="container-page py-8"><Skeleton className="h-96" /></div>;
  if (cart.items.length === 0) return <Navigate to="/cart" replace />;

  const place = async () => {
    if (!addressId) { toast("error", "Choose a delivery address"); return; }
    setBusy(true);
    try {
      const order = await api<{ id: number }>("/api/orders/checkout", { body: { address_id: addressId, payment_method: method, gift_message: gift } });
      await reload();
      nav(`/order-confirmation/${order.id}`, { replace: true });
    } catch (e: any) { toast("error", e.message); } finally { setBusy(false); }
  };

  return (
    <div className="container-page py-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Checkout</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-900 text-xs text-white">1</span>Delivery address</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {addresses.data?.map((a) => (
                <label key={a.id} className={cn("flex cursor-pointer gap-3 rounded-lg border p-3.5 text-sm", addressId === a.id ? "border-brand-600 bg-brand-50/50 ring-1 ring-brand-600" : "border-slate-200 hover:border-slate-300")}>
                  <input type="radio" name="address" className="mt-1 accent-brand-600" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                  <span><span className="flex items-center gap-1.5 font-semibold text-slate-900"><MapPin className="h-3.5 w-3.5" />{a.label}</span><span className="mt-0.5 block text-slate-600">{a.recipient}<br />{a.line1}, {a.city}, {a.state} {a.postal_code}</span></span>
                </label>
              ))}
            </div>
            {adding ? <div className="mt-4 rounded-lg border border-slate-200 p-4"><AddressForm onCancel={() => setAdding(false)} onSaved={(a) => { addresses.reload(); setAddressId(a.id); setAdding(false); }} /></div> : <Button variant="subtle" size="sm" className="mt-4" onClick={() => setAdding(true)}><Plus className="h-4 w-4" />Add a new address</Button>}
          </section>

          <section className="card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-900 text-xs text-white">2</span>Payment method</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {METHODS.map(({ id, label, hint, icon: Icon }) => (
                <label key={id} className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-3.5", method === id ? "border-brand-600 bg-brand-50/50 ring-1 ring-brand-600" : "border-slate-200 hover:border-slate-300")}>
                  <input type="radio" name="payment" className="mt-1 accent-brand-600" checked={method === id} onChange={() => setMethod(id)} />
                  <Icon className="mt-0.5 h-5 w-5 text-slate-600" /><span><span className="block text-sm font-semibold text-slate-900">{label}</span><span className="block text-xs text-slate-500">{hint}</span></span>
                </label>
              ))}
            </div>
            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">This is a training environment. No real payment is taken and no card details are collected.</p>
          </section>

          <section className="card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-900 text-xs text-white">3</span>Gift message <span className="text-xs font-normal text-slate-500">(optional)</span></h2>
            <textarea className="field h-auto py-2" rows={2} maxLength={255} value={gift} onChange={(e) => setGift(e.target.value)} placeholder="Add a note for the recipient" aria-label="Gift message" />
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-base font-bold">Review items</h2>
            <ul className="divide-y divide-surface-line">{cart.items.map(({ product: p, quantity, line_total }) => <li key={p.id} className="flex items-center gap-3 py-3 text-sm"><img src={p.image} alt="" className="h-12 w-12 rounded-md object-cover" /><span className="flex-1 font-medium text-slate-800">{p.title}<span className="block text-xs text-slate-500">Qty {quantity}</span></span><span className="font-semibold">{money(line_total)}</span></li>)}</ul>
          </section>
        </div>
        <OrderSummary cart={cart} action={<Button className="w-full" size="lg" loading={busy} onClick={place}>Place order</Button>} />
      </div>
    </div>
  );
}

export function OrderConfirmation() {
  useDocumentTitle("Order confirmed");
  const { id } = useParams();
  const { data } = useFetch<any>(`/api/orders/${id}`);
  return (
    <div className="container-page max-w-2xl py-12">
      <div className="card p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-8 w-8" /></span>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Thank you, your order is placed</h1>
        {data ? (
          <>
            <p className="mt-2 text-sm text-slate-600">Order <span className="font-semibold text-slate-900">{data.order_number}</span> · {dateShort(data.created_at)}</p>
            <dl className="mx-auto mt-6 max-w-xs space-y-2 text-left text-sm"><div className="flex justify-between"><dt className="text-slate-500">Items</dt><dd>{data.item_count}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Payment</dt><dd className="uppercase">{data.payment_method}</dd></div><div className="flex justify-between border-t pt-2 font-bold"><dt>Total</dt><dd>{money(data.total)}</dd></div></dl>
          </>
        ) : <Skeleton className="mx-auto mt-4 h-20 w-64" />}
        <div className="mt-8 flex flex-wrap justify-center gap-3"><Link to={`/account/orders/${id}`}><Button>View order</Button></Link><Link to="/"><Button variant="outline">Continue shopping</Button></Link></div>
      </div>
    </div>
  );
}
