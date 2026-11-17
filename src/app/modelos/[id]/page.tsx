import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Listing } from "@/db/schema";
import { ConfirmButton, PedirActualizacion } from "@/components/Forms";
import { ListingForm } from "@/components/ListingForm";
import { Scatter } from "@/components/Scatter";
import { ars, fecha, hoy, money, num, pct } from "@/lib/format";
import { MOTORES, PLATAFORMAS, TIPOS, VENDEDORES, VERSIONES } from "@/lib/options";
import { parseEntero } from "@/lib/parse";
import { getSupuestos } from "@/lib/settings";
import { analizar, diasPublicada, precioArs, type Filtros } from "@/lib/stats";
import { actualizarModelo, alternarGuardada, crearPublicacion, eliminarModelo, guardarVariante } from "../../actions";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

function etiquetaCorta(l: Listing) {
  return [l.anio, l.motor, l.version, l.km != null ? `${num(l.km)} km` : null].filter(Boolean).join(" · ");
}

const conSupuestos = (l: Listing) =>
  [l.supPreparacion, l.supDescuento, l.supTransferencia, l.supMargen, l.supInformes, l.supRevision, l.supRevisionesPorCompra].some(
    (v) => v != null,
  );

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

export default async function ModeloPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SP>;
}) {
  const id = Number((await params).id);
  const sp = await searchParams;
  const db = await getDb();
  const [model] = id ? await db.select().from(schema.models).where(eq(schema.models.id, id)) : [];
  if (!model) notFound();

  const variantes = await db.select().from(schema.variants).where(eq(schema.variants.modelId, id)).orderBy(schema.variants.nombre);
  const [todas, s] = await Promise.all([
    db.select().from(schema.listings).where(eq(schema.listings.modelId, id)).orderBy(desc(schema.listings.id)),
    getSupuestos(),
  ]);

  const q = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : undefined);
  const n = (k: string) => parseEntero(q(k)) ?? undefined;
  const filtros: Filtros = {
    variante: q("variante"),
    motor: q("motor"),
    version: q("version"),
    zona: q("zona"),
    plataforma: q("plataforma"),
    vendedor: q("vendedor"),
    anioDesde: n("anioDesde"),
    anioHasta: n("anioHasta"),
    kmDesde: n("kmDesde"),
    kmHasta: n("kmHasta"),
  };
  const hayFiltros = Object.values(filtros).some((v) => v != null);
  const { analisis: a, filtradas } = analizar(model, todas, filtros, s, variantes);
  const usadas = todas.filter((l) => !l.es0km);
  const ceroKm = todas.filter((l) => l.es0km);
  const zonas = [...new Set(usadas.map((l) => l.zona).filter((z): z is string => !!z))].sort();
  const faltaTc = todas.some((l) => l.moneda === "USD" && !l.tcPropio) && !s.tc;

  const puntos = filtradas
    .filter((l) => l.comparable)
    .map((l) => ({ l, p: precioArs(l, s.tc) }))
    .filter((x): x is { l: Listing; p: number } => x.p != null)
    .map(({ l, p }) => ({
      id: l.id,
      anio: l.anio,
      km: l.km,
      precio: p,
      plataforma: (PLATAFORMAS as readonly string[]).includes(l.plataforma) ? l.plataforma : "Otra",
      etiqueta: etiquetaCorta(l) || "Sin datos de la unidad",
    }));

  // Orden de la tabla de publicaciones: va en la URL (orden, dir) junto con los filtros.
  const claves: Record<string, (l: Listing) => string | number | null> = {
    plataforma: (l) => l.plataforma,
    anio: (l) => l.anio,
    motor: (l) => l.motor,
    variante: (l) => l.variante,
    km: (l) => l.km,
    vendedor: (l) => l.vendedor,
    precio: (l) => precioArs(l, s.tc) ?? l.precio,
    llamada: (l) => l.llamadaPrecioMin,
    dias: (l) => diasPublicada(l),
    estado: (l) => l.estado,
    relevada: (l) => l.fechaRelevamiento,
  };
  const orden = q("orden") && claves[q("orden") as string] ? (q("orden") as string) : undefined;
  const dir = q("dir") === "desc" ? "desc" : "asc";
  const ordenadas = orden
    ? [...filtradas].sort((x, y) => {
        const a1 = claves[orden](x);
        const b1 = claves[orden](y);
        // Las que no tienen el dato van siempre al final.
        if (a1 == null || a1 === "") return b1 == null || b1 === "" ? 0 : 1;
        if (b1 == null || b1 === "") return -1;
        const c = typeof a1 === "number" && typeof b1 === "number" ? a1 - b1 : String(a1).localeCompare(String(b1), "es");
        return dir === "desc" ? -c : c;
      })
    : filtradas;
  const th = (clave: string, label: string, der = false) => {
    const activa = orden === clave;
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v && k !== "orden" && k !== "dir") params.set(k, v);
    params.set("orden", clave);
    params.set("dir", activa && dir === "asc" ? "desc" : "asc");
    return (
      <th className={der ? "der" : ""} aria-sort={activa ? (dir === "asc" ? "ascending" : "descending") : undefined}>
        <Link
          href={`/modelos/${id}?${params.toString()}#publicaciones`}
          className={`hover:underline ${activa ? "font-bold text-ink" : ""}`}
          title={`Ordenar por ${label.toLowerCase()}`}
        >
          {label}
          <span aria-hidden="true">{activa ? (dir === "asc" ? " ▲" : " ▼") : ""}</span>
        </Link>
      </th>
    );
  };

  const sel = (name: string, label: string, opciones: readonly string[]) => (
    <div>
      <label className="etiqueta" htmlFor={`f-${name}`}>{label}</label>
      <select id={`f-${name}`} name={name} defaultValue={q(name) ?? ""} className="campo">
        <option value="">Todos</option>
        {opciones.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
  const inp = (name: string, label: string, ph: string) => (
    <div>
      <label className="etiqueta" htmlFor={`f-${name}`}>{label}</label>
      <input id={`f-${name}`} name={name} defaultValue={q(name) ?? ""} inputMode="numeric" placeholder={ph} className="campo" />
    </div>
  );

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[14px] text-muted">
            <Link href="/" className="enlace">Modelos</Link> / {model.tipo}
          </p>
          <h1 className="text-[32px] leading-tight font-extrabold tracking-tight">
            {model.marca} {model.nombre}
          </h1>
          <p className="text-muted">
            {usadas.length} {usadas.length === 1 ? "usado cargado" : "usados cargados"}
            {hayFiltros ? `, ${filtradas.length} en el filtro` : ""}
            {ceroKm.length ? `, ${ceroKm.length} publicaciones 0 km` : ""}
          </p>
          {model.lista0km != null && (
            <p className="mt-1">
              Lista 0 km: <strong className="tabular-nums">{ars(model.lista0km)}</strong>
              <span className="text-muted">
                {model.lista0kmVersion ? ` (${model.lista0kmVersion})` : ""}
                {model.lista0kmFecha ? `, al ${fecha(model.lista0kmFecha)}` : ""}
              </span>
              {model.lista0kmFuente?.startsWith("http") && (
                <>
                  {" "}
                  <a href={model.lista0kmFuente} target="_blank" rel="noreferrer" className="enlace">Fuente</a>
                </>
              )}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <PedirActualizacion modelo={`${model.marca} ${model.nombre}`} />
          <a href="#agregar" className="btn">Agregar publicación</a>
        </div>
      </div>

      <form className="panel grid grid-cols-2 items-end gap-3 p-4 sm:grid-cols-4 lg:grid-cols-[repeat(5,minmax(0,1fr))]">
        {sel("variante", "Variante", variantes.map((v) => v.nombre))}
        {sel("motor", "Motor", MOTORES)}
        {sel("version", "Versión", VERSIONES)}
        {inp("anioDesde", "Año desde", "2017")}
        {inp("anioHasta", "Año hasta", "2020")}
        {inp("kmDesde", "Km desde", "0")}
        {inp("kmHasta", "Km hasta", "200.000")}
        {sel("plataforma", "Plataforma", PLATAFORMAS)}
        {sel("vendedor", "Vendedor", VENDEDORES)}
        {sel("zona", "Zona", zonas)}
        {orden && <input type="hidden" name="orden" value={orden} />}
        {orden && <input type="hidden" name="dir" value={dir} />}
        <div className="col-span-2 flex gap-2 sm:col-span-4 lg:col-span-5">
          <button className="btn">Filtrar</button>
          {hayFiltros && (
            <Link href={`/modelos/${id}`} className="btn btn-sec">Quitar</Link>
          )}
        </div>
      </form>

      {faltaTc && (
        <p role="alert" className="panel border-alerta px-4 py-3 text-alerta">
          Hay publicaciones en dólares y falta el tipo de cambio.{" "}
          <Link href="/supuestos" className="underline">Cargalo en Supuestos</Link> para que entren en el análisis.
        </p>
      )}

      {(a.base0km != null || ceroKm.length === 0) && (
        <section className="panel grid gap-x-8 gap-y-3 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)]">
          <div>
            <h2 className="font-semibold">0 km de mercado</h2>
            <p className="text-[26px] leading-tight font-extrabold tabular-nums">
              {a.ref0km.promedio != null ? ars(a.ref0km.promedio) : "Sin relevar"}
            </p>
            <p className="text-[13.5px] text-muted">
              {a.ref0km.cantidad > 0
                ? `Promedio de ${a.ref0km.cantidad} publicaciones 0 km relevadas al ${fecha(a.ref0km.fecha)}, de ${ars(a.ref0km.min)} a ${ars(a.ref0km.max)}`
                : "Todavía no hay publicaciones 0 km para este filtro. El botón Actualizar 0 km copia el pedido para Claude."}
              {model.lista0km != null ? `. Lista oficial: ${ars(model.lista0km)}` : ""}
            </p>
          </div>
          <div>
            <h2 className="font-semibold">Usado contra 0 km</h2>
            <p className="text-[26px] leading-tight font-extrabold tabular-nums">
              {a.vs0km != null ? pct(a.vs0km, 0) : "Sin datos"}
            </p>
            {a.vs0km != null && a.mediana != null && (
              <p className="text-[13.5px] text-muted">
                El usado típico del filtro sale {ars((a.base0km ?? 0) - a.mediana)} menos que el 0 km
                {a.base0kmOrigen === "lista" ? " de lista" : ""}.
              </p>
            )}
          </div>
          <div>
            {a.vs0km != null && (
              <p className={a.vs0km >= s.umbral0km ? "font-semibold text-alerta" : "font-semibold text-teal"}>
                {a.vs0km >= s.umbral0km
                  ? "Muy cerca del 0 km: mala reventa."
                  : "Hay distancia con el 0 km."}
              </p>
            )}
            <p className="text-[13.5px] text-muted">
              Cuanto más se acerca el usado al 0 km, peor: al comprador le conviene el nuevo. Se marca como mala
              reventa desde {pct(s.umbral0km, 0)} (se cambia en Supuestos). Para comparar parejo, filtrá por
              variante: cada una se mide contra su propio 0 km.
            </p>
          </div>
        </section>
      )}

      {a.cantidad === 0 ? (
        <p className="panel px-5 py-8 text-center text-muted">
          {usadas.length === 0
            ? "Todavía no hay publicaciones de usados de este modelo. Cargá la primera acá abajo."
            : "Ninguna publicación comparable entra en este filtro. Probá con un rango más amplio."}
        </p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <section className="panel p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-[18px] font-bold">Precio de mercado</h2>
              <span className="marca-chip">{a.alcanza ? "Alcanza para decidir" : "Seguí relevando"}</span>
            </div>
            <p className="mt-1 text-[38px] leading-none font-extrabold tracking-tight tabular-nums">
              {ars(a.mediana)}
            </p>
            <p className="mt-1 text-muted">
              Mediana de lo publicado. El precio máximo de compra se calcula en cada publicación, con los supuestos de
              esa unidad.
            </p>
            <dl className="mt-4 divide-y divide-line border-t border-line">
              <Fila
                label="Mediana del precio publicado"
                valor={ars(a.mediana)}
                ayuda={`${a.cantidad} publicaciones comparables${a.duplicadas ? `, ${a.duplicadas} repetidas en otra plataforma` : ""}${a.noComparables ? `, ${a.noComparables} no comparables afuera` : ""}`}
              />
              <Fila label="Rango publicado" valor={`${ars(a.min)} a ${ars(a.max)}`} />
              <Fila
                label="Descuento de negociación"
                valor={`− ${pct(a.descuentoUsado)}`}
                ayuda={
                  a.descuentoMedido
                    ? `Medido en ${a.llamadas} llamadas`
                    : `Supuesto. ${a.llamadas} de ${s.llamadasMin} llamadas para medirlo${a.descuentoLlamadas != null ? ` (por ahora dan ${pct(a.descuentoLlamadas)})` : ""}`
                }
              />
              <Fila label="Precio de venta real estimado" valor={ars(a.ventaReal)} fuerte />
              {a.rebajadas > 0 && (
                <Fila label="Rebaja mediana en el seguimiento" valor={pct(a.rebajaMediana)} ayuda={`${a.rebajadas} publicaciones rebajadas`} />
              )}
              {a.medianaDias != null && <Fila label="Mediana de días publicada" valor={`${num(a.medianaDias)} días`} />}
            </dl>
          </section>

          <div className="space-y-5">
            <section className="panel p-5">
              <h2 className="mb-3 text-[18px] font-bold">Precio publicado de cada publicación</h2>
              <Scatter puntos={puntos} />
            </section>
            <section className="panel overflow-x-auto">
              <h2 className="px-5 pt-4 text-[18px] font-bold">Por plataforma</h2>
              <table className="tabla mt-1">
                <thead>
                  <tr>
                    <th>Plataforma</th>
                    <th className="der">Publicaciones</th>
                    <th className="der">Mediana</th>
                    <th className="der">Más barata</th>
                    <th className="der">Más cara</th>
                    <th className="der">Días publicada</th>
                  </tr>
                </thead>
                <tbody>
                  {a.porPlataforma.map((p) => (
                    <tr key={p.plataforma}>
                      <td>{p.plataforma}</td>
                      <td className="der">{p.cantidad}</td>
                      <td className="der font-semibold">{ars(p.mediana)}</td>
                      <td className="der">{ars(p.min)}</td>
                      <td className="der">{ars(p.max)}</td>
                      <td className="der">{p.medianaDias != null ? num(p.medianaDias) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            {a.porVariante.length > 0 && !(a.porVariante.length === 1 && a.porVariante[0].variante === "Sin variante") && (
              <section className="panel overflow-x-auto">
                <h2 className="px-5 pt-4 text-[18px] font-bold">Por variante</h2>
                <table className="tabla mt-1">
                  <thead>
                    <tr>
                      <th>Variante</th>
                      <th className="der">Usados</th>
                      <th className="der">Mediana usado</th>
                      <th className="der">0 km de mercado</th>
                      <th className="der">Lista 0 km</th>
                      <th className="der">Usado contra 0 km</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.porVariante.map((x) => (
                      <tr key={x.variante}>
                        <td>{x.variante}</td>
                        <td className="der">{x.cantidad}</td>
                        <td className="der font-semibold">{ars(x.mediana)}</td>
                        <td className="der">
                          {ars(x.ceroKm.promedio)}
                          {x.ceroKm.cantidad > 0 && <div className="text-[12.5px] text-muted">{x.ceroKm.cantidad} publicaciones</div>}
                        </td>
                        <td className="der">{ars(x.lista0km)}</td>
                        <td className={`der ${x.vs0km != null && x.vs0km >= s.umbral0km ? "font-semibold text-alerta" : ""}`}>
                          {x.vs0km != null ? pct(x.vs0km, 0) : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
            {a.porAnio.length > 1 && (
              <section className="panel overflow-x-auto">
                <h2 className="px-5 pt-4 text-[18px] font-bold">Por año</h2>
                <table className="tabla mt-1">
                  <thead>
                    <tr>
                      <th>Año</th>
                      <th className="der">Publicaciones</th>
                      <th className="der">Mediana</th>
                      <th className="der">Contra 0 km</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.porAnio.map((x) => (
                      <tr key={x.anio}>
                        <td>{x.anio}</td>
                        <td className="der">{x.cantidad}</td>
                        <td className="der font-semibold">{ars(x.mediana)}</td>
                        <td className={`der ${x.vs0km != null && x.vs0km >= s.umbral0km ? "font-semibold text-alerta" : ""}`}>
                          {x.vs0km != null ? pct(x.vs0km, 0) : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </div>
        </div>
      )}

      {filtradas.length > 0 && (
        <section id="publicaciones" className="panel scroll-mt-4 overflow-x-auto">
          <h2 className="px-5 pt-4 text-[18px] font-bold">Publicaciones</h2>
          <p className="px-5 text-[13px] text-muted">Tocá el título de una columna para ordenar; otra vez para invertir.</p>
          <table className="tabla mt-1">
            <thead>
              <tr>
                {th("plataforma", "Plataforma")}
                {th("anio", "Año")}
                {th("motor", "Motor")}
                {th("variante", "Variante y versión")}
                {th("km", "Km", true)}
                {th("vendedor", "Vendedor")}
                {th("precio", "Precio publicado", true)}
                {th("llamada", "Mínimo en llamada", true)}
                {th("dias", "Días", true)}
                {th("estado", "Estado")}
                {th("relevada", "Relevada")}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((l) => {
                const d = diasPublicada(l);
                return (
                  <tr key={l.id} className={l.comparable ? "" : "text-muted"}>
                    <td>
                      {l.link ? (
                        <a href={l.link} target="_blank" rel="noreferrer" className="enlace">{l.plataforma}</a>
                      ) : (
                        l.plataforma
                      )}
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {!l.comparable && <span className="marca-chip">No comparable</span>}
                        {l.mismaUnidadId != null && <span className="marca-chip">Misma unidad que #{l.mismaUnidadId}</span>}
                      </div>
                    </td>
                    <td>{l.anio}</td>
                    <td>{l.motor}</td>
                    <td>
                      {[l.variante, l.version].filter(Boolean).join(" · ")}
                      {(l.titulo || l.notas) && (
                        <div className="max-w-[340px] truncate text-[12.5px] text-muted" title={[l.titulo, l.notas].filter(Boolean).join(" — ")}>
                          {l.titulo ?? l.notas}
                        </div>
                      )}
                    </td>
                    <td className="der">{num(l.km)}</td>
                    <td>
                      {l.vendedor}
                      {l.zona && <div className="text-[12.5px] text-muted">{l.zona}</div>}
                    </td>
                    <td className="der font-semibold whitespace-nowrap">
                      {money(l.precio, l.moneda)}
                      {l.ultimoPrecio != null && l.ultimoPrecio !== l.precio && (
                        <div className="text-[12.5px] font-normal text-muted">ahora {money(l.ultimoPrecio, l.moneda)}</div>
                      )}
                    </td>
                    <td className="der whitespace-nowrap">
                      {l.llamadaPrecioMin != null && (
                        <>
                          {money(l.llamadaPrecioMin, l.moneda)}
                          <div className="text-[12.5px] text-muted">− {pct(1 - l.llamadaPrecioMin / l.precio)}</div>
                        </>
                      )}
                    </td>
                    <td className="der">{d}</td>
                    <td>{l.estado}</td>
                    <td className="whitespace-nowrap">{fecha(l.fechaRelevamiento)}</td>
                    <td>
                      <Link href={`/publicaciones/${l.id}`} className="enlace font-semibold">Abrir</Link>
                      <div className="text-[12px] text-muted">
                        #{l.id}
                        {conSupuestos(l) ? " · con supuestos" : ""}
                      </div>
                      <form action={alternarGuardada.bind(null, l.id, !l.guardada)}>
                        <button
                          className="enlace cursor-pointer text-[13px] whitespace-nowrap"
                          title={l.guardada ? (l.guardadaComentario ?? "Quitar de guardadas") : "Guardar en mi lista"}
                        >
                          {l.guardada ? "★ Guardada" : "☆ Guardar"}
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {ceroKm.length > 0 && (
        <section className="panel overflow-x-auto">
          <h2 className="px-5 pt-4 text-[18px] font-bold">Publicaciones 0 km</h2>
          <table className="tabla mt-1">
            <thead>
              <tr>
                <th>Plataforma</th>
                <th>Variante</th>
                <th>Vendedor</th>
                <th className="der">Precio publicado</th>
                <th>Relevada</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ceroKm.map((l) => (
                <tr key={l.id} className={l.comparable ? "" : "text-muted"}>
                  <td>
                    {l.link ? (
                      <a href={l.link} target="_blank" rel="noreferrer" className="enlace">{l.plataforma}</a>
                    ) : (
                      l.plataforma
                    )}
                    {!l.comparable && <div><span className="marca-chip">No entra en el promedio</span></div>}
                  </td>
                  <td>
                    {[l.variante, l.titulo].filter(Boolean).join(" · ")}
                    {l.notas && (
                      <div className="max-w-[420px] truncate text-[12.5px] text-muted" title={l.notas}>{l.notas}</div>
                    )}
                  </td>
                  <td>
                    {l.vendedor}
                    {l.zona && <div className="text-[12.5px] text-muted">{l.zona}</div>}
                  </td>
                  <td className="der font-semibold whitespace-nowrap">{money(l.precio, l.moneda)}</td>
                  <td className="whitespace-nowrap">{fecha(l.fechaRelevamiento)}</td>
                  <td>
                    <Link href={`/publicaciones/${l.id}`} className="enlace font-semibold">Abrir</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section id="agregar" className="panel scroll-mt-4 p-5">
        <h2 className="mb-3 text-[18px] font-bold">Agregar publicación</h2>
        <ListingForm
          action={crearPublicacion.bind(null, id)}
          otras={usadas.map((l) => ({ id: l.id, etiqueta: `#${l.id} · ${l.plataforma} · ${etiquetaCorta(l)} · ${money(l.precio, l.moneda)}` }))}
          variantes={variantes.map((v) => v.nombre)}
          hoy={hoy()}
          zonaSugerida={zonas.includes("Mendoza") ? "Mendoza" : (zonas[0] ?? "Mendoza")}
          textoBoton="Agregar publicación"
        />
      </section>

      <details className="panel p-5">
        <summary className="cursor-pointer text-[18px] font-bold">Datos del modelo</summary>
        <form action={actualizarModelo.bind(null, id)} className="mt-4 grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_150px_200px_auto]">
          <div>
            <label className="etiqueta" htmlFor="m-marca">Marca</label>
            <input id="m-marca" name="marca" defaultValue={model.marca} required className="campo" />
          </div>
          <div>
            <label className="etiqueta" htmlFor="m-nombre">Modelo</label>
            <input id="m-nombre" name="nombre" defaultValue={model.nombre} required className="campo" />
          </div>
          <div>
            <label className="etiqueta" htmlFor="m-tipo">Tipo</label>
            <select id="m-tipo" name="tipo" defaultValue={model.tipo} className="campo">
              {TIPOS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <button className="btn">Guardar modelo</button>
          <div>
            <label className="etiqueta" htmlFor="m-l0">Precio de lista 0 km (ARS)</label>
            <input id="m-l0" name="lista0km" defaultValue={model.lista0km ?? ""} inputMode="numeric" className="campo" placeholder="Vacío si ya no se vende nuevo" />
          </div>
          <div>
            <label className="etiqueta" htmlFor="m-l0v">Versión de referencia</label>
            <input id="m-l0v" name="lista0kmVersion" defaultValue={model.lista0kmVersion ?? ""} className="campo" />
          </div>
          <div>
            <label className="etiqueta" htmlFor="m-l0f">Fecha del precio</label>
            <input id="m-l0f" name="lista0kmFecha" type="date" defaultValue={model.lista0kmFecha ?? ""} className="campo" />
          </div>
          <div className="lg:col-span-2">
            <label className="etiqueta" htmlFor="m-l0s">Fuente (link)</label>
            <input id="m-l0s" name="lista0kmFuente" defaultValue={model.lista0kmFuente ?? ""} className="campo" />
          </div>
          <div className="sm:col-span-2 lg:col-span-5">
            <label className="etiqueta" htmlFor="m-notas">Notas</label>
            <textarea id="m-notas" name="notas" rows={2} defaultValue={model.notas ?? ""} className="campo" />
          </div>
        </form>
        <div className="mt-5 border-t border-line pt-4">
          <h3 className="font-semibold">Variantes y lista oficial 0 km</h3>
          <p className="mb-3 text-[13.5px] text-muted">
            Las variantes también se crean solas al cargar una publicación con una variante nueva.
          </p>
          <div className="space-y-2">
            {[...variantes, null].map((v) => (
              <form key={v?.id ?? "nueva"} action={guardarVariante.bind(null, id)} className="grid items-end gap-2 sm:grid-cols-[160px_180px_160px_1fr_auto]">
                <div>
                  <label className="etiqueta">{v ? "Variante" : "Nueva variante"}</label>
                  <input name="nombre" defaultValue={v?.nombre ?? ""} readOnly={!!v} required className="campo" placeholder="LTZ" />
                </div>
                <div>
                  <label className="etiqueta">Lista 0 km (ARS)</label>
                  <input name="lista0km" defaultValue={v?.lista0km ?? ""} inputMode="numeric" className="campo" />
                </div>
                <div>
                  <label className="etiqueta">Fecha</label>
                  <input name="lista0kmFecha" type="date" defaultValue={v?.lista0kmFecha ?? ""} className="campo" />
                </div>
                <div>
                  <label className="etiqueta">Fuente (link)</label>
                  <input name="lista0kmFuente" defaultValue={v?.lista0kmFuente ?? ""} className="campo" />
                </div>
                <button className="btn btn-sec">{v ? "Guardar" : "Agregar"}</button>
              </form>
            ))}
          </div>
        </div>
        <div className="mt-5 border-t border-line pt-4">
          <ConfirmButton
            action={eliminarModelo.bind(null, id)}
            pregunta={`¿Eliminar ${model.marca} ${model.nombre} con sus ${todas.length} publicaciones? No se puede deshacer.`}
          >
            Eliminar modelo y sus publicaciones
          </ConfirmButton>
        </div>
      </details>
    </div>
  );
}
