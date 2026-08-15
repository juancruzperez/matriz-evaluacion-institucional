import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Matriz de Evaluación Institucional",
  description: "Relevamiento territorial · Circuito 3",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>
}
