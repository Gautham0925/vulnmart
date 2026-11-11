const KEY = "vm.recent";

export function pushRecent(id: number) {
  try {
    const list: number[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    localStorage.setItem(KEY, JSON.stringify([id, ...list.filter((x) => x !== id)].slice(0, 8)));
  } catch { /* storage unavailable */ }
}

export function readRecent(): number[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
