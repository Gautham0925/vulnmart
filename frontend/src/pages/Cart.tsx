import { Minus, Plus, ShoppingBag, Trash2, Truck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { useDocumentTitle } from "@/lib/hooks";
import { money } from "@/lib/utils";

export function OrderSummary({ cart, action }: { cart: ReturnType<typeof useCart>["cart"]; action?: React.ReactNode }) {
  const gap = cart.free_shipping_threshold - (cart.subtotal - cart.discount);
  return (
    <aside className="card h-fit p-5 lg:sticky lg:top-[170px]">
      <h2 className="text-lg font-bold text-slate-900">Order summary</h2>
      {cart.items.length > 0 && cart.shipping > 0 && gap > 0 && (
        <div className="mt-3 rounded-lg bg-brand-50 p-3 text-xs text-brand-800"><p className="mb-1.5 flex items-center gap-1.5 font-semibold"><Truck className="h-4 w-4" />Add {money(gap)} more for free delivery</p><div className="h-1.5 overflow-hidden rounded-full bg-brand-100"><div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.min(100, ((cart.free_shipping_threshold - gap) / cart.free_shipping_threshold) * 100)}%` }} /></div></div>
      )}
      <dl className="mt-4 space-y-2.5 text-sm">
        <div className="flex justify-between"><dt className="text-slate-600">Subtotal ({cart.item_count} items)</dt><dd className="font-medium">{money(cart.subtotal)}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-600">Discount</dt><dd className="font-medium text-emerald-700">−{money(cart.discount)}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-600">Shipping</dt><dd className="font-medium">{cart.shipping === 0 ? "Free" : money(cart.shipping)}</dd></div>
        <div className="flex justify-between border-t border-surface-line pt-3 text-base"><dt className="font-bold">Total</dt><dd className="font-bold">{money(cart.total)}</dd></div>
      </dl>
      {action && <div className="mt-5">{action}</div>}
    </aside>
  );
}

export default function CartPage() {
  useDocumentTitle("Your cart");
  const { user } = useAuth();
  const { cart, loading, setQty, remove } = useCart();
  const toast = useToast();
  const nav = useNavigate();

  const guard = async (fn: () => Promise<void>) => { try { await fn(); } catch (e: any) { toast("error", e.message); } };

  if (!user) return <div className="container-page py-12"><EmptyState icon={<ShoppingBag className="h-6 w-6" />} title="Sign in to see your cart" text="Your cart is saved to your account." action={<Link to="/login" state={{ from: "/cart" }}><Button>Sign in</Button></Link>} /></div>;
  if (loading) return <div className="container-page grid gap-6 py-8 lg:grid-cols-[1fr_340px]"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>;
  if (cart.items.length === 0) return <div className="container-page py-12"><EmptyState icon={<ShoppingBag className="h-6 w-6" />} title="Your cart is empty" text="Browse the catalogue and add something you like." action={<Link to="/"><Button>Continue shopping</Button></Link>} /></div>;

  return (
    <div className="container-page py-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Shopping cart</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <ul className="card divide-y divide-surface-line">
          {cart.items.map(({ product: p, quantity, line_total }) => (
            <li key={p.id} className="flex gap-4 p-4">
              <Link to={`/products/${p.id}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-50"><img src={p.image} alt={p.title} className="h-full w-full object-cover" /></Link>
              <div className="flex flex-1 flex-col">
                <div className="flex justify-between gap-3"><div><Link to={`/products/${p.id}`} className="text-sm font-semibold text-slate-900 hover:text-brand-700">{p.title}</Link><p className="text-xs text-slate-500">{p.brand}</p></div><p className="text-sm font-bold">{money(line_total)}</p></div>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="flex items-center rounded-lg border border-slate-300">
                    <button className="p-1.5 hover:bg-slate-50 disabled:opacity-40" disabled={quantity <= 1} onClick={() => guard(() => setQty(p.id, quantity - 1))} aria-label="Decrease quantity"><Minus className="h-4 w-4" /></button>
                    <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
                    <button className="p-1.5 hover:bg-slate-50 disabled:opacity-40" disabled={quantity >= 10} onClick={() => guard(() => setQty(p.id, quantity + 1))} aria-label="Increase quantity"><Plus className="h-4 w-4" /></button>
                  </div>
                  <button onClick={() => guard(() => remove(p.id))} className="flex items-center gap-1 text-sm text-slate-500 hover:text-rose-600"><Trash2 className="h-4 w-4" />Remove</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <OrderSummary cart={cart} action={<Button className="w-full" size="lg" onClick={() => nav("/checkout")}>Proceed to checkout</Button>} />
      </div>
    </div>
  );
}
