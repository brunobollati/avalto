import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { GuardadaForm, SupuestosForm } from "@/components/Forms";
import { ars, fecha, money, num, pct, usd } from "@/lib/format";
import { getSupuestos } from "@/lib/settings";
import { cuentaUnidad, diasPublicada } from "@/lib/stats";
import { alternarGuardada, guardarEnLista, guardarSupuestosPublicacion } from "../../actions";

export const dynamic = "force-dynamic";

function Fila({ label, valor, ayuda, fuerte }: { label: string; valor: string; ayuda?: string; fuerte?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className={fuerte ? "font-semibold" : ""}>
        {label}
        {ayuda && <span className="block text-[12.5px] text-muted">{ayuda}</span>}
      </dt>
      <dd className={`text-right tabular-nums whitespace-nowrap ${fuerte ? "text-[17px] font-bold" : ""}`}>
        {valor || "Sin datos"}
      </dd>
    </div>
  );
}

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="etiqueta">{label}</dt>
      <dd className="font-medium">{children || <span className="text-muted">Sin dato</span>}</dd>
    </div>
  );
}

export default async function PublicacionPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const db = await getDb();
  const [l] = id ? await db.select().from(schema.listings).where(eq(schema.listings.id, id)) : [];
  if (!l) notFound();
  const [[model], todas, variantes, s] = await Promise.all([
    db.select().from(schema.models).where(eq(schema.models.id, l.modelId)),
    db.select().from(schema.listings).where(eq(schema.listings.modelId, l.modelId)),
    db.select().from(schema.variants).where(eq(schema.variants.modelId, l.modelId)),
    getSupuestos(),
  ]);

  const c = l.es0km ? null : cuentaUnidad(l, model, todas, s, variantes);
  const p = (v: number | null) => (v == null ? null : Math.round(v * 10000) / 100);
  const dias = diasPublicada(l);
  const titulo =
    [model.marca, model.nombre, l.variante, l.anio].filter(Boolean).join(" ") + (l.es0km ? " 0 km" : "");
  const origen = (propio: unknown) => (propio != null ? "De esta unidad" : "Por defecto");

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[14px] text-muted">
            <Link href="/" className="enlace">Modelos</Link> /{" "}
            <Link href={`/modelos/${model.id}`} className="enlace">{model.marca} {model.nombre}</Link> / Publicación #{l.id}
          </p>
          <h1 className="text-[28px] leading-tight font-extrabold tracking-tight">{titulo}</h1>
          {l.titulo && <p className="text-muted">{l.titulo}</p>}
          <div className="mt-1 flex flex-wrap gap-1">
            {l.guardada && <Link href="/guardadas" className="marca-chip">★ Guardada</Link>}
            {!l.comparable && <span className="marca-chip">No comparable</span>}
            {l.mismaUnidadId != null && (
              <Link href={`/publicaciones/${l.mismaUnidadId}`} className="marca-chip">Misma unidad que #{l.mismaUnidadId}</Link>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {l.link && (
            <a href={l.link} target="_blank" rel="noreferrer" className="btn btn-sec">Ver en {l.plataforma}</a>
          )}
          <Link href={`/publicaciones/${l.id}/editar`} className="btn">Editar publicación</Link>
        </div>
      </div>

      <section className="panel p-5">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <Dato label="Precio publicado">
            {money(l.precio, l.moneda)}
            {l.ultimoPrecio != null && l.ultimoPrecio !== l.precio && (
              <span className="block text-[13px] font-normal text-muted">ahora {money(l.ultimoPrecio, l.moneda)}</span>
            )}
          </Dato>
          <Dato label="Precio mínimo en la llamada">
            {l.llamadaPrecioMin != null && (
              <>
                {money(l.llamadaPrecioMin, l.moneda)}
                <span className="block text-[13px] font-normal text-muted">
                  − {pct(1 - l.llamadaPrecioMin / l.precio)}
                  {l.llamadaFecha ? ` · ${fecha(l.llamadaFecha)}` : ""}
                </span>
              </>
            )}
          </Dato>
          <Dato label="Año">{l.anio}</Dato>
          <Dato label="Kilómetros">{l.km != null ? `${num(l.km)} km` : null}</Dato>
          <Dato label="Motor y versión">{[l.motor, l.version].filter(Boolean).join(" · ")}</Dato>
          <Dato label="Vendedor">{[l.vendedor, l.zona].filter(Boolean).join(" · ")}</Dato>
          <Dato label="Estado">
            {l.estado}
            {dias != null ? ` · ${num(dias)} días publicada` : ""}
          </Dato>
          <Dato label="Relevada">{fecha(l.fechaRelevamiento)}</Dato>
        </dl>
        {l.notas && <p className="mt-4 border-t border-line pt-3 text-[14px] whitespace-pre-line">{l.notas}</p>}
      </section>

      <section className="panel p-5">
        <h2 className="text-[18px] font-bold">{l.guardada ? "★ Guardada en tu lista" : "Guardar esta unidad"}</h2>
        <p className="mb-3 text-[14px] text-muted">
          Las guardadas quedan todas juntas en <Link href="/guardadas" className="enlace">Guardadas</Link>, con tu
          comentario, para volver a mirarlas.
        </p>
        <GuardadaForm
          action={guardarEnLista.bind(null, id)}
          quitar={alternarGuardada.bind(null, id, false)}
          guardada={l.guardada}
          comentario={l.guardadaComentario}
          desde={l.guardadaFecha ? fecha(l.guardadaFecha.toISOString()) : undefined}
        />
      </section>

      {!c && (
        <p className="text-muted">
          Es una publicación 0 km: arma el precio 0 km de mercado del modelo y no lleva supuestos de compra.
        </p>
      )}

      {c && (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <section className="panel p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[18px] font-bold">Precio máximo de compra de esta unidad</h2>
              {c.diferencia != null && (
                <span className="marca-chip">{c.diferencia >= 0 ? "Entra en la cuenta" : "No entra"}</span>
              )}
            </div>
            <p className="mt-1 text-[38px] leading-none font-extrabold tracking-tight tabular-nums">
              {c.precioMaxCompra != null ? ars(c.precioMaxCompra) : "Sin datos"}
            </p>
            <p className="mt-1 text-muted">
              {c.precioMaxCompraUsd != null ? `${usd(c.precioMaxCompraUsd)} · ` : ""}
              {c.diferencia == null
                ? "Falta la mediana de referencia o el tipo de cambio para hacer la cuenta."
                : c.diferencia >= 0
                  ? `Sobran ${ars(c.diferencia)} contra lo que ${c.llamada != null ? "dijeron en la llamada" : "piden en la publicación"}.`
                  : `Tienen que bajar ${ars(-c.diferencia)} más desde lo que ${c.llamada != null ? "dijeron en la llamada" : "piden en la publicación"}.`}
            </p>
            <dl className="mt-4 divide-y divide-line border-t border-line">
              <Fila
                label="Mediana del precio publicado"
                valor={ars(c.mediana)}
                ayuda={`${c.cantidad} publicaciones comparables (${c.referencia})`}
              />
              <Fila label="Descuento de negociación" valor={`− ${pct(c.usados.descuento)}`} ayuda={origen(l.supDescuento)} />
              <Fila label="Precio de venta real estimado" valor={ars(c.ventaReal)} fuerte />
              <Fila
                label="Revisión del mecánico"
                valor={`− ${ars(c.costoRevision)}`}
                ayuda={`${ars(c.usados.revision)} × ${c.usados.revisionesPorCompra.toLocaleString("es-AR")} · ${origen(l.supRevision ?? l.supRevisionesPorCompra)}`}
              />
              <Fila label="Informes previos" valor={`− ${ars(c.usados.informes)}`} ayuda={origen(l.supInformes)} />
              <Fila label="Preparación" valor={`− ${ars(c.usados.preparacion)}`} ayuda={origen(l.supPreparacion)} />
              <Fila
                label="Transferencia"
                valor={`− ${ars(c.transferencia)}`}
                ayuda={`${pct(c.usados.transferencia)} · ${origen(l.supTransferencia)}`}
              />
              <Fila
                label="Margen objetivo"
                valor={`− ${ars(c.margen)}`}
                ayuda={`${pct(c.usados.margen)} · ${origen(l.supMargen)}`}
              />
              <Fila
                label={c.llamada != null ? "Piden (llamada)" : "Piden (publicación)"}
                valor={ars(c.llamada ?? c.pedido)}
                fuerte
              />
            </dl>
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="text-[18px] font-bold">Supuestos de esta unidad</h2>
              <p className="text-[14px] text-muted">
                {c.propios
                  ? `${c.propios} cargados para esta unidad. `
                  : "Todavía no cargaste ninguno: la cuenta usa los valores por defecto. "}
                Campo vacío = valor por defecto (el que se ve en gris).
              </p>
            </div>
            <SupuestosForm
              action={guardarSupuestosPublicacion.bind(null, id)}
              textoBoton="Guardar supuestos de la unidad"
              campos={[
                { name: "supPreparacion", label: "Preparación (ARS)", valor: l.supPreparacion, porDefecto: num(c.porDefecto.preparacion), ayuda: "Lo que sale dejar impecable esta unidad: service, cubiertas, chapa, detallado." },
                { name: "supDescuento", label: "Descuento de negociación", valor: p(l.supDescuento), porDefecto: String(p(c.porDefecto.descuento)), sufijo: "%", ayuda: "Cuánto baja el precio publicado al vender. Por defecto, el medido en llamadas del modelo o el supuesto general." },
                { name: "supTransferencia", label: "Transferencia", valor: p(l.supTransferencia), porDefecto: String(p(c.porDefecto.transferencia)), sufijo: "%", ayuda: "Sobre el precio de venta: arancel del registro, sellos y gestoría." },
                { name: "supMargen", label: "Margen objetivo", valor: p(l.supMargen), porDefecto: String(p(c.porDefecto.margen)), sufijo: "%", ayuda: "Sobre el precio de venta: lo que tiene que quedar en esta unidad." },
                { name: "supInformes", label: "Informes previos (ARS)", valor: l.supInformes, porDefecto: num(c.porDefecto.informes), ayuda: "Informe de dominio, multas y deudas." },
                { name: "supRevision", label: "Revisión del mecánico (ARS)", valor: l.supRevision, porDefecto: num(c.porDefecto.revision), ayuda: "Lo que cobra por revisar esta unidad." },
                { name: "supRevisionesPorCompra", label: "Revisiones por unidad comprada", valor: l.supRevisionesPorCompra, porDefecto: String(c.porDefecto.revisionesPorCompra), ayuda: "Cuántas revisiones se cargan a esta compra." },
                { name: "tcPropio", label: "Tipo de cambio (ARS por USD)", valor: l.tcPropio, porDefecto: s.tc ? num(s.tc) : undefined, ayuda: "Solo pesa si la publicación está en dólares." },
              ]}
            />
            <p className="text-[13.5px] text-muted">
              Los valores por defecto se cambian en <Link href="/supuestos" className="enlace">Supuestos por defecto</Link> .
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
