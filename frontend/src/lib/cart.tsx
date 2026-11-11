import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";
import { useAuth } from "./auth";

export type CartLine = { product: { id: number; title: string; image: string; price: number; sale_price: number; brand: string; stock: { quantity: number } }; quantity: number; line_total: number };
export type Cart = { items: CartLine[]; item_count: number; subtotal: number; discount: number; shipping: number; total: number; free_shipping_threshold: number };
const empty: Cart = { items: [], item_count: 0, subtotal: 0, discount: 0, shipping: 0, total: 0, free_shipping_threshold: 1500 };

type CartState = { cart: Cart; loading: boolean; reload: () => Promise<void>; add: (id: number, qty?: number) => Promise<void>; setQty: (id: number, qty: number) => Promise<void>; remove: (id: number) => Promise<void> };
const Ctx = createContext<CartState>(null as unknown as CartState);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart>(empty);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!user) { setCart(empty); return; }
    setLoading(true);
    try { setCart(await api<Cart>("/api/cart")); } catch { setCart(empty); } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  const add = async (id: number, qty = 1) => setCart(await api<Cart>("/api/cart/items", { body: { product_id: id, quantity: qty } }));
  const setQty = async (id: number, qty: number) => setCart(await api<Cart>(`/api/cart/items/${id}`, { method: "PATCH", body: { quantity: qty } }));
  const remove = async (id: number) => setCart(await api<Cart>(`/api/cart/items/${id}`, { method: "DELETE" }));

  return <Ctx.Provider value={{ cart, loading, reload, add, setQty, remove }}>{children}</Ctx.Provider>;
}

export const useCart = () => useContext(Ctx);
