import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { ars, fecha, money, num } from "@/lib/format";
import { getSupuestos } from "@/lib/settings";
import { cuentaUnidad, diasPublicada } from "@/lib/stats";
import { alternarGuardada } from "../actions";

export const dynamic = "force-dynamic";

export default async function GuardadasPage() {
  const db = await getDb();
  const [guardadas, s] = await Promise.all([
    db.select().from(schema.listings).where(eq(schema.listings.guardada, true)).orderBy(desc(schema.listings.guardadaFecha)),
    getSupuestos(),
  ]);
  // La cuenta de cada unidad necesita las demás publicaciones de su modelo.
  const [todas, modelos, variantes] = guardadas.length
    ? await Promise.all([
        db.select().from(schema.listings),
        db.select().from(schema.models),
        db.select().from(schema.variants),
      ])
    : [[], [], []];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] leading-tight font-extrabold tracking-tight">Guardadas</h1>
        <p className="text-muted">
          Las unidades que marcaste para volver a mirar, con tu comentario y la cuenta de compra de cada una.
        </p>
      </div>

      {guardadas.length === 0 ? (
        <p className="panel px-5 py-8 text-center text-muted">
          Todavía no guardaste ninguna. En la tabla de un modelo tocá «☆ Guardar», o abrí la publicación para
          guardarla con un comentario.
        </p>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="tabla">
            <thead>
              <tr>
                <th>Unidad</th>
                <th>Comentario</th>
                <th className="der">Piden</th>
                <th className="der">Máximo de compra</th>
                <th>Vendedor</th>
                <th>Estado</th>
                <th>Guardada</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {guardadas.map((l) => {
                const model = modelos.find((m) => m.id === l.modelId);
                if (!model) return null;
                const c = l.es0km
                  ? null
                  : cuentaUnidad(
                      l,
                      model,
                      todas.filter((x) => x.modelId === l.modelId),
                      s,
                      variantes.filter((v) => v.modelId === l.modelId),
                    );
                const d = diasPublicada(l);
                return (
                  <tr key={l.id}>
                    <td>
                      <Link href={`/publicaciones/${l.id}`} className="enlace font-semibold">
                        {[model.marca, model.nombre, l.variante, l.anio].filter(Boolean).join(" ")}
                        {l.es0km ? " 0 km" : ""}
                      </Link>
                      <div className="text-[12.5px] text-muted">
                        {[l.motor, l.version, l.km != null ? `${num(l.km)} km` : null].filter(Boolean).join(" · ")}
                      </div>
                      {l.link && (
                        <a href={l.link} target="_blank" rel="noreferrer" className="enlace text-[13px]">
                          Ver en {l.plataforma}
                        </a>
                      )}
                    </td>
                    <td className="max-w-[360px] whitespace-pre-line">
                      {l.guardadaComentario ?? (
                        <Link href={`/publicaciones/${l.id}`} className="text-muted hover:underline">
                          Sin comentario: agregar
                        </Link>
                      )}
                    </td>
                    <td className="der font-semibold whitespace-nowrap">
                      {money(l.llamadaPrecioMin ?? l.ultimoPrecio ?? l.precio, l.moneda)}
                      <div className="text-[12.5px] font-normal text-muted">
                        {l.llamadaPrecioMin != null ? "en la llamada" : "publicado"}
                      </div>
                    </td>
                    <td className="der whitespace-nowrap">
                      {c?.precioMaxCompra != null ? ars(c.precioMaxCompra) : ""}
                      {c?.diferencia != null && (
                        <div className={`text-[12.5px] font-semibold ${c.diferencia >= 0 ? "text-teal" : "text-alerta"}`}>
                          {c.diferencia >= 0 ? "Entra en la cuenta" : `No entra: faltan ${ars(-c.diferencia)}`}
                        </div>
                      )}
                    </td>
                    <td>
                      {l.vendedor}
                      {l.zona && <div className="text-[12.5px] text-muted">{l.zona}</div>}
                    </td>
                    <td>
                      {l.estado}
                      {d != null && <div className="text-[12.5px] text-muted">{num(d)} días publicada</div>}
                    </td>
                    <td className="whitespace-nowrap">{l.guardadaFecha ? fecha(l.guardadaFecha.toISOString()) : ""}</td>
                    <td>
                      <form action={alternarGuardada.bind(null, l.id, false)}>
                        <button className="enlace cursor-pointer text-[13px] whitespace-nowrap">Quitar</button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
