export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

const TOKEN_KEY = "vm.access";
const REFRESH_KEY = "vm.refresh";

export const tokens = {
  get access() {
    return sessionStorage.getItem(TOKEN_KEY);
  },
  get refresh() {
    return sessionStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh?: string) {
    sessionStorage.setItem(TOKEN_KEY, access);
    if (refresh) sessionStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
  },
};

function messageFrom(body: any, fallback: string): string {
  if (!body) return fallback;
  const d = body.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x.msg).join(", ");
  if (d && typeof d === "object" && typeof d.detail === "string") return d.detail;
  return fallback;
}

type Opts = { method?: string; body?: unknown; auth?: boolean; token?: string };

export async function api<T = any>(path: string, opts: Opts = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  const token = opts.token ?? (opts.auth === false ? null : tokens.access);
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(path, {
    method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    credentials: "same-origin",
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) throw new ApiError(res.status, messageFrom(data, res.statusText), data);
  return data as T;
}
