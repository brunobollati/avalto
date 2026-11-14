// Acepta "13.900.000", "13,900,000", "$ 13.900.000", "1.583,00", "1,583.00", 17500000.
export function parseNumero(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = String(v).trim();
  if (!s) return null;
  s = s.replace(/[^\d.,-]/g, "");
  if (!/\d/.test(s)) return null;
  let dec = "";
  const m = s.match(/[.,](\d{1,2})$/);
  if (m) {
    dec = m[1];
    s = s.slice(0, -m[0].length);
  }
  const entero = s.replace(/[.,]/g, "");
  const n = Number(dec ? `${entero}.${dec}` : entero);
  return Number.isFinite(n) ? n : null;
}

export function parseEntero(v: unknown): number | null {
  const n = parseNumero(v);
  return n == null ? null : Math.round(n);
}

// Acepta "10/11/2026", "10-11-26" y "2026-11-10". Devuelve YYYY-MM-DD.
export function parseFecha(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) return iso(+m[3] < 100 ? 2000 + +m[3] : +m[3], +m[2], +m[1]);
  return null;
}

function iso(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function parseBool(v: unknown): boolean | null {
  if (v == null || v === "") return null;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (["si", "sí", "true", "1", "on", "x"].includes(s)) return true;
  if (["no", "false", "0"].includes(s)) return false;
  return null;
}

export function texto(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}
