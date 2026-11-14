CREATE TABLE "variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_id" integer NOT NULL,
	"nombre" text NOT NULL,
	"lista_0km" bigint,
	"lista_0km_fecha" date,
	"lista_0km_fuente" text
);
--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "variante" text;--> statement-breakpoint
ALTER TABLE "variants" ADD CONSTRAINT "variants_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "variants_model_nombre_idx" ON "variants" USING btree ("model_id","nombre");