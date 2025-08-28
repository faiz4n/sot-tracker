import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"

export const metadata: Metadata = {
  title: "Battery Analytics",
  description: "Advanced battery usage analysis and session tracking",
  generator: "v0.app",
}

const geistSans = GeistSans.variable
const geistMono = GeistMono.variable

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${geistSans} ${geistMono} antialiased`}>
      <body>{children}</body>
    </html>
  )
}
