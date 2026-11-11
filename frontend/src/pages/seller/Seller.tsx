import { AlertTriangle, DollarSign, Package, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { BarChart, Stat, Table } from "@/components/data";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState, PageHeader, Skeleton } from "@/components/ui/states";
import { Stars } from "@/components/ui/stars";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { useDocumentTitle, useFetch } from "@/lib/hooks";
import { dateShort, money } from "@/lib/utils";

export function SellerOverview() {
  useDocumentTitle("Seller overview");
  const { data, loading, error, reload } = useFetch<any>("/api/seller/overview");
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (
    <div><PageHeader title={data?.store_name || "Seller overview"} subtitle="Sales performance for the last eight months (simulated trend)." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Revenue" value={data ? money(data.revenue) : "–"} icon={<DollarSign className="h-4 w-4" />} /><Stat label="Units sold" value={data?.units_sold ?? "–"} icon={<ShoppingBag className="h-4 w-4" />} />
        <Stat label="Products" value={data?.products ?? "–"} icon={<Package className="h-4 w-4" />} /><Stat label="Low stock" value={data?.low_stock ?? "–"} hint="At or below reorder level" icon={<AlertTriangle className="h-4 w-4" />} />
      </div>
      <div className="card mt-6 p-6"><h2 className="mb-4 font-bold">Revenue trend</h2>{loading ? <Skeleton className="h-48" /> : <BarChart data={data.revenue_series.map((r: any) => ({ label: r.label, value: r.revenue }))} />}</div>
    </div>
  );
}

export function SellerProducts() {
  useDocumentTitle("Inventory");
  const { data, loading, error, reload } = useFetch<any[]>("/api/seller/products");
  const toast = useToast();
  const [edit, setEdit] = useState<Record<number, string>>({});
  const save = async (id: number) => { try { await api(`/api/seller/products/${id}/stock`, { method: "PATCH", body: { quantity: Number(edit[id]) } }); toast("success", "Stock updated"); setEdit(({ [id]: _, ...r }) => r); reload(); } catch (e: any) { toast("error", e.message); } };
  const toggle = async (id: number) => { await api(`/api/seller/products/${id}/active`, { method: "PATCH" }); reload(); };
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (
    <div><PageHeader title="Products & inventory" subtitle="Update stock levels and control listings." />
      <Table head={["Product", "Price", "Stock", "Status", "Update stock", ""]} loading={loading}>
        {data?.map((p) => <tr key={p.id}><td className="table-td"><div className="flex items-center gap-3"><img src={p.image} alt="" className="h-10 w-10 rounded-md object-cover" /><span className="max-w-[240px] truncate font-medium text-slate-900">{p.title}</span></div></td><td className="table-td">{money(p.sale_price)}</td><td className="table-td"><Badge tone={p.stock.status === "in_stock" ? "green" : p.stock.status === "low_stock" ? "amber" : "red"}>{p.stock.quantity} units</Badge></td><td className="table-td"><Badge tone={p.is_active ? "green" : "slate"}>{p.is_active ? "Listed" : "Hidden"}</Badge></td>
          <td className="table-td"><div className="flex gap-2"><input aria-label="New quantity" type="number" min={0} className="field h-8 w-20" placeholder={String(p.stock.quantity)} value={edit[p.id] ?? ""} onChange={(e) => setEdit({ ...edit, [p.id]: e.target.value })} /><Button size="sm" variant="subtle" disabled={edit[p.id] === undefined || edit[p.id] === ""} onClick={() => save(p.id)}>Save</Button></div></td><td className="table-td text-right"><Button size="sm" variant="ghost" onClick={() => toggle(p.id)}>{p.is_active ? "Hide" : "List"}</Button></td></tr>)}
      </Table>
    </div>
  );
}

export function SellerOrders() {
  useDocumentTitle("Seller orders");
  const { data, loading, error, reload } = useFetch<any[]>("/api/seller/orders");
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (<div><PageHeader title="Orders" subtitle="Items sold through your store." /><Table head={["Order", "Item", "Qty", "Amount", "City", "Status", "Date"]} loading={loading}>{data?.map((o, i) => <tr key={i}><td className="table-td font-semibold">{o.order_number}</td><td className="table-td max-w-[240px] truncate">{o.title}</td><td className="table-td">{o.quantity}</td><td className="table-td font-semibold">{money(o.amount)}</td><td className="table-td">{o.city}</td><td className="table-td"><Badge tone={statusTone(o.status)}>{o.status}</Badge></td><td className="table-td">{dateShort(o.placed_at)}</td></tr>)}</Table></div>);
}

export function SellerReviews() {
  useDocumentTitle("Product reviews");
  const { data, loading, error, reload } = useFetch<any[]>("/api/seller/reviews");
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (<div><PageHeader title="Product reviews" subtitle="What customers say about your products." /><Table head={["Product", "Rating", "Headline", "Customer", "Date"]} loading={loading}>{data?.map((r) => <tr key={r.id}><td className="table-td max-w-[240px] truncate font-medium text-slate-900">{r.product}</td><td className="table-td"><Stars value={r.rating} /></td><td className="table-td">{r.title}</td><td className="table-td">{r.author}</td><td className="table-td">{dateShort(r.created_at)}</td></tr>)}</Table></div>);
}
