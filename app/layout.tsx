import type { Metadata } from "next"
import { Montserrat, Poppins } from "next/font/google"
import { AppHeader } from "@/components/AppHeader"
import "./globals.css"

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["600", "700"],
})

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["400", "500", "600"],
})

export const metadata: Metadata = {
  title: "Sistema Integral de Acompañamiento Territorial Educativo",
  description: "Relevamiento territorial · Circuito 3",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${montserrat.variable} ${poppins.variable}`}>
        <AppHeader />
        {children}
      </body>
    </html>
  )
}
