import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import "@fontsource-variable/archivo";
import "./globals.css";
import { SESSION_COOKIE, validSession } from "@/lib/auth";
import { logout } from "./actions";

export const metadata: Metadata = {
  title: "Radar · Avalto",
  description: "Publicaciones y análisis de precios de utilitarios",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const logged = validSession((await cookies()).get(SESSION_COOKIE)?.value);
  return (
    <html lang="es">
      <body>
        {logged && (
          <header className="bg-ink text-white">
            <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-8 gap-y-2 px-5 py-3">
              <Link href="/" className="text-[19px] font-extrabold tracking-tight">
                Radar
                <span className="ml-2 text-[13px] font-medium text-white/60">Avalto</span>
              </Link>
              <nav className="flex flex-1 gap-6 text-[14.5px] font-medium">
                <Link href="/" className="hover:underline">Modelos</Link>
                <Link href="/importar" className="hover:underline">Importar planilla</Link>
                <Link href="/supuestos" className="hover:underline">Supuestos</Link>
              </nav>
              <form action={logout}>
                <button className="cursor-pointer text-[14px] text-white/75 hover:text-white">Salir</button>
              </form>
            </div>
          </header>
        )}
        <main className="mx-auto max-w-[1280px] px-5 py-7">{children}</main>
      </body>
    </html>
  );
}
