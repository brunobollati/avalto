import crypto from "node:crypto";

export const SESSION_COOKIE = "avalto_session";
const MAX_AGE_S = 60 * 60 * 24 * 30;

const isProd = process.env.NODE_ENV === "production";

export function appPassword(): string | null {
  if (process.env.APP_PASSWORD) return process.env.APP_PASSWORD;
  return isProd ? null : "avalto";
}

function secret(): string {
  return process.env.SESSION_SECRET || `avalto:${appPassword() ?? "sin-clave"}`;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function checkPassword(input: string): boolean {
  const pw = appPassword();
  return !!pw && safeEqual(input, pw);
}

export function newSessionValue(): { value: string; maxAge: number } {
  const exp = String(Math.floor(Date.now() / 1000) + MAX_AGE_S);
  return { value: `${exp}.${sign(exp)}`, maxAge: MAX_AGE_S };
}

export function validSession(value: string | undefined): boolean {
  if (!value) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig || !safeEqual(sig, sign(exp))) return false;
  return Number(exp) > Date.now() / 1000;
}

export function validApiToken(header: string | null): boolean {
  const token = process.env.API_TOKEN;
  if (!token || !header?.startsWith("Bearer ")) return false;
  return safeEqual(header.slice(7).trim(), token);
}
