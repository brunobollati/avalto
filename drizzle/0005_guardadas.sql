ALTER TABLE "listings" ADD COLUMN "guardada" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "guardada_comentario" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "guardada_fecha" timestamp;