import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { guardarPublicacion } from "@/lib/listings";

export async function GET(req: Request) {
  const modelId = Number(new URL(req.url).searchParams.get("modelId"));
  const db = await getDb();
  const q = db.select().from(schema.listings);
  const rows = await (modelId ? q.where(eq(schema.listings.modelId, modelId)) : q).orderBy(
    desc(schema.listings.id),
  );
  return NextResponse.json(rows);
}

// Acepta una publicación o una lista. Si el link ya existe, actualiza esa publicación.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object")
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  const items: Record<string, unknown>[] = Array.isArray(body) ? body : [body];
  const resultados = [];
  for (const item of items) resultados.push(await guardarPublicacion(item));
  const status = resultados.every((r) => r.ok) ? 200 : resultados.some((r) => r.ok) ? 207 : 400;
  return NextResponse.json(Array.isArray(body) ? resultados : resultados[0], { status });
}
