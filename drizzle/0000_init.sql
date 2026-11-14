CREATE TABLE "listings" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_id" integer NOT NULL,
	"plataforma" text DEFAULT 'Otra' NOT NULL,
	"link" text,
	"titulo" text,
	"fecha_relevamiento" date NOT NULL,
	"anio" integer,
	"motor" text,
	"version" text,
	"km" integer,
	"zona" text,
	"vendedor" text,
	"moneda" text DEFAULT 'ARS' NOT NULL,
	"precio" bigint NOT NULL,
	"tc_propio" double precision,
	"fecha_publicacion" date,
	"llamada_fecha" date,
	"llamada_precio_min" bigint,
	"llamada_contado" boolean,
	"revision_fecha" date,
	"estado" text DEFAULT 'Activa' NOT NULL,
	"ultimo_precio" bigint,
	"comparable" boolean DEFAULT true NOT NULL,
	"misma_unidad_id" integer,
	"notas" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "models" (
	"id" serial PRIMARY KEY NOT NULL,
	"marca" text NOT NULL,
	"nombre" text NOT NULL,
	"tipo" text DEFAULT 'Furgón' NOT NULL,
	"preparacion_ars" bigint DEFAULT 1000000 NOT NULL,
	"notas" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "listings_link_idx" ON "listings" USING btree ("link");--> statement-breakpoint
CREATE INDEX "listings_model_idx" ON "listings" USING btree ("model_id");