import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Calculateur de Thème Astral',
  description: 'Outil de calcul de thème astral précis et fiable',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
