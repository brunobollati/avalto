import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { actualizarPublicacion } from "@/lib/listings";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const body = await req.json().catch(() => null);
  if (!id || !body) return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  const r = await actualizarPublicacion(id, body);
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}

export async function DELETE(_: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const db = await getDb();
  const res = await db.delete(schema.listings).where(eq(schema.listings.id, id)).returning();
  if (!res.length) return NextResponse.json({ error: "No existe." }, { status: 404 });
  await db.update(schema.listings).set({ mismaUnidadId: null }).where(eq(schema.listings.mismaUnidadId, id));
  return NextResponse.json({ ok: true });
}
