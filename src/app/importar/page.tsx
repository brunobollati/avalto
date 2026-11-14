import { ImportForm } from "@/components/Forms";
import { importar } from "../actions";

export default function ImportarPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-[28px] leading-tight font-extrabold tracking-tight">Importar planilla</h1>
        <p className="max-w-[70ch] text-muted">
          En la hoja Relevamiento del Google Sheet, seleccioná desde la fila de encabezados (Fecha relevamiento,
          Semana, Modelo…) hasta la última publicación, copiá y pegá acá. Los modelos que no existan se crean
          solos. Si un link ya está cargado, se actualiza esa publicación en vez de duplicarla.
        </p>
      </div>
      <ImportForm action={importar} />
    </div>
  );
}
