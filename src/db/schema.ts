import {
  pgTable,
  serial,
  text,
  integer,
  bigint,
  boolean,
  date,
  doublePrecision,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const models = pgTable("models", {
  id: serial("id").primaryKey(),
  marca: text("marca").notNull(),
  nombre: text("nombre").notNull(),
  tipo: text("tipo").notNull().default("Furgón"),
  // Costo de preparación después de comprar, en ARS (service, cubiertas, detallado).
  preparacionArs: bigint("preparacion_ars", { mode: "number" }).notNull().default(1000000),
  notas: text("notas"),
  // Precio de lista del 0 km (ARS), si el modelo se sigue vendiendo nuevo.
  lista0km: bigint("lista_0km", { mode: "number" }),
  lista0kmVersion: text("lista_0km_version"),
  lista0kmFecha: date("lista_0km_fecha"),
  lista0kmFuente: text("lista_0km_fuente"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Variantes de un modelo (LT, LTZ, Track, Highline...). Cada una puede tener su lista oficial 0 km.
export const variants = pgTable(
  "variants",
  {
    id: serial("id").primaryKey(),
    modelId: integer("model_id")
      .notNull()
      .references(() => models.id, { onDelete: "cascade" }),
    nombre: text("nombre").notNull(),
    lista0km: bigint("lista_0km", { mode: "number" }),
    lista0kmFecha: date("lista_0km_fecha"),
    lista0kmFuente: text("lista_0km_fuente"),
  },
  (t) => [uniqueIndex("variants_model_nombre_idx").on(t.modelId, t.nombre)],
);

export const listings = pgTable(
  "listings",
  {
    id: serial("id").primaryKey(),
    modelId: integer("model_id")
      .notNull()
      .references(() => models.id, { onDelete: "cascade" }),
    plataforma: text("plataforma").notNull().default("Otra"),
    link: text("link"),
    titulo: text("titulo"),
    // Nombre de la variante del modelo (coincide con variants.nombre).
    variante: text("variante"),
    fechaRelevamiento: date("fecha_relevamiento").notNull(),
    anio: integer("anio"),
    motor: text("motor"),
    version: text("version"),
    km: integer("km"),
    zona: text("zona"),
    vendedor: text("vendedor"),
    moneda: text("moneda").notNull().default("ARS"),
    precio: bigint("precio", { mode: "number" }).notNull(),
    tcPropio: doublePrecision("tc_propio"),
    // Se guarda la fecha y no los días, así "días publicada" crece sola.
    fechaPublicacion: date("fecha_publicacion"),
    llamadaFecha: date("llamada_fecha"),
    llamadaPrecioMin: bigint("llamada_precio_min", { mode: "number" }),
    llamadaContado: boolean("llamada_contado"),
    revisionFecha: date("revision_fecha"),
    estado: text("estado").notNull().default("Activa"),
    ultimoPrecio: bigint("ultimo_precio", { mode: "number" }),
    // false = se guarda pero no entra en el análisis (equipo de frío, motor roto, casi 0 km).
    comparable: boolean("comparable").notNull().default(true),
    // true = publicación de una unidad 0 km: no entra en el análisis de usados, arma el precio 0 km de mercado.
    es0km: boolean("es_0km").notNull().default(false),
    // Si es la misma unidad publicada en otra plataforma, id de la publicación principal.
    mismaUnidadId: integer("misma_unidad_id"),
    notas: text("notas"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("listings_link_idx").on(t.link), index("listings_model_idx").on(t.modelId)],
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type Model = typeof models.$inferSelect;
export type Variant = typeof variants.$inferSelect;
export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;
