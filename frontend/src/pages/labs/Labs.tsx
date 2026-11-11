import { ArrowRight, ExternalLink, Eye, FlaskConical, Lightbulb, RotateCcw, ShieldCheck, Target } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Stat, Table } from "@/components/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { ErrorState, PageHeader, Skeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useDocumentTitle, useFetch } from "@/lib/hooks";

type Lab = { lab_id: string; name: string; difficulty: string; category: string; scenario: string; objectives: string[]; start_path: string; target_endpoint: string; hints: string[]; remediation: string; references: string[]; active_in_current_mode: boolean };
const tone = (d: string) => (d === "Hard" ? "red" : d === "Medium" ? "amber" : "green") as "red" | "amber" | "green";

export function LabPortal() {
  useDocumentTitle("Security labs");
  const { data, loading, error, reload } = useFetch<{ mode: string; labs: Lab[] }>("/api/labs");
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const labs = data?.labs ?? [];
  const dist = ["Easy", "Medium", "Hard"].map((d) => ({ d, n: labs.filter((l) => l.difficulty === d).length }));
  return (
    <div><PageHeader title="Security training lab" subtitle="Twelve realistic vulnerabilities inside one shopping platform." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Total labs" value={labs.length || "–"} icon={<FlaskConical className="h-4 w-4" />} />{dist.map((x) => <Stat key={x.d} label={`${x.d} labs`} value={x.n} />)}</div>
      <div className="card mt-6 flex items-start gap-3 border-brand-200 bg-brand-50/60 p-4 text-sm text-brand-900"><ExternalLink className="mt-0.5 h-4 w-4 shrink-0" /><p>Exploit each lab to obtain its flag, then submit it on your CTF platform. Flag validation, scoring and progress are tracked there, not in this application.</p></div>
      <div className="mt-6"><Table head={["Lab", "Vulnerability", "Difficulty", "Category", ""]} loading={loading}>
        {labs.map((l) => <tr key={l.lab_id}><td className="table-td font-semibold">{l.lab_id}</td><td className="table-td font-medium text-slate-900">{l.name}</td><td className="table-td"><Badge tone={tone(l.difficulty)}>{l.difficulty}</Badge></td><td className="table-td">{l.category}</td><td className="table-td text-right"><Link to={`/labs/${l.lab_id}`}><Button size="sm" variant="subtle">Start lab <ArrowRight className="h-4 w-4" /></Button></Link></td></tr>)}
      </Table></div>
    </div>
  );
}

export function LabWorkspace() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const { data: l, loading, error, reload } = useFetch<Lab>(`/api/labs/${id}`);
  const [shown, setShown] = useState(0);
  const [confirm, setConfirm] = useState(false);
  useDocumentTitle(l ? `${l.lab_id} ${l.name}` : "Lab");
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !l) return <Skeleton className="h-96" />;
  const external = l.start_path.startsWith("/legacy") || l.start_path.startsWith("/promo");
  return (
    <div>
      <PageHeader title={`${l.lab_id} · ${l.name}`} subtitle={l.category} actions={<div className="flex gap-2"><Badge tone={tone(l.difficulty)}>{l.difficulty}</Badge>{!l.active_in_current_mode && <Badge tone="green">Secure mode: exploit disabled</Badge>}</div>} />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="card p-6"><h2 className="mb-2 flex items-center gap-2 font-bold"><Target className="h-4 w-4" />Scenario</h2><p className="text-sm leading-relaxed text-slate-700">{l.scenario}</p></section>
          <section className="card p-6"><h2 className="mb-2 font-bold">Learning objectives</h2><ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">{l.objectives.map((o) => <li key={o}>{o}</li>)}</ul></section>
          <section className="card p-6"><h2 className="mb-3 flex items-center gap-2 font-bold"><Lightbulb className="h-4 w-4" />Hints</h2><div className="space-y-2">{l.hints.slice(0, shown).map((h) => <p key={h} className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{h}</p>)}{shown < l.hints.length && <Button variant="outline" size="sm" onClick={() => setShown(shown + 1)}><Eye className="h-4 w-4" />Reveal hint {shown + 1} of {l.hints.length}</Button>}</div></section>
          <section className="card p-6"><h2 className="mb-2 flex items-center gap-2 font-bold"><ShieldCheck className="h-4 w-4" />Remediation</h2><p className="text-sm leading-relaxed text-slate-700">{l.remediation}</p><p className="mt-3 text-xs text-slate-500">References: {l.references.join(" · ")}</p></section>
        </div>
        <aside className="space-y-4">
          <div className="card space-y-4 p-6 text-sm"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Target</p>{external ? <a href={l.start_path} className="mt-1 block break-all font-mono text-brand-700 hover:underline">{l.start_path}</a> : <Link to={l.start_path} className="mt-1 block break-all font-mono text-brand-700 hover:underline">{l.start_path}</Link>}</div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Relevant endpoint</p><p className="mt-1 break-all font-mono text-slate-800">{l.target_endpoint}</p></div><a href={`/api/docs`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-700">API documentation <ExternalLink className="h-3.5 w-3.5" /></a></div>
          <div className="card space-y-2 p-6 text-sm"><h3 className="font-bold">Submitting the flag</h3><p className="text-slate-600">When the exploit succeeds the application reveals the flag. Submit it on the external CTF platform to score this lab.</p></div>
          {user?.role === "admin" && <Button variant="outline" className="w-full" onClick={() => setConfirm(true)}><RotateCcw className="h-4 w-4" />Reset this lab</Button>}
        </aside>
      </div>
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title={`Reset ${l.lab_id}?`} description="Restores only this lab's data." confirmLabel="Reset" onConfirm={async () => { const r = await api(`/api/admin/labs/${l.lab_id}/reset`, { method: "POST" }); toast("success", r.reset); }} />
    </div>
  );
}
