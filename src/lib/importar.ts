import { guardarPublicacion } from "./listings";

// Encabezados de la planilla "Relevamiento" -> campo de la app.
const COLUMNAS: [RegExp, string][] = [
  [/^fecha relevamiento/, "fechaRelevamiento"],
  [/^modelo/, "modelo"],
  [/^marca/, "marca"],
  [/^a[ñn]o/, "anio"],
  [/^motor/, "motor"],
  [/^versi[oó]n/, "version"],
  [/^km/, "km"],
  [/^zona/, "zona"],
  [/^vendedor/, "vendedor"],
  [/^moneda/, "moneda"],
  [/^precio publicado en ars/, ""],
  [/^precio publicado/, "precio"],
  [/^precio$/, "precio"],
  [/^tc propio/, "tcPropio"],
  [/^d[ií]as publicada/, "diasPublicada"],
  [/^link/, "link"],
  [/^plataforma/, "plataforma"],
  [/^t[ií]tulo/, "titulo"],
  [/^fecha llamada/, "llamadaFecha"],
  [/^precio m[ií]nimo en ars/, ""],
  [/^precio m[ií]nimo/, "llamadaPrecioMin"],
  [/contado/, "llamadaContado"],
  [/^fecha revisi[oó]n/, "revisionFecha"],
  [/^estado/, "estado"],
  [/^[uú]ltimo precio/, "ultimoPrecio"],
  [/^notas/, "notas"],
];

// Orden de columnas de la planilla, por si se pega sin la fila de encabezados.
const ORDEN_PLANILLA = [
  "fechaRelevamiento", "", "modelo", "anio", "motor", "version", "km", "zona", "vendedor",
  "moneda", "precio", "tcPropio", "", "diasPublicada", "link", "llamadaFecha",
  "llamadaPrecioMin", "llamadaContado", "", "", "revisionFecha", "estado", "ultimoPrecio", "", "notas",
];

function mapearEncabezado(celdas: string[]): string[] | null {
  const campos = celdas.map((c) => {
    const t = c.trim().toLowerCase();
    return COLUMNAS.find(([re]) => re.test(t))?.[1] ?? "";
  });
  return campos.includes("modelo") && campos.includes("precio") ? campos : null;
}

export type ResultadoImportacion = {
  creadas: number;
  actualizadas: number;
  errores: { fila: number; error: string }[];
};

export async function importarTsv(tsv: string, modeloPorDefecto?: string): Promise<ResultadoImportacion> {
  const filas = tsv
    .split(/\r?\n/)
    .map((l) => l.split("\t"))
    .filter((c) => c.some((x) => x.trim()));
  let campos: string[] | null = null;
  let desde = 0;
  for (let i = 0; i < Math.min(filas.length, 6); i++) {
    campos = mapearEncabezado(filas[i]);
    if (campos) {
      desde = i + 1;
      break;
    }
  }
  if (!campos) campos = ORDEN_PLANILLA;

  const res: ResultadoImportacion = { creadas: 0, actualizadas: 0, errores: [] };
  for (let i = desde; i < filas.length; i++) {
    const input: Record<string, unknown> = {};
    campos.forEach((campo, j) => {
      const v = filas[i][j]?.trim();
      if (campo && v) input[campo] = v;
    });
    if (!input.modelo && modeloPorDefecto) input.modelo = modeloPorDefecto;
    if (!input.precio && !input.link) continue; // títulos y filas sueltas
    const r = await guardarPublicacion(input);
    if (!r.ok) res.errores.push({ fila: i + 1, error: r.error });
    else if (r.creada) res.creadas++;
    else res.actualizadas++;
  }
  return res;
}
