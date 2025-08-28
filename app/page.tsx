"use client"

import { useState } from "react"
import { FileUpload } from "@/components/file-upload"
import { Dashboard } from "@/components/dashboard"
import { Header } from "@/components/header"
import type { ParsedBatteryData } from "@/lib/battery-parser"

export default function Home() {
  const [batteryData, setBatteryData] = useState<ParsedBatteryData | null>(null)

  const handleAnalyzeClick = () => {
    // Smooth scroll to stats section
    const statsElement = document.getElementById("battery-stats")
    if (statsElement) {
      statsElement.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="space-y-16">
          <div className="text-center space-y-6 max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground tracking-tight">Battery Analytics</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Upload your Windows battery report to analyze charging sessions, screen-on time, and power consumption
              patterns with detailed insights and beautiful visualizations.
            </p>
          </div>

          <FileUpload onDataParsed={setBatteryData} onAnalyzeClick={handleAnalyzeClick} />

          <div id="battery-stats">
            <Dashboard data={batteryData} />
          </div>
        </div>
      </main>
    </div>
  )
}
