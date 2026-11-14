"use client";

import { useActionState, useState } from "react";
import type { Estado } from "@/app/actions";
import type { Listing } from "@/db/schema";
import {
  ESTADOS,
  MONEDAS,
  MOTORES,
  PLATAFORMAS,
  VENDEDORES,
  VERSIONES,
  detectarPlataforma,
} from "@/lib/options";
import { Mensaje } from "./Forms";

type Props = {
  action: (prev: Estado, fd: FormData) => Promise<Estado>;
  listing?: Listing;
  diasPublicada?: number | null;
  otras: { id: number; etiqueta: string }[];
  variantes: string[];
  hoy: string;
  zonaSugerida?: string;
  textoBoton: string;
};

function Campo({
  label,
  name,
  children,
  className = "",
}: {
  label: string;
  name: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="etiqueta" htmlFor={name}>{label}</label>
      {children}
    </div>
  );
}

function Lista({
  name,
  opciones,
  valor,
  vacio = "Sin dato",
}: {
  name: string;
  opciones: readonly string[];
  valor?: string | null;
  vacio?: string | null;
}) {
  const extra = valor && !opciones.includes(valor) ? [valor] : [];
  return (
    <select id={name} name={name} defaultValue={valor ?? ""} className="campo">
      {vacio !== null && <option value="">{vacio}</option>}
      {[...opciones, ...extra].map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
}

export function ListingForm({ action, listing: l, diasPublicada, otras, variantes, hoy, zonaSugerida, textoBoton }: Props) {
  const [estado, formAction, pending] = useActionState(action, null);
  const [plataforma, setPlataforma] = useState(l?.plataforma ?? "Otra");
  const editando = !!l;
  // Después de agregar una, el formulario se vacía para cargar la siguiente.
  const [vuelta, setVuelta] = useState(0);
  const [ultimoOk, setUltimoOk] = useState<Estado>(null);
  if (!editando && estado?.ok && estado !== ultimoOk) {
    setUltimoOk(estado);
    setVuelta((v) => v + 1);
    setPlataforma("Otra");
  }

  return (
    <form action={formAction} key={vuelta} className="space-y-6">
      <fieldset className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-6">
        <legend className="mb-2 font-semibold">Publicación</legend>
        <Campo label="Link" name="link" className="sm:col-span-2 lg:col-span-4">
          <input
            id="link"
            name="link"
            type="url"
            defaultValue={l?.link ?? ""}
            className="campo"
            placeholder="https://auto.mercadolibre.com.ar/…"
            onChange={(e) => {
              const p = detectarPlataforma(e.target.value);
              if (p !== "Otra") setPlataforma(p);
            }}
          />
        </Campo>
        <Campo label="Plataforma" name="plataforma" className="lg:col-span-2">
          <select
            id="plataforma"
            name="plataforma"
            value={plataforma}
            onChange={(e) => setPlataforma(e.target.value)}
            className="campo"
          >
            {PLATAFORMAS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Precio publicado" name="precio" className="lg:col-span-2">
          <input id="precio" name="precio" inputMode="numeric" required defaultValue={l?.precio ?? ""} className="campo" placeholder="17.500.000" />
        </Campo>
        <Campo label="Moneda" name="moneda">
          <Lista name="moneda" opciones={MONEDAS} valor={l?.moneda ?? "ARS"} vacio={null} />
        </Campo>
        <Campo label="TC propio (solo USD)" name="tcPropio">
          <input id="tcPropio" name="tcPropio" inputMode="decimal" defaultValue={l?.tcPropio ?? ""} className="campo" />
        </Campo>
        <Campo label="Fecha de relevamiento" name="fechaRelevamiento" className="lg:col-span-2">
          <input id="fechaRelevamiento" name="fechaRelevamiento" type="date" defaultValue={l?.fechaRelevamiento ?? hoy} className="campo" />
        </Campo>
        <Campo label="Año" name="anio">
          <input id="anio" name="anio" inputMode="numeric" defaultValue={l?.anio ?? ""} className="campo" placeholder="2018" />
        </Campo>
        <Campo label="Km" name="km">
          <input id="km" name="km" inputMode="numeric" defaultValue={l?.km ?? ""} className="campo" placeholder="145.000" />
        </Campo>
        <Campo label="Motor" name="motor">
          <Lista name="motor" opciones={MOTORES} valor={l?.motor} />
        </Campo>
        <Campo label="Versión" name="version">
          <Lista name="version" opciones={VERSIONES} valor={l?.version} />
        </Campo>
        <Campo label="Vendedor" name="vendedor">
          <Lista name="vendedor" opciones={VENDEDORES} valor={l?.vendedor} />
        </Campo>
        <Campo label="Zona" name="zona">
          <input id="zona" name="zona" defaultValue={l?.zona ?? zonaSugerida ?? ""} className="campo" />
        </Campo>
        <Campo label="Días publicada" name="diasPublicada">
          <input id="diasPublicada" name="diasPublicada" inputMode="numeric" defaultValue={diasPublicada ?? ""} className="campo" />
        </Campo>
        <Campo label="Variante" name="variante" className="lg:col-span-2">
          <input id="variante" name="variante" list="variantes" defaultValue={l?.variante ?? ""} className="campo" placeholder="LT, LTZ, Track…" />
          <datalist id="variantes">
            {variantes.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </Campo>
        <Campo label="Título o versión exacta" name="titulo" className="sm:col-span-2 lg:col-span-3">
          <input id="titulo" name="titulo" defaultValue={l?.titulo ?? ""} className="campo" placeholder="Kangoo II Express Confort 1.5 dCi" />
        </Campo>
        <Campo label="Notas" name="notas" className="sm:col-span-2 lg:col-span-6">
          <textarea id="notas" name="notas" rows={editando ? 4 : 2} defaultValue={l?.notas ?? ""} className="campo" />
        </Campo>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="flex items-start gap-2">
            <input type="checkbox" name="noComparable" defaultChecked={l ? !l.comparable : false} className="mt-1 size-4" />
            <span>
              No comparable
              <span className="block text-[13px] text-muted">
                Queda guardada pero no entra en el análisis (equipo de frío, motor roto, casi 0 km).
              </span>
            </span>
          </label>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="flex items-start gap-2">
            <input type="checkbox" name="es0km" defaultChecked={l?.es0km ?? false} className="mt-1 size-4" />
            <span>
              Es una unidad 0 km
              <span className="block text-[13px] text-muted">
                No entra en el análisis de usados: se usa para calcular el precio 0 km de mercado del modelo.
              </span>
            </span>
          </label>
        </div>
        {otras.length > 0 && (
          <Campo label="Es la misma unidad que otra publicación" name="mismaUnidadId" className="sm:col-span-2 lg:col-span-3">
            <select id="mismaUnidadId" name="mismaUnidadId" defaultValue={l?.mismaUnidadId ?? ""} className="campo">
              <option value="">No, es otra unidad</option>
              {otras.map((o) => (
                <option key={o.id} value={o.id}>{o.etiqueta}</option>
              ))}
            </select>
          </Campo>
        )}
      </fieldset>

      <details open={editando} className="group">
        <summary className="cursor-pointer font-semibold">Llamada y seguimiento</summary>
        <div className="mt-3 grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-6">
          <Campo label="Fecha de la llamada" name="llamadaFecha" className="lg:col-span-2">
            <input id="llamadaFecha" name="llamadaFecha" type="date" defaultValue={l?.llamadaFecha ?? ""} className="campo" />
          </Campo>
          <Campo label="Precio mínimo que dijo" name="llamadaPrecioMin" className="lg:col-span-2">
            <input id="llamadaPrecioMin" name="llamadaPrecioMin" inputMode="numeric" defaultValue={l?.llamadaPrecioMin ?? ""} className="campo" />
          </Campo>
          <Campo label="¿Ese mínimo es de contado?" name="llamadaContado" className="lg:col-span-2">
            <select id="llamadaContado" name="llamadaContado" defaultValue={l?.llamadaContado == null ? "" : l.llamadaContado ? "Sí" : "No"} className="campo">
              <option value="">Sin dato</option>
              <option>Sí</option>
              <option>No</option>
            </select>
          </Campo>
          <Campo label="Fecha de revisión" name="revisionFecha" className="lg:col-span-2">
            <input id="revisionFecha" name="revisionFecha" type="date" defaultValue={l?.revisionFecha ?? ""} className="campo" />
          </Campo>
          <Campo label="Estado al revisar" name="estado" className="lg:col-span-2">
            <Lista name="estado" opciones={ESTADOS} valor={l?.estado ?? "Activa"} vacio={null} />
          </Campo>
          <Campo label="Último precio visto" name="ultimoPrecio" className="lg:col-span-2">
            <input id="ultimoPrecio" name="ultimoPrecio" inputMode="numeric" defaultValue={l?.ultimoPrecio ?? ""} className="campo" />
          </Campo>
        </div>
      </details>

      <div className="flex items-center gap-4">
        <button className="btn" disabled={pending}>{textoBoton}</button>
        <Mensaje estado={estado} />
      </div>
    </form>
  );
}
