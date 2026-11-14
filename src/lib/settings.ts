import { getDb, schema } from "@/db";
import type { Supuestos } from "./stats";

export const DEFAULTS: Supuestos = {
  tc: 0,
  descuento: 0.1,
  llamadasMin: 3,
  pubsMin: 10,
  transferencia: 0.025,
  margen: 0.05,
  informes: 50000,
  revision: 100000,
  revisionesPorCompra: 2,
  preparacion: 1000000,
  umbral0km: 0.85,
};

export async function getSupuestos(): Promise<Supuestos> {
  const db = await getDb();
  const rows = await db.select().from(schema.settings);
  const out: Supuestos = { ...DEFAULTS };
  for (const r of rows) {
    if (r.key in out) {
      const n = Number(r.value);
      if (Number.isFinite(n)) (out as Record<string, number>)[r.key] = n;
    }
  }
  return out;
}

export async function saveSupuestos(values: Partial<Supuestos>) {
  const db = await getDb();
  for (const [key, v] of Object.entries(values)) {
    if (!(key in DEFAULTS) || v == null || !Number.isFinite(v)) continue;
    await db
      .insert(schema.settings)
      .values({ key, value: String(v) })
      .onConflictDoUpdate({ target: schema.settings.key, set: { value: String(v) } });
  }
}
