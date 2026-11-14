import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { ConfirmButton } from "@/components/Forms";
import { ListingForm } from "@/components/ListingForm";
import { diasEntre, hoy, money, num } from "@/lib/format";
import { editarPublicacion, eliminarPublicacion } from "../../actions";

export const dynamic = "force-dynamic";

export default async function PublicacionPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const db = await getDb();
  const [l] = id ? await db.select().from(schema.listings).where(eq(schema.listings.id, id)) : [];
  if (!l) notFound();
  const [model] = await db.select().from(schema.models).where(eq(schema.models.id, l.modelId));
  const otras = await db
    .select()
    .from(schema.listings)
    .where(and(eq(schema.listings.modelId, l.modelId), ne(schema.listings.id, id)));

  const variantes = await db.select().from(schema.variants).where(eq(schema.variants.modelId, l.modelId));

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <p className="text-[14px] text-muted">
          <Link href="/" className="enlace">Modelos</Link> /{" "}
          <Link href={`/modelos/${model.id}`} className="enlace">{model.marca} {model.nombre}</Link>
        </p>
        <h1 className="text-[28px] leading-tight font-extrabold tracking-tight">Publicación #{l.id}</h1>
        {l.link && (
          <a href={l.link} target="_blank" rel="noreferrer" className="enlace break-all">{l.link}</a>
        )}
      </div>
      <div className="panel p-5">
        <ListingForm
          action={editarPublicacion.bind(null, id, model.id)}
          listing={l}
          // Días que tenía publicada el día del relevamiento, igual que en la planilla.
          diasPublicada={l.fechaPublicacion ? diasEntre(l.fechaPublicacion, l.fechaRelevamiento) : null}
          otras={otras.map((o) => ({
            id: o.id,
            etiqueta: `#${o.id} · ${o.plataforma} · ${[o.anio, o.motor, o.km != null ? `${num(o.km)} km` : null].filter(Boolean).join(" · ")} · ${money(o.precio, o.moneda)}`,
          }))}
          variantes={variantes.map((v) => v.nombre)}
          hoy={hoy()}
          textoBoton="Guardar cambios"
        />
      </div>
      <ConfirmButton action={eliminarPublicacion.bind(null, id, model.id)} pregunta="¿Eliminar esta publicación? No se puede deshacer.">
        Eliminar publicación
      </ConfirmButton>
    </div>
  );
}
