import { Activity, Package, ShieldAlert, ShoppingBag, Users } from "lucide-react";
import { useState } from "react";
import { Stat, Table } from "@/components/data";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { ErrorState, PageHeader, Skeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { useDocumentTitle, useFetch } from "@/lib/hooks";
import { dateTime, money } from "@/lib/utils";

export function AdminOverview() {
  useDocumentTitle("Admin overview");
  const { data, loading, error, reload } = useFetch<any>("/api/admin/overview");
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (
    <div><PageHeader title="Platform overview" subtitle="Live statistics and recent security activity." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Registered users" value={data?.users ?? "–"} icon={<Users className="h-4 w-4" />} /><Stat label="Active customers" value={data?.customers ?? "–"} /><Stat label="Sellers" value={data?.sellers ?? "–"} /><Stat label="Products" value={data?.products ?? "–"} icon={<Package className="h-4 w-4" />} /><Stat label="Orders" value={data?.orders ?? "–"} hint={data ? money(data.revenue) : undefined} icon={<ShoppingBag className="h-4 w-4" />} />
      </div>
      <h2 className="mb-3 mt-8 flex items-center gap-2 font-bold"><Activity className="h-4 w-4" />Recent security activity</h2>
      <Table head={["Time", "Event", "Detail", "Lab", "Source IP"]} loading={loading}>
        {data?.recent_activity.map((a: any) => <tr key={a.id}><td className="table-td whitespace-nowrap">{dateTime(a.at)}</td><td className="table-td"><Badge tone={a.action.startsWith("lab.") ? "amber" : a.action.includes("failed") ? "red" : "slate"}>{a.action}</Badge></td><td className="table-td max-w-[280px] truncate">{a.detail}</td><td className="table-td">{a.lab_id || "–"}</td><td className="table-td">{a.ip || "–"}</td></tr>)}
      </Table>
      {data?.recent_activity.length === 0 && <p className="mt-3 text-sm text-slate-500">No activity recorded yet.</p>}
    </div>
  );
}

export function AdminUsers() {
  useDocumentTitle("Users");
  const { data, loading, error, reload } = useFetch<any[]>("/api/admin/users");
  const toast = useToast();
  const [target, setTarget] = useState<any>(null);
  const toggle = async () => { await api(`/api/admin/users/${target.id}`, { method: "PATCH", body: { is_active: !target.is_active } }); toast("success", `${target.username} ${target.is_active ? "disabled" : "enabled"}`); reload(); };
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (
    <div><PageHeader title="Users" subtitle="Customers, sellers and administrators." />
      <Table head={["User", "Email", "Role", "MFA", "Status", ""]} loading={loading}>
        {data?.map((u) => <tr key={u.id}><td className="table-td"><span className="font-medium text-slate-900">{u.full_name}</span><span className="block text-xs text-slate-500">@{u.username}</span></td><td className="table-td">{u.email}</td><td className="table-td"><Badge tone={u.role === "admin" ? "brand" : u.role === "seller" ? "sky" : "slate"}>{u.role}</Badge></td><td className="table-td">{u.mfa_enabled ? "On" : "Off"}</td><td className="table-td"><Badge tone={u.is_active ? "green" : "red"}>{u.is_active ? "Active" : "Disabled"}</Badge></td><td className="table-td text-right"><Button size="sm" variant="ghost" onClick={() => setTarget(u)}>{u.is_active ? "Disable" : "Enable"}</Button></td></tr>)}
      </Table>
      <ConfirmDialog open={!!target} onOpenChange={(v) => !v && setTarget(null)} danger={target?.is_active} title={`${target?.is_active ? "Disable" : "Enable"} account?`} description={`${target?.full_name} (@${target?.username}) will ${target?.is_active ? "no longer be able to sign in" : "regain access"}.`} confirmLabel={target?.is_active ? "Disable" : "Enable"} onConfirm={toggle} />
    </div>
  );
}

export function AdminOrders() {
  useDocumentTitle("Orders");
  const { data, loading, error, reload } = useFetch<any[]>("/api/admin/orders");
  const toast = useToast();
  const set = async (id: number, status: string) => { await api(`/api/admin/orders/${id}/status`, { method: "PATCH", body: { status } }); toast("success", "Order updated"); reload(); };
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (<div><PageHeader title="Orders" /><Table head={["Order", "Customer ID", "Total", "Status", "Update"]} loading={loading}>{data?.map((o) => <tr key={o.id}><td className="table-td font-semibold">{o.order_number}</td><td className="table-td">{o.user_id}</td><td className="table-td">{money(o.total)}</td><td className="table-td"><Badge tone={statusTone(o.status)}>{o.status}</Badge></td><td className="table-td"><select aria-label="Order status" className="field h-8 w-36" value={o.status} onChange={(e) => set(o.id, e.target.value)}>{["placed", "shipped", "delivered", "cancelled"].map((s) => <option key={s}>{s}</option>)}</select></td></tr>)}</Table></div>);
}

export function AdminProducts() {
  useDocumentTitle("Products");
  const { data, loading, error, reload } = useFetch<any[]>("/api/admin/products");
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (<div><PageHeader title="Products" /><Table head={["SKU", "Product", "Seller", "Price", "Stock"]} loading={loading}>{data?.map((p) => <tr key={p.id}><td className="table-td">{p.sku}</td><td className="table-td max-w-[280px] truncate font-medium text-slate-900">{p.title}</td><td className="table-td">{p.seller}</td><td className="table-td">{money(p.price)}</td><td className="table-td">{p.stock}</td></tr>)}</Table></div>);
}

export function AdminReviews() {
  useDocumentTitle("Review moderation");
  const { data, loading, error, reload } = useFetch<any[]>("/api/admin/reviews");
  const toast = useToast();
  const set = async (id: number, status: string) => { await api(`/api/admin/reviews/${id}`, { method: "PATCH", body: { status } }); toast("success", `Review ${status}`); reload(); };
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (<div><PageHeader title="Review moderation" subtitle="Approve or hide customer reviews." /><Table head={["Product", "Author", "Rating", "Review", "Status", ""]} loading={loading}>{data?.map((r) => <tr key={r.id}><td className="table-td">#{r.product_id}</td><td className="table-td">{r.author}</td><td className="table-td">{r.rating}★</td><td className="table-td max-w-[320px] truncate font-mono text-xs">{r.body}</td><td className="table-td"><Badge tone={statusTone(r.status)}>{r.status}</Badge></td><td className="table-td text-right"><Button size="sm" variant="ghost" onClick={() => set(r.id, r.status === "approved" ? "hidden" : "approved")}>{r.status === "approved" ? "Hide" : "Approve"}</Button></td></tr>)}</Table></div>);
}

export function AdminLabs() {
  useDocumentTitle("Lab management");
  const { data, loading, error, reload } = useFetch<any[]>("/api/admin/labs");
  const toast = useToast();
  const [target, setTarget] = useState<any>(null);
  const reset = async () => { const r = await api(`/api/admin/labs/${target.lab_id}/reset`, { method: "POST" }); toast("success", `${target.lab_id}: ${r.reset}`); reload(); };
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (
    <div><PageHeader title="Lab management" subtitle="Reset lab-specific data without touching other labs. Scoring and flag validation live on the external CTF platform." />
      <Table head={["Lab", "Vulnerability", "Difficulty", "Category", "Objective events", ""]} loading={loading}>
        {data?.map((l) => <tr key={l.lab_id}><td className="table-td font-semibold">{l.lab_id}</td><td className="table-td">{l.name}</td><td className="table-td"><Badge tone={l.difficulty === "Hard" ? "red" : l.difficulty === "Medium" ? "amber" : "green"}>{l.difficulty}</Badge></td><td className="table-td">{l.category}</td><td className="table-td">{l.objective_events}</td><td className="table-td text-right"><Button size="sm" variant="outline" onClick={() => setTarget(l)}>Reset lab</Button></td></tr>)}
      </Table>
      <ConfirmDialog open={!!target} onOpenChange={(v) => !v && setTarget(null)} title={`Reset ${target?.lab_id}?`} description="Only data belonging to this lab is restored. Other labs and participants are unaffected." confirmLabel="Reset lab" onConfirm={reset} />
    </div>
  );
}

export function AdminConfig() {
  useDocumentTitle("Configuration");
  const { data, loading, error, reload } = useFetch<any>("/api/admin/config");
  const toast = useToast();
  const [next, setNext] = useState<string | null>(null);
  const apply = async () => { try { await api("/api/admin/config/mode", { method: "PUT", body: { mode: next } }); toast("success", `Switched to ${next} mode`); reload(); } catch (e: any) { toast("error", e.message); } };
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !data) return <Skeleton className="h-64" />;
  const training = data.mode === "training";
  return (
    <div className="max-w-2xl space-y-6"><PageHeader title="Configuration" />
      <section className="card p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="font-bold">Execution mode</h2><p className="mt-1 text-sm text-slate-600">Training mode enables the intentionally vulnerable scenarios. Secure mode applies the corrected implementations.</p></div><Badge tone={training ? "amber" : "green"}>{data.mode}</Badge></div>
        <div className="mt-4 flex gap-2"><Button variant={training ? "primary" : "outline"} disabled={training || !data.training_allowed} onClick={() => setNext("training")}>Training mode</Button><Button variant={!training ? "primary" : "outline"} disabled={!training} onClick={() => setNext("secure")}>Secure mode</Button></div>
        {!data.training_allowed && <p className="mt-3 flex items-center gap-2 text-sm text-rose-700"><ShieldAlert className="h-4 w-4" />Training mode is disabled for the "{data.environment}" environment.</p>}</section>
      <section className="card space-y-3 p-6 text-sm"><h2 className="font-bold">External CTF integration</h2><div className="flex justify-between"><span className="text-slate-600">Status</span><Badge tone={data.ctf_integration.enabled ? "green" : "slate"}>{data.ctf_integration.enabled ? "Enabled" : "Not connected"}</Badge></div><div className="flex justify-between"><span className="text-slate-600">Platform owns</span><span className="text-right font-medium">validation, scoring, submissions, completion</span></div><p className="text-xs text-slate-500">Configure CTF_ENABLED, CTF_BASE_URL, CTF_API_TOKEN and CTF_EVENT_PATH in the backend environment.</p></section>
      <ConfirmDialog open={!!next} onOpenChange={(v) => !v && setNext(null)} title={`Switch to ${next} mode?`} description="The change applies immediately to every participant." confirmLabel="Switch mode" onConfirm={apply} />
    </div>
  );
}
