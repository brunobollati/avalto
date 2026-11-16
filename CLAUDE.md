@AGENTS.md

# Radar (Avalto): relevamiento de precios

Leé README.md para el alcance y la API.

- Idioma de la interfaz y de los nombres de dominio: español rioplatense.
- Los campos amarillos son los que carga el usuario (misma convención que su planilla).
- La lógica del análisis vive en `src/lib/stats.ts` y replica la hoja "Análisis" del Google Sheet original: mediana publicada × (1 − descuento) = precio de venta real; menos revisión, informes, preparación, transferencia y margen = precio máximo de compra.
- Toda entrada de publicaciones (formulario, API, importación) pasa por `guardarPublicacion` en `src/lib/listings.ts`.
- Tras cambiar `src/db/schema.ts` correr `npm run db:generate` y commitear la carpeta `drizzle/`.
- Los supuestos de costo son de cada unidad: columnas `sup*` de `listings` (null = valor por defecto). `cuentaUnidad` en `src/lib/stats.ts` hace la cuenta de una publicación; los Supuestos generales son solo los valores de partida de una unidad. La pantalla del modelo muestra solo mercado (mediana, rango, descuento, días): no hace cuenta de compra ni lleva supuestos.
- Para dólares el usuario usa MEP o CCL, nunca el oficial.
- Cada modelo tiene variantes (tabla `variants`); la publicación guarda el nombre en `variante`.
- Las publicaciones con `es0km` no entran al análisis de usados: su promedio (última tanda relevada, 7 días) es el "0 km de mercado". El usado se compara contra eso y, si falta, contra la lista oficial de la variante o del modelo.
- La app no busca en la web: el botón "Actualizar 0 km" copia un pedido para Claude, que busca y carga por API.
- Guardadas: columnas `guardada`, `guardadaComentario` y `guardadaFecha` de `listings`. Es la lista de unidades que el usuario marca para volver a mirar (pantalla `/guardadas`); no cambia el análisis.
