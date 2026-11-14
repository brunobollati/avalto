"use client";

import { useState } from "react";
import { ars, num } from "@/lib/format";

export type Punto = {
  id: number;
  anio: number | null;
  km: number | null;
  precio: number;
  plataforma: string;
  etiqueta: string;
};

// Tres primeras posiciones de la paleta categórica (validadas entre sí) y gris neutro para "Otra".
const COLOR: Record<string, string> = {
  "Facebook Marketplace": "#2a78d6",
  "Mercado Libre": "#eb6834",
  deRuedas: "#1baf7a",
  Otra: "#8a9499",
};

const W = 640;
const H = 320;
const M = { l: 58, r: 16, t: 12, b: 38 };

function ticks(min: number, max: number, n: number): number[] {
  const span = max - min || 1;
  const raw = span / n;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(v);
  return out;
}

export function Scatter({ puntos }: { puntos: Punto[] }) {
  const [eje, setEje] = useState<"anio" | "km">("anio");
  const [activo, setActivo] = useState<number | null>(null);
  const data = puntos.filter((p) => p[eje] != null);
  const plataformas = Object.keys(COLOR).filter((p) => puntos.some((x) => x.plataforma === p));

  const xs = data.map((p) => p[eje] as number);
  const ys = data.map((p) => p.precio);
  const pad = (a: number, b: number, min: number) => Math.max((b - a) * 0.06, min);
  const x0 = Math.min(...xs) - pad(Math.min(...xs), Math.max(...xs), eje === "anio" ? 0.5 : 5000);
  const x1 = Math.max(...xs) + pad(Math.min(...xs), Math.max(...xs), eje === "anio" ? 0.5 : 5000);
  const y0 = Math.min(...ys) - pad(Math.min(...ys), Math.max(...ys), 500000);
  const y1 = Math.max(...ys) + pad(Math.min(...ys), Math.max(...ys), 500000);
  const sx = (v: number) => M.l + ((v - x0) / (x1 - x0)) * (W - M.l - M.r);
  const sy = (v: number) => H - M.b - ((v - y0) / (y1 - y0)) * (H - M.t - M.b);
  const xt = eje === "anio" ? ticks(Math.ceil(x0), Math.floor(x1), 8).filter(Number.isInteger) : ticks(x0, x1, 6);
  const yt = ticks(y0, y1, 5);
  const sel = data.find((p) => p.id === activo);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-4 text-[13px]">
          {plataformas.map((p) => (
            <span key={p} className="flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-full" style={{ background: COLOR[p] }} />
              {p}
            </span>
          ))}
        </div>
        <div className="flex text-[13px]" role="group" aria-label="Eje horizontal">
          {(["anio", "km"] as const).map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEje(e)}
              aria-pressed={eje === e}
              className={`cursor-pointer border border-line px-3 py-1 first:rounded-l last:-ml-px last:rounded-r ${eje === e ? "bg-ink text-white" : "bg-panel"}`}
            >
              {e === "anio" ? "Por año" : "Por km"}
            </button>
          ))}
        </div>
      </div>
      {data.length === 0 ? (
        <p className="py-10 text-center text-muted">
          Ninguna publicación del filtro tiene {eje === "anio" ? "año" : "km"} cargado.
        </p>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Precio publicado de cada publicación">
            {yt.map((v) => (
              <g key={v}>
                <line x1={M.l} x2={W - M.r} y1={sy(v)} y2={sy(v)} stroke="#e4e8e7" />
                <text x={M.l - 8} y={sy(v) + 4} textAnchor="end" fontSize="11" fill="#5b6b70">
                  {(v / 1e6).toLocaleString("es-AR")} M
                </text>
              </g>
            ))}
            {xt.map((v) => (
              <text key={v} x={sx(v)} y={H - M.b + 18} textAnchor="middle" fontSize="11" fill="#5b6b70">
                {eje === "anio" ? v : num(v)}
              </text>
            ))}
            <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} stroke="#b9c2c0" />
            {data.map((p) => (
              <circle
                key={p.id}
                cx={sx(p[eje] as number)}
                cy={sy(p.precio)}
                r={activo === p.id ? 7 : 5}
                fill={COLOR[p.plataforma] ?? COLOR.Otra}
                stroke="#fff"
                strokeWidth="2"
              />
            ))}
            {/* Zona de hover más grande que el punto. */}
            {data.map((p) => (
              <circle
                key={`h${p.id}`}
                cx={sx(p[eje] as number)}
                cy={sy(p.precio)}
                r="12"
                fill="transparent"
                tabIndex={0}
                aria-label={`${p.etiqueta}, ${ars(p.precio)}`}
                onMouseEnter={() => setActivo(p.id)}
                onMouseLeave={() => setActivo(null)}
                onFocus={() => setActivo(p.id)}
                onBlur={() => setActivo(null)}
              />
            ))}
          </svg>
          {sel && (
            <div
              className="pointer-events-none absolute z-10 w-56 rounded border border-line bg-panel px-3 py-2 text-[13px] shadow-md"
              style={{
                left: `${Math.min(Math.max((sx(sel[eje] as number) / W) * 100, 18), 82)}%`,
                top: `${(sy(sel.precio) / H) * 100}%`,
                transform: "translate(-50%, calc(-100% - 12px))",
              }}
            >
              <div className="font-semibold">{ars(sel.precio)}</div>
              <div>{sel.etiqueta}</div>
              <div className="text-muted">{sel.plataforma}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
