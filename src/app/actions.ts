"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { SESSION_COOKIE, appPassword, checkPassword, newSessionValue } from "@/lib/auth";
import { actualizarModeloDatos, actualizarPublicacion, guardarPublicacion, guardarVariantes } from "@/lib/listings";
import { importarTsv, type ResultadoImportacion } from "@/lib/importar";
import { parseNumero, texto } from "@/lib/parse";
import { saveSupuestos } from "@/lib/settings";

export type Estado = { error?: string; ok?: string } | null;

export async function login(_: Estado, fd: FormData): Promise<Estado> {
  if (!appPassword())
    return { error: "Falta configurar la variable APP_PASSWORD en el servidor." };
  if (!checkPassword(String(fd.get("password") ?? ""))) return { error: "Contraseña incorrecta." };
  const { value, maxAge } = newSessionValue();
  (await cookies()).set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge,
    path: "/",
  });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

export async function crearModelo(fd: FormData) {
  const nombre = texto(fd.get("nombre"));
  const marca = texto(fd.get("marca"));
  if (!nombre || !marca) return;
  const db = await getDb();
  const [m] = await db
    .insert(schema.models)
    .values({ nombre, marca, tipo: texto(fd.get("tipo")) ?? "Furgón" })
    .returning();
  revalidatePath("/");
  redirect(`/modelos/${m.id}`);
}

export async function actualizarModelo(id: number, fd: FormData) {
  if (!texto(fd.get("nombre")) || !texto(fd.get("marca"))) return;
  const input: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) if (!k.startsWith("$")) input[k] = v;
  await actualizarModeloDatos(id, input);
  revalidatePath("/", "layout");
}

export async function guardarVariante(modelId: number, fd: FormData) {
  await guardarVariantes(modelId, [
    {
      nombre: fd.get("nombre"),
      lista0km: fd.get("lista0km"),
      lista0kmFecha: fd.get("lista0kmFecha"),
      lista0kmFuente: fd.get("lista0kmFuente"),
    },
  ]);
  revalidatePath("/", "layout");
}

export async function eliminarModelo(id: number) {
  const db = await getDb();
  await db.delete(schema.models).where(eq(schema.models.id, id));
  revalidatePath("/", "layout");
  redirect("/");
}

function entradaPublicacion(fd: FormData) {
  const input: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) if (!k.startsWith("$")) input[k] = v;
  input.comparable = !fd.has("noComparable");
  delete input.noComparable;
  input.es0km = fd.has("es0km");
  return input;
}

export async function crearPublicacion(modelId: number, _: Estado, fd: FormData): Promise<Estado> {
  const r = await guardarPublicacion({ ...entradaPublicacion(fd), modelId });
  if (!r.ok) return { error: r.error };
  revalidatePath("/", "layout");
  return {
    ok: r.creada
      ? "Publicación agregada."
      : "Ese link ya estaba cargado: se actualizó la publicación existente.",
  };
}

export async function editarPublicacion(id: number, _: Estado, fd: FormData): Promise<Estado> {
  const r = await actualizarPublicacion(id, entradaPublicacion(fd));
  if (!r.ok) return { error: r.error };
  revalidatePath("/", "layout");
  redirect(`/publicaciones/${id}`);
}

/** Supuestos propios de una publicación. Campo vacío = vuelve al valor por defecto. */
export async function guardarSupuestosPublicacion(id: number, _: Estado, fd: FormData): Promise<Estado> {
  const n = (k: string) => parseNumero(fd.get(k));
  const p = (k: string) => {
    const v = parseNumero(fd.get(k));
    return v == null ? null : v / 100;
  };
  const r = await actualizarPublicacion(id, {
    supPreparacion: n("supPreparacion"),
    supDescuento: p("supDescuento"),
    supTransferencia: p("supTransferencia"),
    supMargen: p("supMargen"),
    supInformes: n("supInformes"),
    supRevision: n("supRevision"),
    supRevisionesPorCompra: n("supRevisionesPorCompra"),
    tcPropio: n("tcPropio"),
  });
  if (!r.ok) return { error: r.error };
  revalidatePath("/", "layout");
  return { ok: "Supuestos de la unidad guardados." };
}

export async function eliminarPublicacion(id: number, modelId: number) {
  const db = await getDb();
  await db.delete(schema.listings).where(eq(schema.listings.id, id));
  await db.update(schema.listings).set({ mismaUnidadId: null }).where(eq(schema.listings.mismaUnidadId, id));
  revalidatePath("/", "layout");
  redirect(`/modelos/${modelId}`);
}

export async function guardarSupuestos(_: Estado, fd: FormData): Promise<Estado> {
  const n = (k: string) => parseNumero(fd.get(k)) ?? undefined;
  const p = (k: string) => {
    const v = parseNumero(fd.get(k));
    return v == null ? undefined : v / 100;
  };
  await saveSupuestos({
    tc: n("tc"),
    descuento: p("descuento"),
    llamadasMin: n("llamadasMin"),
    pubsMin: n("pubsMin"),
    transferencia: p("transferencia"),
    margen: p("margen"),
    informes: n("informes"),
    revision: n("revision"),
    revisionesPorCompra: n("revisionesPorCompra"),
    preparacion: n("preparacion"),
    umbral0km: p("umbral0km"),
  });
  revalidatePath("/", "layout");
  return { ok: "Supuestos guardados." };
}

export type EstadoImportacion = { resultado?: ResultadoImportacion; error?: string } | null;

export async function importar(_: EstadoImportacion, fd: FormData): Promise<EstadoImportacion> {
  const tsv = String(fd.get("tsv") ?? "");
  if (!tsv.trim()) return { error: "Pegá las filas de la planilla." };
  const resultado = await importarTsv(tsv, texto(fd.get("modelo")) ?? undefined);
  revalidatePath("/", "layout");
  return { resultado };
}
