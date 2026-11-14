const nf = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

export const num = (n: number | null | undefined) => (n == null ? "" : nf.format(Math.round(n)));
export const ars = (n: number | null | undefined) => (n == null ? "" : `$ ${num(n)}`);
export const usd = (n: number | null | undefined) => (n == null ? "" : `US$ ${num(n)}`);
export const money = (n: number | null | undefined, moneda: string) =>
  moneda === "USD" ? usd(n) : ars(n);
export const pct = (n: number | null | undefined, digits = 1) =>
  n == null
    ? ""
    : `${(n * 100).toLocaleString("es-AR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;

export function fecha(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

// Hoy en Argentina, como YYYY-MM-DD.
export function hoy(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(
    new Date(),
  );
}

export function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(hasta) - Date.parse(desde)) / 86400000);
}

export function restarDias(iso: string, dias: number): string {
  return new Date(Date.parse(iso) - dias * 86400000).toISOString().slice(0, 10);
}
