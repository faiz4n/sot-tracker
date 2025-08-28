"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Download, FileText, FileSpreadsheet, Printer } from "lucide-react"
import type { SessionAnalysis, BatterySession } from "@/lib/session-detector"
import type { ParsedBatteryData } from "@/lib/battery-parser"
import { ExportUtils } from "@/lib/export-utils"

interface ExportControlsProps {
  analysis: SessionAnalysis | null
  selectedSession: BatterySession | null
  originalData: ParsedBatteryData | null
}

export function ExportControls({ analysis, selectedSession, originalData }: ExportControlsProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (type: "session-csv" | "session-json" | "analysis-csv" | "session-pdf") => {
    if (!analysis || !originalData) return

    setIsExporting(true)

    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-")

      switch (type) {
        case "session-csv":
          if (selectedSession) {
            const csvContent = ExportUtils.generateSessionCSV(selectedSession)
            ExportUtils.downloadFile(
              csvContent,
              `battery-session-${selectedSession.sessionId}-${timestamp}.csv`,
              "text/csv",
            )
          }
          break

        case "session-json":
          if (selectedSession) {
            const jsonContent = ExportUtils.generateSessionJSON(selectedSession)
            ExportUtils.downloadFile(
              jsonContent,
              `battery-session-${selectedSession.sessionId}-${timestamp}.json`,
              "application/json",
            )
          }
          break

        case "analysis-csv":
          const analysisContent = ExportUtils.generateAnalysisCSV(analysis, originalData)
          ExportUtils.downloadFile(analysisContent, `battery-analysis-${timestamp}.csv`, "text/csv")
          break

        case "session-pdf":
          if (selectedSession) {
            ExportUtils.printPDF(selectedSession, analysis)
          }
          break
      }
    } catch (error) {
      console.error("Export failed:", error)
    } finally {
      setIsExporting(false)
    }
  }

  if (!analysis) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Data
        </CardTitle>
        <CardDescription>
          Export battery analysis data in various formats for further analysis or reporting
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {/* Session-specific exports */}
          {selectedSession && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isExporting}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export Session {selectedSession.sessionId}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport("session-csv")}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Session CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("session-json")}>
                  <FileText className="h-4 w-4 mr-2" />
                  Session JSON
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport("session-pdf")}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print/PDF Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Full analysis export */}
          <Button variant="outline" onClick={() => handleExport("analysis-csv")} disabled={isExporting}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Full Analysis
          </Button>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          <p>
            <strong>Session CSV/JSON:</strong> Detailed event log for the selected session
          </p>
          <p>
            <strong>Full Analysis:</strong> Complete analysis with all sessions and summary data
          </p>
          <p>
            <strong>PDF Report:</strong> Formatted report with key metrics and insights
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
