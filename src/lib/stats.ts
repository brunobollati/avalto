import type { Listing, Model, Variant } from "@/db/schema";
import { diasEntre, hoy } from "./format";

export type Supuestos = {
  tc: number;
  descuento: number;
  llamadasMin: number;
  pubsMin: number;
  transferencia: number;
  margen: number;
  informes: number;
  revision: number;
  revisionesPorCompra: number;
  umbral0km: number;
};

export type Filtros = {
  variante?: string;
  motor?: string;
  version?: string;
  anioDesde?: number;
  anioHasta?: number;
  kmDesde?: number;
  kmHasta?: number;
  zona?: string;
  plataforma?: string;
  vendedor?: string;
};

export function mediana(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function aArs(monto: number | null, l: Listing, tc: number): number | null {
  if (monto == null) return null;
  if (l.moneda !== "USD") return monto;
  const t = l.tcPropio || tc;
  return t ? monto * t : null;
}

export const precioArs = (l: Listing, tc: number) => aArs(l.precio, l, tc);

export function diasPublicada(l: Listing): number | null {
  return l.fechaPublicacion ? Math.max(0, diasEntre(l.fechaPublicacion, hoy())) : null;
}

export function pasaFiltros(l: Listing, f: Filtros): boolean {
  if (f.variante && l.variante !== f.variante) return false;
  if (f.motor && l.motor !== f.motor) return false;
  if (f.version && l.version !== f.version) return false;
  if (f.zona && l.zona !== f.zona) return false;
  if (f.plataforma && l.plataforma !== f.plataforma) return false;
  if (f.vendedor && l.vendedor !== f.vendedor) return false;
  // Con filtro de año o km, las publicaciones sin ese dato quedan afuera.
  if (f.anioDesde != null && (l.anio == null || l.anio < f.anioDesde)) return false;
  if (f.anioHasta != null && (l.anio == null || l.anio > f.anioHasta)) return false;
  if (f.kmDesde != null && (l.km == null || l.km < f.kmDesde)) return false;
  if (f.kmHasta != null && (l.km == null || l.km > f.kmHasta)) return false;
  return true;
}

export type PorPlataforma = {
  plataforma: string;
  cantidad: number;
  mediana: number | null;
  min: number | null;
  max: number | null;
  medianaDias: number | null;
};

export type Ref0km = {
  /** Fecha del último relevamiento de 0 km; el promedio usa solo esa tanda (7 días). */
  fecha: string | null;
  cantidad: number;
  promedio: number | null;
  mediana: number | null;
  min: number | null;
  max: number | null;
};

export type PorVariante = {
  variante: string;
  cantidad: number;
  mediana: number | null;
  ceroKm: Ref0km;
  lista0km: number | null;
  vs0km: number | null;
};

export type PorAnio = { anio: number; cantidad: number; mediana: number; vs0km: number | null };

/** Precio 0 km de mercado: promedio de las publicaciones 0 km del modelo (sin las marcadas no comparables). */
export function ref0km(todas: Listing[], tc: number, variante?: string): Ref0km {
  const cand = todas.filter((l) => l.es0km && l.comparable && (!variante || l.variante === variante));
  // Los 0 km suben todos los meses: solo cuenta la última tanda relevada.
  const fecha = cand.reduce<string | null>((m, l) => (!m || l.fechaRelevamiento > m ? l.fechaRelevamiento : m), null);
  const ps = cand
    .filter((l) => fecha != null && diasEntre(l.fechaRelevamiento, fecha) <= 7)
    .map((l) => precioArs(l, tc))
    .filter((p): p is number => p != null);
  return {
    fecha,
    cantidad: ps.length,
    promedio: ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : null,
    mediana: mediana(ps),
    min: ps.length ? Math.min(...ps) : null,
    max: ps.length ? Math.max(...ps) : null,
  };
}

export type Analisis = {
  ref0km: Ref0km;
  /** Contra qué se compara el usado: promedio de 0 km publicados o, si no hay, la lista oficial. */
  base0km: number | null;
  base0kmOrigen: "mercado" | "lista" | null;
  vs0km: number | null;
  porAnio: PorAnio[];
  porVariante: PorVariante[];
  cantidad: number;
  duplicadas: number;
  noComparables: number;
  sinPrecioArs: number;
  mediana: number | null;
  min: number | null;
  max: number | null;
  medianaDias: number | null;
  llamadas: number;
  descuentoLlamadas: number | null;
  rebajadas: number;
  rebajaMediana: number | null;
  descuentoUsado: number;
  descuentoMedido: boolean;
  ventaReal: number | null;
  costoRevision: number;
  informes: number;
  preparacion: number;
  transferencia: number | null;
  margen: number | null;
  precioMaxCompra: number | null;
  precioMaxCompraUsd: number | null;
  alcanza: boolean;
  porPlataforma: PorPlataforma[];
};

export function analizar(
  model: Model,
  todas: Listing[],
  filtros: Filtros,
  s: Supuestos,
  variantes: Variant[] = [],
): { analisis: Analisis; filtradas: Listing[] } {
  // Con una variante elegida, el 0 km se compara contra esa misma variante.
  const r0 = ref0km(todas, s.tc, filtros.variante);
  const listaVar = (nombre?: string | null) => variantes.find((v) => v.nombre === nombre)?.lista0km ?? null;
  const lista = filtros.variante ? (listaVar(filtros.variante) ?? model.lista0km) : model.lista0km;
  const base0km = r0.promedio ?? lista ?? null;
  const filtradas = todas.filter((l) => !l.es0km && pasaFiltros(l, filtros));
  const comparables = filtradas.filter((l) => l.comparable);
  // Una unidad publicada en dos plataformas cuenta una sola vez en los números generales.
  const unicas = comparables.filter((l) => l.mismaUnidadId == null);

  const precios = unicas.map((l) => precioArs(l, s.tc)).filter((p): p is number => p != null);
  const med = mediana(precios);

  const descuentos: number[] = [];
  const rebajas: number[] = [];
  for (const l of unicas) {
    if (l.llamadaPrecioMin != null && l.precio > 0) descuentos.push(1 - l.llamadaPrecioMin / l.precio);
    if (l.ultimoPrecio != null && l.precio > 0 && l.ultimoPrecio < l.precio)
      rebajas.push(1 - l.ultimoPrecio / l.precio);
  }
  const descuentoLlamadas = mediana(descuentos);
  const descuentoMedido = descuentos.length >= s.llamadasMin && descuentoLlamadas != null;
  const descuentoUsado = descuentoMedido ? (descuentoLlamadas as number) : s.descuento;

  const ventaReal = med == null ? null : med * (1 - descuentoUsado);
  const costoRevision = s.revision * s.revisionesPorCompra;
  const transferencia = ventaReal == null ? null : ventaReal * s.transferencia;
  const margen = ventaReal == null ? null : ventaReal * s.margen;
  const precioMaxCompra =
    ventaReal == null
      ? null
      : ventaReal - costoRevision - s.informes - model.preparacionArs - transferencia! - margen!;

  const dias = (ls: Listing[]) =>
    mediana(ls.map(diasPublicada).filter((d): d is number => d != null));

  const plataformas = [...new Set(comparables.map((l) => l.plataforma))].sort();
  const porPlataforma = plataformas.map((plataforma) => {
    const ls = comparables.filter((l) => l.plataforma === plataforma);
    const ps = ls.map((l) => precioArs(l, s.tc)).filter((p): p is number => p != null);
    return {
      plataforma,
      cantidad: ls.length,
      mediana: mediana(ps),
      min: ps.length ? Math.min(...ps) : null,
      max: ps.length ? Math.max(...ps) : null,
      medianaDias: dias(ls),
    };
  });

  const anios = [...new Set(unicas.map((l) => l.anio).filter((a): a is number => a != null))].sort((a, b) => b - a);
  const porAnio = anios.map((anio) => {
    const ps = unicas
      .filter((l) => l.anio === anio)
      .map((l) => precioArs(l, s.tc))
      .filter((p): p is number => p != null);
    const m = mediana(ps) ?? 0;
    return { anio, cantidad: ps.length, mediana: m, vs0km: base0km ? m / base0km : null };
  }).filter((x) => x.cantidad > 0);

  const SIN = "Sin variante";
  const nombres = [
    ...new Set([
      ...variantes.map((v) => v.nombre),
      ...unicas.map((l) => l.variante ?? SIN),
    ]),
  ].sort((a, b) => (a === SIN ? 1 : b === SIN ? -1 : a.localeCompare(b)));
  const porVariante = nombres
    .map((variante) => {
      const ps = unicas
        .filter((l) => (l.variante ?? SIN) === variante)
        .map((l) => precioArs(l, s.tc))
        .filter((p): p is number => p != null);
      const c0 = variante === SIN ? ref0km([], s.tc) : ref0km(todas, s.tc, variante);
      const l0 = listaVar(variante);
      const m = mediana(ps);
      const base = c0.promedio ?? l0;
      return { variante, cantidad: ps.length, mediana: m, ceroKm: c0, lista0km: l0, vs0km: m != null && base ? m / base : null };
    })
    .filter((x) => x.cantidad > 0 || x.ceroKm.cantidad > 0 || x.lista0km != null);

  return {
    filtradas,
    analisis: {
      ref0km: r0,
      base0km,
      base0kmOrigen: r0.promedio != null ? "mercado" : lista != null ? "lista" : null,
      porVariante,
      vs0km: med != null && base0km ? med / base0km : null,
      porAnio,
      cantidad: precios.length,
      duplicadas: comparables.length - unicas.length,
      noComparables: filtradas.length - comparables.length,
      sinPrecioArs: unicas.length - precios.length,
      mediana: med,
      min: precios.length ? Math.min(...precios) : null,
      max: precios.length ? Math.max(...precios) : null,
      medianaDias: dias(unicas),
      llamadas: descuentos.length,
      descuentoLlamadas,
      rebajadas: rebajas.length,
      rebajaMediana: mediana(rebajas),
      descuentoUsado,
      descuentoMedido,
      ventaReal,
      costoRevision,
      informes: s.informes,
      preparacion: model.preparacionArs,
      transferencia,
      margen,
      precioMaxCompra,
      precioMaxCompraUsd: precioMaxCompra != null && s.tc ? precioMaxCompra / s.tc : null,
      alcanza: precios.length >= s.pubsMin && descuentos.length >= s.llamadasMin,
      porPlataforma,
    },
  };
}
