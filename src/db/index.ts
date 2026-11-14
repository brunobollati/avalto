import path from "node:path";
import fs from "node:fs";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;

const g = globalThis as unknown as { __avaltoDb?: Promise<Db> };

async function init(): Promise<Db> {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  const url = process.env.DATABASE_URL;
  if (url) {
    // Producción (Railway): Postgres real.
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: url, max: 5 });
    const db = drizzle(pool, { schema });
    await migrate(db, { migrationsFolder });
    return db;
  }
  // Local sin configurar nada: Postgres embebido (PGlite) guardado en ./data.
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = path.join(process.cwd(), "data", "pglite");
  fs.mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder });
  return db as unknown as Db;
}

export function getDb(): Promise<Db> {
  if (!g.__avaltoDb) {
    g.__avaltoDb = init().catch((e) => {
      g.__avaltoDb = undefined;
      throw e;
    });
  }
  return g.__avaltoDb;
}

export { schema };
