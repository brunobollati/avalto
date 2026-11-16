import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { NewListing } from "@/db/schema";
import { hoy, restarDias } from "./format";
import {
  ESTADOS,
  MARCAS,
  MONEDAS,
  MOTORES,
  PLATAFORMAS,
  TIPO_POR_MODELO,
  VENDEDORES,
  VERSIONES,
  detectarPlataforma,
} from "./options";
import { parseBool, parseEntero, parseFecha, parseNumero, texto } from "./parse";

type Input = Record<string, unknown>;

const sinAcentos = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

// "diesel" -> "Diésel". Si no coincide con la lista, deja el texto como vino.
function canon(v: unknown, lista: readonly string[]): string | null {
  const t = texto(v);
  if (!t) return null;
  return lista.find((o) => sinAcentos(o) === sinAcentos(t)) ?? t;
}

function limpiarLink(v: unknown): string | null {
  const t = texto(v);
  if (!t) return null;
  // Saca el tracking de Mercado Libre y Facebook; deRuedas usa ?cod= como identificador.
  if (/mercadolibre|facebook\.com/i.test(t)) return t.split(/[?#]/)[0].replace(/\/$/, "");
  return t;
}

/**
 * Convierte un objeto suelto (formulario, API o fila importada) en valores para la tabla.
 * Con parcial=true solo toca las claves presentes.
 */
export function aValores(input: Input, parcial = false): Partial<NewListing> {
  const out: Partial<NewListing> = {};
  const has = (k: string) => k in input;

  if (has("link")) out.link = limpiarLink(input.link);
  if (has("plataforma") && texto(input.plataforma)) out.plataforma = canon(input.plataforma, PLATAFORMAS)!;
  else if (has("link") && !parcial) out.plataforma = detectarPlataforma(out.link);
  if (!parcial && !out.plataforma) out.plataforma = "Otra";

  if (has("titulo")) out.titulo = texto(input.titulo);
  if (has("variante")) out.variante = texto(input.variante);
  if (has("fechaRelevamiento") || !parcial)
    out.fechaRelevamiento = parseFecha(input.fechaRelevamiento) ?? hoy();
  if (has("anio")) out.anio = parseEntero(input.anio);
  if (has("motor")) out.motor = canon(input.motor, MOTORES);
  if (has("version")) out.version = canon(input.version, VERSIONES);
  if (has("km")) out.km = parseEntero(input.km);
  if (has("zona")) out.zona = texto(input.zona);
  if (has("vendedor")) out.vendedor = canon(input.vendedor, VENDEDORES);
  if (has("moneda") || !parcial) {
    const m = (texto(input.moneda) ?? "ARS").toUpperCase();
    out.moneda = (MONEDAS as readonly string[]).includes(m) ? m : m.startsWith("U") ? "USD" : "ARS";
  }
  if (has("precio")) {
    const p = parseEntero(input.precio);
    if (p != null) out.precio = p;
  }
  if (has("tcPropio")) out.tcPropio = parseNumero(input.tcPropio);

  if (has("fechaPublicacion") && texto(input.fechaPublicacion)) {
    out.fechaPublicacion = parseFecha(input.fechaPublicacion);
  } else if (has("diasPublicada")) {
    const d = parseEntero(input.diasPublicada);
    const base = out.fechaRelevamiento ?? parseFecha(input.fechaRelevamiento) ?? hoy();
    out.fechaPublicacion = d == null ? null : restarDias(base, d);
  }

  if (has("llamadaFecha")) out.llamadaFecha = parseFecha(input.llamadaFecha);
  if (has("llamadaPrecioMin")) out.llamadaPrecioMin = parseEntero(input.llamadaPrecioMin);
  if (has("llamadaContado")) out.llamadaContado = parseBool(input.llamadaContado);
  if (has("revisionFecha")) out.revisionFecha = parseFecha(input.revisionFecha);
  if (has("ultimoPrecio")) out.ultimoPrecio = parseEntero(input.ultimoPrecio);
  if (has("estado") && texto(input.estado)) {
    const e = sinAcentos(String(input.estado));
    out.estado = e.startsWith("rebaj")
      ? "Rebajada"
      : e.startsWith("baj") || e.startsWith("se baj") || e.startsWith("vend")
        ? "Bajada"
        : (canon(input.estado, ESTADOS) ?? "Activa");
    if (!(ESTADOS as readonly string[]).includes(out.estado)) out.estado = "Activa";
  }
  if (has("comparable")) out.comparable = parseBool(input.comparable) ?? true;
  if (has("es0km")) out.es0km = parseBool(input.es0km) ?? false;
  if (has("mismaUnidadId")) out.mismaUnidadId = parseEntero(input.mismaUnidadId);
  if (has("notas")) out.notas = texto(input.notas);
  // Supuestos de la unidad: montos en ARS, porcentajes como fracción (0.05 = 5%). Vacío o null = valor por defecto.
  if (has("supPreparacion")) out.supPreparacion = parseEntero(input.supPreparacion);
  if (has("supInformes")) out.supInformes = parseEntero(input.supInformes);
  if (has("supRevision")) out.supRevision = parseEntero(input.supRevision);
  if (has("supRevisionesPorCompra")) out.supRevisionesPorCompra = parseNumero(input.supRevisionesPorCompra);
  if (has("supDescuento")) out.supDescuento = parseNumero(input.supDescuento);
  if (has("supTransferencia")) out.supTransferencia = parseNumero(input.supTransferencia);
  if (has("supMargen")) out.supMargen = parseNumero(input.supMargen);
  // Guardadas: marcar la unidad para volver a mirarla, con un comentario.
  if (has("guardada")) {
    out.guardada = parseBool(input.guardada) ?? false;
    out.guardadaFecha = out.guardada ? new Date() : null;
  }
  if (has("guardadaComentario")) {
    out.guardadaComentario = texto(input.guardadaComentario);
    // Un comentario solo también guarda la unidad.
    if (out.guardadaComentario && !has("guardada")) out.guardada = true;
  }
  if (has("modelId")) {
    const id = parseEntero(input.modelId);
    if (id != null) out.modelId = id;
  }
  return out;
}

export async function buscarOCrearModelo(input: Input): Promise<number | null> {
  const db = await getDb();
  const id = parseEntero(input.modelId);
  if (id != null) {
    const [m] = await db.select().from(schema.models).where(eq(schema.models.id, id));
    return m?.id ?? null;
  }
  const nombre = texto(input.modelo);
  if (!nombre) return null;
  const todos = await db.select().from(schema.models);
  const clave = sinAcentos(nombre);
  const hit = todos.find(
    (m) => sinAcentos(m.nombre) === clave || sinAcentos(`${m.marca} ${m.nombre}`) === clave,
  );
  if (hit) return hit.id;
  const [nuevo] = await db
    .insert(schema.models)
    .values({
      nombre,
      marca: texto(input.marca) ?? MARCAS[clave] ?? "Sin marca",
      tipo: texto(input.tipo) ?? TIPO_POR_MODELO[clave] ?? "Furgón",
    })
    .returning();
  return nuevo.id;
}

/** Devuelve el nombre canónico de la variante dentro del modelo; la crea si no existe. */
export async function asegurarVariante(modelId: number, nombre: string): Promise<string> {
  const db = await getDb();
  const existentes = await db.select().from(schema.variants).where(eq(schema.variants.modelId, modelId));
  const hit = existentes.find((v) => sinAcentos(v.nombre) === sinAcentos(nombre));
  if (hit) return hit.nombre;
  await db.insert(schema.variants).values({ modelId, nombre: nombre.trim() });
  return nombre.trim();
}

type VarianteInput = { nombre?: unknown; lista0km?: unknown; lista0kmFecha?: unknown; lista0kmFuente?: unknown };

/** Crea o actualiza variantes de un modelo, con su lista oficial 0 km. */
export async function guardarVariantes(modelId: number, items: VarianteInput[]) {
  const db = await getDb();
  for (const it of items) {
    const n = texto(it.nombre);
    if (!n) continue;
    const nombre = await asegurarVariante(modelId, n);
    const v: Partial<typeof schema.variants.$inferInsert> = {};
    if ("lista0km" in it) {
      v.lista0km = parseEntero(it.lista0km);
      if (!("lista0kmFecha" in it)) v.lista0kmFecha = v.lista0km == null ? null : hoy();
    }
    if ("lista0kmFecha" in it) v.lista0kmFecha = parseFecha(it.lista0kmFecha);
    if ("lista0kmFuente" in it) v.lista0kmFuente = texto(it.lista0kmFuente);
    if (Object.keys(v).length)
      await db
        .update(schema.variants)
        .set(v)
        .where(and(eq(schema.variants.modelId, modelId), eq(schema.variants.nombre, nombre)));
  }
}

export type Resultado =
  | { ok: true; id: number; creada: boolean }
  | { ok: false; error: string };

/** Crea la publicación, o la actualiza si ya existe una con el mismo link. */
export async function guardarPublicacion(input: Input): Promise<Resultado> {
  const db = await getDb();
  const modelId = await buscarOCrearModelo(input);
  if (modelId == null) return { ok: false, error: "Falta el modelo (modelId o modelo)." };
  const v = aValores({ ...input, modelId });
  if (v.variante) v.variante = await asegurarVariante(modelId, v.variante);

  if (v.link) {
    const [existe] = await db
      .select({ id: schema.listings.id })
      .from(schema.listings)
      .where(eq(schema.listings.link, v.link));
    if (existe) {
      // Al re-cargar un link conocido solo se pisan los datos que vinieron.
      const cambios = aValores(input, true);
      if (cambios.variante) cambios.variante = v.variante;
      if (Object.keys(cambios).length)
        await db.update(schema.listings).set(cambios).where(eq(schema.listings.id, existe.id));
      return { ok: true, id: existe.id, creada: false };
    }
  }
  if (v.precio == null || v.precio <= 0) return { ok: false, error: "Falta el precio publicado." };
  const [row] = await db
    .insert(schema.listings)
    .values(v as NewListing)
    .returning({ id: schema.listings.id });
  return { ok: true, id: row.id, creada: true };
}

export async function actualizarPublicacion(id: number, input: Input): Promise<Resultado> {
  const db = await getDb();
  const v = aValores(input, true);
  delete v.modelId;
  if ("precio" in input && v.precio == null) return { ok: false, error: "El precio no es válido." };
  if (v.mismaUnidadId === id) v.mismaUnidadId = null;
  if (v.variante) {
    const [actual] = await db.select({ modelId: schema.listings.modelId }).from(schema.listings).where(eq(schema.listings.id, id));
    if (actual) v.variante = await asegurarVariante(actual.modelId, v.variante);
  }
  if (!Object.keys(v).length) return { ok: false, error: "No hay cambios." };
  if (v.guardada) {
    // Si ya estaba guardada se conserva la fecha en que se guardó.
    const [actual] = await db
      .select({ guardada: schema.listings.guardada, fecha: schema.listings.guardadaFecha })
      .from(schema.listings)
      .where(eq(schema.listings.id, id));
    if (actual?.guardada) v.guardadaFecha = actual.fecha ?? new Date();
    else v.guardadaFecha = new Date();
  }
  try {
    const res = await db
      .update(schema.listings)
      .set(v)
      .where(eq(schema.listings.id, id))
      .returning({ id: schema.listings.id });
    if (!res.length) return { ok: false, error: "No existe esa publicación." };
  } catch (e) {
    if (String((e as Error).message + String((e as { cause?: unknown }).cause)).includes("listings_link_idx"))
      return { ok: false, error: "Ya hay otra publicación cargada con ese link." };
    throw e;
  }
  return { ok: true, id, creada: false };
}

export async function modelosConResumen() {
  const db = await getDb();
  const ms = await db.select().from(schema.models).orderBy(schema.models.marca, schema.models.nombre);
  const cuentas = await db
    .select({
      modelId: schema.listings.modelId,
      cantidad: sql<number>`count(*)::int`,
      ultima: sql<string | null>`max(${schema.listings.fechaRelevamiento})::text`,
    })
    .from(schema.listings)
    .groupBy(schema.listings.modelId);
  const vs = await db.select().from(schema.variants).orderBy(schema.variants.nombre);
  return ms.map((m) => {
    const c = cuentas.find((x) => x.modelId === m.id);
    return {
      ...m,
      cantidad: c?.cantidad ?? 0,
      ultima: c?.ultima ?? null,
      variantes: vs.filter((v) => v.modelId === m.id),
    };
  });
}

/** Cambia datos de un modelo; solo toca las claves presentes. */
export async function actualizarModeloDatos(id: number, input: Input): Promise<boolean> {
  const db = await getDb();
  const v: Partial<typeof schema.models.$inferInsert> = {};
  if ("marca" in input && texto(input.marca)) v.marca = texto(input.marca)!;
  if ("nombre" in input && texto(input.nombre)) v.nombre = texto(input.nombre)!;
  if ("tipo" in input && texto(input.tipo)) v.tipo = texto(input.tipo)!;
  if ("preparacionArs" in input) v.preparacionArs = parseEntero(input.preparacionArs) ?? 0;
  if ("notas" in input) v.notas = texto(input.notas);
  if ("lista0km" in input) {
    v.lista0km = parseEntero(input.lista0km);
    // Sin fecha explícita, el precio de lista se toma como visto hoy.
    if (!("lista0kmFecha" in input)) v.lista0kmFecha = v.lista0km == null ? null : hoy();
  }
  if ("lista0kmVersion" in input) v.lista0kmVersion = texto(input.lista0kmVersion);
  if ("lista0kmFecha" in input) v.lista0kmFecha = parseFecha(input.lista0kmFecha);
  if ("lista0kmFuente" in input) v.lista0kmFuente = texto(input.lista0kmFuente);
  if (Array.isArray(input.variantes)) {
    await guardarVariantes(id, input.variantes as VarianteInput[]);
    if (!Object.keys(v).length) return true;
  }
  if (!Object.keys(v).length) return false;
  const res = await db.update(schema.models).set(v).where(eq(schema.models.id, id)).returning({ id: schema.models.id });
  return res.length > 0;
}
