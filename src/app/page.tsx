import Link from "next/link";
import { getDb, schema } from "@/db";
import { ars, fecha, pct } from "@/lib/format";
import { modelosConResumen } from "@/lib/listings";
import { TIPOS } from "@/lib/options";
import { getSupuestos } from "@/lib/settings";
import { mediana, precioArs, ref0km } from "@/lib/stats";
import { crearModelo } from "./actions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [modelos, s, db] = await Promise.all([modelosConResumen(), getSupuestos(), getDb()]);
  const todas = await db.select().from(schema.listings);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[28px] leading-tight font-extrabold tracking-tight">Modelos</h1>
        <p className="text-muted">
          Cada modelo guarda sus publicaciones relevadas y calcula a cuánto se vende y cuánto pagar como máximo.
        </p>
      </div>

      {modelos.length === 0 ? (
        <p className="panel px-5 py-8 text-center text-muted">
          Todavía no hay modelos. Agregá el primero acá abajo o{" "}
          <Link href="/importar" className="enlace">importá la planilla de relevamiento</Link>.
        </p>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="tabla">
            <thead>
              <tr>
                <th>Modelo</th>
                <th>Tipo</th>
                <th className="der">Publicaciones</th>
                <th className="der">Mediana publicada</th>
                <th className="der">Más barata</th>
                <th className="der">Más cara</th>
                <th className="der">0 km de mercado</th>
                <th className="der">Lista 0 km</th>
                <th className="der">Usado contra 0 km</th>
                <th>Último relevamiento</th>
              </tr>
            </thead>
            <tbody>
              {modelos.map((m) => {
                const delModelo = todas.filter((l) => l.modelId === m.id);
                const r0 = ref0km(delModelo, s.tc);
                const base = r0.promedio ?? m.lista0km;
                const ps = delModelo
                  .filter((l) => !l.es0km && l.comparable && l.mismaUnidadId == null)
                  .map((l) => precioArs(l, s.tc))
                  .filter((p): p is number => p != null);
                const med = mediana(ps);
                return (
                  <tr key={m.id}>
                    <td>
                      <Link href={`/modelos/${m.id}`} className="enlace text-[16px] font-semibold">
                        {m.marca} {m.nombre}
                      </Link>
                    </td>
                    <td>{m.tipo}</td>
                    <td className="der">{ps.length}</td>
                    <td className="der font-semibold">{ars(med)}</td>
                    <td className="der">{ps.length ? ars(Math.min(...ps)) : ""}</td>
                    <td className="der">{ps.length ? ars(Math.max(...ps)) : ""}</td>
                    <td className="der">
                      {ars(r0.promedio)}
                      {r0.cantidad > 0 && <div className="text-[12.5px] text-muted">{r0.cantidad} publicaciones</div>}
                    </td>
                    <td className="der">{ars(m.lista0km)}</td>
                    <td className="der">
                      {med != null && base ? (
                        <>
                          <span className="font-semibold">{pct(med / base, 0)}</span>
                          <div className="text-[12.5px] text-muted">
                            {med / base >= s.umbral0km ? "Muy cerca: mala reventa" : "Con distancia"}
                          </div>
                        </>
                      ) : (
                        ""
                      )}
                    </td>
                    <td>{fecha(m.ultima)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <section className="panel max-w-3xl p-5">
        <h2 className="mb-3 text-[18px] font-bold">Agregar modelo</h2>
        <form action={crearModelo} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_160px_auto]">
          <div>
            <label className="etiqueta" htmlFor="marca">Marca</label>
            <input id="marca" name="marca" className="campo" required placeholder="Renault" />
          </div>
          <div>
            <label className="etiqueta" htmlFor="nombre">Modelo</label>
            <input id="nombre" name="nombre" className="campo" required placeholder="Kangoo" />
          </div>
          <div>
            <label className="etiqueta" htmlFor="tipo">Tipo</label>
            <select id="tipo" name="tipo" className="campo">
              {TIPOS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <button className="btn">Agregar modelo</button>
        </form>
      </section>
    </div>
  );
}
