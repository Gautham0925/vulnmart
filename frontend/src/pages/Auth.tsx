import { Eye, EyeOff, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { homeFor, ModeBadge } from "@/components/layout/StoreLayout";
import { useDocumentTitle } from "@/lib/hooks";

function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden flex-col justify-between bg-navy-900 p-12 text-white lg:flex">
        <Logo tagline />
        <div>
          <h2 className="max-w-md text-3xl font-bold leading-tight">Everything you need, delivered with care.</h2>
          <ul className="mt-6 space-y-3 text-sm text-slate-300">
            {["Thousands of products from verified sellers", "Free delivery above ₹1,500", "Hassle-free returns on eligible items"].map((t) => <li key={t} className="flex items-center gap-2.5"><ShieldCheck className="h-4 w-4 text-brand-200" />{t}</li>)}
          </ul>
        </div>
        <p className="text-xs text-slate-500">Local security training environment · all payments simulated</p>
      </div>
      <div className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between lg:hidden"><span className="rounded-lg bg-navy-900 px-3 py-2"><Logo /></span><ModeBadge /></div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-6">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-slate-600">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

function PasswordField({ id, value, onChange, label = "Password", autoComplete = "current-password" }: { id: string; value: string; onChange: (v: string) => void; label?: string; autoComplete?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <div className="relative">
        <input id={id} type={show ? "text" : "password"} required autoComplete={autoComplete} className="field pr-10" value={value} onChange={(e) => onChange(e.target.value)} />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-800" aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
      </div>
    </div>
  );
}

export function Login() {
  useDocumentTitle("Sign in");
  const { login, verifyOtp } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as any;
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mfa, setMfa] = useState<{ challengeId: string; partialToken: string } | null>(null);
  const [code, setCode] = useState("");
  const [inbox, setInbox] = useState<{ subject: string; body: string }[] | null>(null);

  const done = (role: string) => nav(loc.state?.from ?? homeFor(role), { replace: true });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const r = await login(u.trim(), p);
      if (r.mfa) setMfa(r.mfa); else done(r.user!.role);
    } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  };

  const otp = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try { const user = await verifyOtp(mfa!.challengeId, mfa!.partialToken, code); done(user.role); } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  };

  const openInbox = async () => {
    try { setInbox(await api(`/api/dev/mailbox?email=${encodeURIComponent(u.includes("@") ? u : `${u}@example.com`)}`, { auth: false })); } catch { setInbox([]); }
  };

  if (mfa) return (
    <AuthShell title="Verify it's you" subtitle="Enter the 6-digit code we emailed you." footer={<button className="font-semibold text-brand-700" onClick={() => { setMfa(null); setCode(""); setError(""); }}>Use a different account</button>}>
      <form onSubmit={otp} className="space-y-4">
        <div><label className="label" htmlFor="otp">Verification code</label><input id="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required className="field text-center text-lg tracking-[0.5em]" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} /></div>
        {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <Button className="w-full" size="lg" loading={busy}>Verify and sign in</Button>
      </form>
      <button onClick={openInbox} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"><Mail className="h-4 w-4" />Open simulated inbox</button>
      {inbox && <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-700">{inbox.length === 0 ? "No simulated email available." : inbox.slice(0, 1).map((m, i) => <div key={i}><p className="font-semibold">{m.subject}</p><p className="mt-1">{m.body}</p></div>)}</div>}
    </AuthShell>
  );

  return (
    <AuthShell title="Sign in" subtitle="Welcome back. Sign in to continue shopping." footer={<>New to VulnMarket? <Link to="/register" className="font-semibold text-brand-700">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label" htmlFor="username">Username or email</label><input id="username" required autoComplete="username" className="field" value={u} onChange={(e) => setU(e.target.value)} /></div>
        <PasswordField id="password" value={p} onChange={setP} />
        <div className="flex justify-end"><Link to="/forgot-password" className="text-sm font-medium text-brand-700 hover:text-brand-800">Forgot password?</Link></div>
        {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <Button className="w-full" size="lg" loading={busy}>Sign in</Button>
      </form>
    </AuthShell>
  );
}

export function Register() {
  useDocumentTitle("Create account");
  const nav = useNavigate();
  const toast = useToast();
  const [f, setF] = useState({ full_name: "", username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try { await api("/api/auth/register", { body: f, auth: false }); toast("success", "Account created. Please sign in."); nav("/login"); } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <AuthShell title="Create your account" subtitle="Start shopping in under a minute." footer={<>Already registered? <Link to="/login" className="font-semibold text-brand-700">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label" htmlFor="fn">Full name</label><input id="fn" required className="field" value={f.full_name} onChange={(e) => set("full_name", e.target.value)} /></div>
        <div><label className="label" htmlFor="un">Username</label><input id="un" required minLength={3} pattern="[A-Za-z0-9._\-]+" className="field" value={f.username} onChange={(e) => set("username", e.target.value)} /></div>
        <div><label className="label" htmlFor="em">Email</label><input id="em" type="email" required className="field" value={f.email} onChange={(e) => set("email", e.target.value)} /></div>
        <PasswordField id="pw" label="Password (8+ characters)" autoComplete="new-password" value={f.password} onChange={(v) => set("password", v)} />
        {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <Button className="w-full" size="lg" loading={busy}>Create account</Button>
      </form>
    </AuthShell>
  );
}

export function ForgotPassword() {
  useDocumentTitle("Reset password");
  const [id, setId] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string; extra?: Record<string, string> } | null>(null);
  const [busy, setBusy] = useState(false);
  const [inbox, setInbox] = useState<{ subject: string; body: string }[] | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null); setInbox(null);
    try {
      const r = await api("/api/auth/forgot-password", { body: { identifier: id.trim() }, auth: false });
      const { message, delivery, ...extra } = r;
      setMsg({ ok: true, text: message, extra });
    } catch (err: any) { setMsg({ ok: false, text: err.message }); } finally { setBusy(false); }
  };
  const openInbox = async () => {
    const email = id.includes("@") ? id : `${id}@example.com`;
    try { setInbox(await api(`/api/dev/mailbox?email=${encodeURIComponent(email)}`, { auth: false })); } catch { setInbox([]); }
  };
  return (
    <AuthShell title="Forgot your password?" subtitle="Enter your username or email and we'll send a reset link." footer={<Link to="/login" className="font-semibold text-brand-700">Back to sign in</Link>}>
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label" htmlFor="ident">Username or email</label><input id="ident" required className="field" value={id} onChange={(e) => setId(e.target.value)} /></div>
        {msg && <p role={msg.ok ? "status" : "alert"} className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>{msg.text}</p>}
        {msg?.extra && Object.keys(msg.extra).length > 0 && <pre className="overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">{JSON.stringify(msg.extra, null, 2)}</pre>}
        <Button className="w-full" size="lg" loading={busy}>Send reset link</Button>
      </form>
      <button onClick={openInbox} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"><Mail className="h-4 w-4" />Open simulated inbox</button>
      {inbox && <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-700">{inbox.length === 0 ? "No simulated email available." : inbox.slice(0, 2).map((m, i) => <div key={i}><p className="font-semibold">{m.subject}</p><p className="mt-0.5 break-all">{m.body}</p></div>)}</div>}
    </AuthShell>
  );
}

export function ResetPassword() {
  useDocumentTitle("Choose a new password");
  const [params] = useSearchParams();
  const nav = useNavigate();
  const toast = useToast();
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try { await api("/api/auth/reset-password", { body: { token: params.get("token") ?? "", new_password: pw }, auth: false }); toast("success", "Password updated. Please sign in."); nav("/login"); } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <AuthShell title="Choose a new password" subtitle="Use at least 8 characters." footer={<Link to="/login" className="font-semibold text-brand-700">Back to sign in</Link>}>
      <form onSubmit={submit} className="space-y-4">
        <PasswordField id="np" label="New password" autoComplete="new-password" value={pw} onChange={setPw} />
        {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <Button className="w-full" size="lg" loading={busy}><KeyRound className="h-4 w-4" />Update password</Button>
      </form>
    </AuthShell>
  );
}
