import { NextResponse } from "next/server";
import { actualizarModeloDatos } from "@/lib/listings";

// Cambia datos del modelo: marca, nombre, tipo, preparacionArs, notas,
// lista0km, lista0kmVersion, lista0kmFecha, lista0kmFuente.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const body = await req.json().catch(() => null);
  if (!id || !body) return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  const ok = await actualizarModeloDatos(id, body);
  return NextResponse.json(ok ? { ok: true } : { error: "No existe el modelo o no hay cambios." }, { status: ok ? 200 : 400 });
}
