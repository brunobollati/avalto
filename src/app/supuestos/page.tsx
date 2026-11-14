import { SupuestosForm } from "@/components/Forms";
import { getSupuestos } from "@/lib/settings";
import { guardarSupuestos } from "../actions";

export const dynamic = "force-dynamic";

export default async function SupuestosPage() {
  const s = await getSupuestos();
  const p = (v: number) => Math.round(v * 10000) / 100;
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-[28px] leading-tight font-extrabold tracking-tight">Supuestos</h1>
        <p className="text-muted">Valen para el análisis de todos los modelos. La preparación se carga en cada modelo.</p>
      </div>
      <SupuestosForm
        action={guardarSupuestos}
        campos={[
          { name: "tc", label: "Tipo de cambio (ARS por USD)", valor: s.tc, ayuda: "La cotización con la que operás (MEP o CCL). Pasa a pesos las publicaciones en dólares que no tienen un TC propio." },
          { name: "descuento", label: "Descuento de negociación supuesto", valor: p(s.descuento), sufijo: "%", ayuda: "Se usa mientras no haya llamadas suficientes para medirlo." },
          { name: "llamadasMin", label: "Llamadas mínimas para usar el descuento medido", valor: s.llamadasMin, ayuda: "Con esta cantidad de llamadas en el filtro, el análisis reemplaza el supuesto por la mediana de lo que te dijeron." },
          { name: "pubsMin", label: "Publicaciones mínimas para sacar conclusión", valor: s.pubsMin, ayuda: "Con menos publicaciones comparables la mediana es poco confiable." },
          { name: "transferencia", label: "Transferencia del vehículo", valor: p(s.transferencia), sufijo: "%", ayuda: "Sobre el precio de venta: arancel del registro, sellos y gestoría." },
          { name: "margen", label: "Margen objetivo", valor: p(s.margen), sufijo: "%", ayuda: "Sobre el precio de venta: lo que tiene que quedar por unidad después de todos los costos." },
          { name: "informes", label: "Informes previos a la transferencia (ARS por compra)", valor: s.informes, ayuda: "Informe de dominio, multas y deudas." },
          { name: "revision", label: "Revisión del mecánico (ARS por revisión)", valor: s.revision, ayuda: "Lo que cobra por revisar una unidad antes de comprar." },
          { name: "revisionesPorCompra", label: "Revisiones por cada unidad comprada", valor: s.revisionesPorCompra, ayuda: "Cuántas unidades revisás hasta comprar una. Cada revisión se paga aunque no compres." },
          { name: "umbral0km", label: "Usado demasiado cerca del 0 km", valor: p(s.umbral0km), sufijo: "%", ayuda: "Si la mediana de los usados supera este porcentaje del precio 0 km, el modelo se marca como mala reventa: al comprador le conviene el nuevo." },
        ]}
      />
    </div>
  );
}
