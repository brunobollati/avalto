"use client";

import { useActionState, useState } from "react";
import type { Estado, EstadoImportacion } from "@/app/actions";

type Accion<S> = (prev: S, fd: FormData) => Promise<S>;

export function Mensaje({ estado }: { estado: Estado }) {
  if (!estado) return null;
  if (estado.error)
    return (
      <p role="alert" className="text-[14px] font-medium text-alerta">
        {estado.error}
      </p>
    );
  return (
    <p role="status" className="text-[14px] font-medium text-teal">
      {estado.ok}
    </p>
  );
}

export function LoginForm({ action }: { action: Accion<Estado> }) {
  const [estado, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="etiqueta" htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" className="campo" required autoFocus />
      </div>
      <Mensaje estado={estado} />
      <button className="btn w-full" disabled={pending}>Entrar</button>
    </form>
  );
}

export function ConfirmButton({
  action,
  pregunta,
  children,
}: {
  action: () => Promise<void>;
  pregunta: string;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(pregunta)) e.preventDefault();
      }}
    >
      <button className="btn btn-peligro">{children}</button>
    </form>
  );
}

type CampoSupuesto = {
  name: string;
  label: string;
  ayuda: string;
  valor: number | null;
  /** Lo que se usa si el campo queda vacío. */
  porDefecto?: string;
  sufijo?: string;
};

export function SupuestosForm({
  action,
  campos,
  textoBoton = "Guardar supuestos",
}: {
  action: Accion<Estado>;
  campos: CampoSupuesto[];
  textoBoton?: string;
}) {
  const [estado, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="panel divide-y divide-line">
      {campos.map((c) => (
        <div key={c.name} className="grid gap-x-6 gap-y-1 px-5 py-4 sm:grid-cols-[1fr_180px]">
          <div>
            <label htmlFor={c.name} className="font-semibold">{c.label}</label>
            <p className="max-w-[62ch] text-[13.5px] text-muted">{c.ayuda}</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              id={c.name}
              name={c.name}
              defaultValue={c.valor ?? ""}
              placeholder={c.porDefecto}
              inputMode="decimal"
              className="campo text-right"
            />
            {c.sufijo && <span className="w-8 text-muted">{c.sufijo}</span>}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-4 px-5 py-4">
        <button className="btn" disabled={pending}>{textoBoton}</button>
        <Mensaje estado={estado} />
      </div>
    </form>
  );
}

export function ImportForm({ action }: { action: Accion<EstadoImportacion> }) {
  const [estado, formAction, pending] = useActionState(action, null);
  const r = estado?.resultado;
  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="etiqueta" htmlFor="tsv">Filas copiadas de la planilla</label>
        <textarea
          id="tsv"
          name="tsv"
          rows={12}
          className="campo font-mono text-[12.5px] whitespace-pre"
          placeholder="Fecha relevamiento	Semana	Modelo	Año	Motor	…"
        />
      </div>
      <div className="max-w-xs">
        <label className="etiqueta" htmlFor="modelo">Modelo, si las filas no lo traen (opcional)</label>
        <input id="modelo" name="modelo" className="campo" placeholder="Kangoo" />
      </div>
      <button className="btn" disabled={pending}>{pending ? "Importando…" : "Importar publicaciones"}</button>
      {estado?.error && <p role="alert" className="font-medium text-alerta">{estado.error}</p>}
      {r && (
        <div role="status" className="panel px-5 py-4">
          <p className="font-semibold">
            {r.creadas} publicaciones nuevas, {r.actualizadas} actualizadas
            {r.errores.length ? `, ${r.errores.length} filas con error` : ""}.
          </p>
          {r.errores.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-[14px] text-alerta">
              {r.errores.map((e) => (
                <li key={e.fila}>Fila {e.fila}: {e.error}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}

/** Copia el pedido para Claude: la búsqueda de 0 km la hace Claude desde el chat, no la app. */
export function PedirActualizacion({ modelo }: { modelo: string }) {
  const [copiado, setCopiado] = useState(false);
  const pedido = `Actualizá en Avalto el 0 km del ${modelo}: buscá las publicaciones 0 km y la lista oficial por variante, cargalas y decime cómo quedó contra los usados.`;
  return (
    <button
      type="button"
      className="btn btn-sec"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(pedido);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 4000);
        } catch {
          window.prompt("Copiá este pedido y pegalo en el chat con Claude:", pedido);
        }
      }}
    >
      {copiado ? "Pedido copiado: pegalo en el chat con Claude" : "Actualizar 0 km"}
    </button>
  );
}

/** Panel de la publicación: guardarla en la lista con un comentario, o quitarla. */
export function GuardadaForm({
  action,
  quitar,
  guardada,
  comentario,
  desde,
}: {
  action: Accion<Estado>;
  quitar: () => Promise<void>;
  guardada: boolean;
  comentario: string | null;
  desde?: string;
}) {
  const [estado, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="etiqueta" htmlFor="guardadaComentario">
          Comentario{guardada && desde ? ` · guardada el ${desde}` : ""}
        </label>
        <textarea
          id="guardadaComentario"
          name="guardadaComentario"
          rows={3}
          defaultValue={comentario ?? ""}
          className="campo"
          placeholder="Por qué te interesa: buen precio, pocos km, llamar el lunes…"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn" disabled={pending}>{guardada ? "Guardar comentario" : "Guardar en mi lista"}</button>
        {guardada && (
          <button type="submit" formAction={quitar} className="btn btn-sec" disabled={pending}>
            Quitar de guardadas
          </button>
        )}
        <Mensaje estado={estado} />
      </div>
    </form>
  );
}
