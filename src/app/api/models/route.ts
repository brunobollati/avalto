import { NextResponse } from "next/server";
import { buscarOCrearModelo, modelosConResumen } from "@/lib/listings";

export async function GET() {
  return NextResponse.json(await modelosConResumen());
}

// { "modelo": "Kangoo", "marca": "Renault", "tipo": "Furgón" } — si ya existe devuelve el mismo id.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.modelo) return NextResponse.json({ error: "Falta 'modelo'." }, { status: 400 });
  const id = await buscarOCrearModelo(body);
  return NextResponse.json({ id });
}
