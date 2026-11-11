import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

export function useFetch<T>(path: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!path);
  const load = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try { setData(await api<T>(path)); } catch (e: any) { setError(e.message ?? "Something went wrong"); } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);
  useEffect(() => { load(); }, [load]);
  return { data, error, loading, reload: load, setData };
}

export function useDocumentTitle(title: string) {
  useEffect(() => { document.title = `${title} - VulnMarket`; }, [title]);
}
