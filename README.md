# Radar (Avalto): relevamiento de precios

App para cargar publicaciones de utilitarios por modelo (Mercado Libre, deRuedas, Facebook Marketplace) y calcular a cuánto se venden de verdad y cuánto pagar como máximo. Reemplaza la planilla "Relevamiento de precios - utilitarios" y usa su misma lógica.

## Qué hace

- **Modelos:** se agregan a mano; cada uno tiene sus publicaciones y, si se sigue vendiendo nuevo, el precio de lista del 0 km.
- **Publicaciones:** precio, año, motor, versión, km, zona, vendedor, link, llamada (precio mínimo de contado) y seguimiento (rebajada, bajada, último precio). La plataforma se detecta sola por el link.
- **Variantes:** cada modelo tiene variantes (LT, LTZ, Track, Highline). La publicación lleva `variante`; si es nueva se crea sola. Cada variante puede tener su lista oficial 0 km, y el análisis compara usado contra 0 km variante por variante.
- **0 km:** las publicaciones de unidades nuevas se cargan en el mismo modelo con `es0km: true`. No entran en el análisis de usados; su promedio es el "0 km de mercado" contra el que se compara la mediana de los usados (general y por año). Si no hay ninguna, se compara contra la lista oficial.
- **No comparable:** la publicación queda guardada pero no entra en el análisis.
- **Misma unidad:** si un vehículo está publicado en dos plataformas, se marca y cuenta una sola vez en la mediana general (en la tabla por plataforma aparece en las dos).
- **Análisis por modelo:** filtros por motor, versión, año, km, plataforma, vendedor y zona; mediana, rango, días publicada, comparación por plataforma, descuento medido en llamadas, y precio de venta real. El precio máximo de compra no se calcula por modelo: va en cada publicación.
- **Importar planilla:** se pegan las filas copiadas del Google Sheet. Re-importar no duplica: actualiza por link.
- **Publicación:** cada publicación tiene su pantalla (`/publicaciones/:id`) con los datos, el botón para editarla y sus supuestos.
- **Supuestos de la unidad:** preparación, descuento, transferencia, margen, informes, revisión del mecánico y tipo de cambio se cargan en cada publicación, porque cuánto sale arreglarla depende de la unidad. Con eso la pantalla calcula el precio máximo de compra de esa unidad y lo compara con lo que piden.
- **Supuestos por defecto:** los mismos valores a nivel general; son el punto de partida de las unidades que no tienen el suyo cargado.

## Correr en local

```bash
npm install
npm run dev
```

Abre en http://localhost:3000. Contraseña local: `avalto`. Sin `DATABASE_URL` usa una base Postgres embebida (PGlite) guardada en `./data`, no hay que instalar nada.

## Subir a Railway

1. `railway login` y, dentro de esta carpeta, `railway init`.
2. Agregar una base: `railway add --database postgres`.
3. En el servicio de la app, cargar las variables:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
   - `APP_PASSWORD` = la contraseña para entrar
   - `SESSION_SECRET` = un texto largo al azar
   - `API_TOKEN` = otro texto largo al azar (para cargar por API)
4. `railway up` y después `railway domain` para obtener la URL.

Las tablas se crean solas la primera vez que entra un pedido (migraciones en `./drizzle`).

## API (para cargar desde el chat con Claude)

Todas las rutas piden `Authorization: Bearer $API_TOKEN`.

| Método | Ruta | Para qué |
|---|---|---|
| GET | `/api/models` | Lista de modelos con su id |
| POST | `/api/models` | Crear modelo: `{"modelo":"Hilux","marca":"Toyota","tipo":"Pick-up"}` |
| PATCH | `/api/models/:id` | Cambiar datos del modelo, incluido el precio de lista 0 km: `{"variantes":[{"nombre":"Track","lista0km":39479000,"lista0kmFecha":"2026-11-06","lista0kmFuente":"https://..."}]}` |
| GET | `/api/listings?modelId=1` | Publicaciones de un modelo |
| POST | `/api/listings` | Cargar una publicación o una lista |
| PATCH | `/api/listings/:id` | Cambiar campos. Supuestos de la unidad: `supPreparacion`, `supInformes`, `supRevision` (ARS), `supRevisionesPorCompra`, `supDescuento`, `supTransferencia`, `supMargen` (fracción: 0.05 = 5%). `null` vuelve al valor por defecto. Guardadas: `guardada` (true o false) y `guardadaComentario`; mandar solo el comentario también la guarda. Contacto: `contactada` (true la marca con la fecha de hoy, false la desmarca) o `contactadaFecha` |
| DELETE | `/api/listings/:id` | Borrar |

```bash
curl -X POST "$URL/api/listings" -H "Authorization: Bearer $API_TOKEN" -H "content-type: application/json" -d '{
  "modelo": "Kangoo",
  "link": "https://auto.mercadolibre.com.ar/MLA-...",
  "precio": 17500000, "moneda": "ARS",
  "anio": 2018, "motor": "Diésel", "version": "Furgón", "km": 152535,
  "zona": "Mendoza", "vendedor": "Particular",
  "diasPublicada": 19, "titulo": "Kangoo II Express Confort 1.5 dCi",
  "notas": "Único dueño."
}'
```

Campos: `modelo` o `modelId`, `link`, `plataforma`, `variante`, `titulo`, `fechaRelevamiento`, `anio`, `motor` (Nafta, Diésel, GNC), `version` (Furgón, Mixta, Cabina simple, Cabina extendida, Cabina doble, Otra), `km`, `zona`, `vendedor` (Particular, Agencia), `moneda` (ARS, USD), `precio`, `tcPropio`, `diasPublicada` o `fechaPublicacion`, `llamadaFecha`, `llamadaPrecioMin`, `llamadaContado`, `revisionFecha`, `estado` (Activa, Rebajada, Bajada), `ultimoPrecio`, `comparable`, `es0km`, `mismaUnidadId`, `notas`.

Solo `precio` y el modelo son obligatorios. Si el `link` ya existe, se actualiza esa publicación con los campos enviados. Si el modelo no existe, se crea.

## Cómo está armado

- Next.js 16 (App Router) + TypeScript + Tailwind 4.
- Drizzle ORM. Esquema en `src/db/schema.ts`; después de cambiarlo: `npm run db:generate`.
- Cálculo del análisis en `src/lib/stats.ts`; normalización de datos en `src/lib/listings.ts`.
- Login por contraseña única con cookie firmada (`src/lib/auth.ts`, `src/proxy.ts`).
