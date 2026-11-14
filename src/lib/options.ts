export const PLATAFORMAS = ["Mercado Libre", "deRuedas", "Facebook Marketplace", "Otra"] as const;
export const MOTORES = ["Nafta", "Diésel", "GNC"] as const;
export const VERSIONES = [
  "Furgón",
  "Mixta",
  "Cabina simple",
  "Cabina extendida",
  "Cabina doble",
  "Otra",
] as const;
export const VENDEDORES = ["Particular", "Agencia"] as const;
export const MONEDAS = ["ARS", "USD"] as const;
export const ESTADOS = ["Activa", "Rebajada", "Bajada"] as const;
export const TIPOS = ["Furgón", "Pick-up", "Otro"] as const;

export function detectarPlataforma(link: string | null | undefined): string {
  const l = (link ?? "").toLowerCase();
  if (l.includes("mercadolibre")) return "Mercado Libre";
  if (l.includes("deruedas")) return "deRuedas";
  if (l.includes("facebook.com") || l.includes("fb.com")) return "Facebook Marketplace";
  return "Otra";
}

export const MARCAS: Record<string, string> = {
  kangoo: "Renault",
  master: "Renault",
  partner: "Peugeot",
  berlingo: "Citroën",
  fiorino: "Fiat",
  strada: "Fiat",
  saveiro: "Volkswagen",
  amarok: "Volkswagen",
  hilux: "Toyota",
  ranger: "Ford",
  s10: "Chevrolet",
  sprinter: "Mercedes-Benz",
};

export const TIPO_POR_MODELO: Record<string, string> = {
  saveiro: "Pick-up",
  amarok: "Pick-up",
  hilux: "Pick-up",
  ranger: "Pick-up",
  s10: "Pick-up",
  strada: "Pick-up",
};
