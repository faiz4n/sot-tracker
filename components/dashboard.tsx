"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Battery, BarChart3 } from "lucide-react"
import type { ParsedBatteryData } from "@/lib/battery-parser"
import type { SessionAnalysis, BatterySession } from "@/lib/session-detector"
import { SessionDetector } from "@/lib/session-detector"
import { SessionSelector } from "@/components/session-selector"
import { BatteryChart } from "@/components/battery-chart"
import { ExportControls } from "@/components/export-controls"
import { DateFormatter } from "@/lib/date-utils"

interface DashboardProps {
  data: ParsedBatteryData | null
}

export function Dashboard({ data }: DashboardProps) {
  const [sessionAnalysis, setSessionAnalysis] = useState<SessionAnalysis | null>(null)
  const [selectedSession, setSelectedSession] = useState<BatterySession | null>(null)
  const [fullChargeThreshold, setFullChargeThreshold] = useState(98)
  const [showEnergyChart, setShowEnergyChart] = useState(false)

  useEffect(() => {
    if (data) {
      const analysis = SessionDetector.detectSessions(data, fullChargeThreshold)
      setSessionAnalysis(analysis)

      const firstCompleteSession = analysis.sessions.find((s) => s.isComplete)
      setSelectedSession(firstCompleteSession || analysis.sessions[0] || null)
    } else {
      setSessionAnalysis(null)
      setSelectedSession(null)
    }
  }, [data, fullChargeThreshold])

  const handleThresholdChange = (threshold: number) => {
    setFullChargeThreshold(threshold)
  }

  const stats = data
    ? {
        totalEvents: data.metadata.totalEvents,
        hasEnergyData: data.metadata.hasEnergyData,
        timeRange: data.metadata.timeRange,
        eventTypes: data.events.reduce(
          (acc, event) => {
            acc[event.state] = (acc[event.state] || 0) + 1
            return acc
          },
          {} as Record<string, number>,
        ),
      }
    : null

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 p-6">
      <SessionSelector
        analysis={sessionAnalysis}
        selectedSession={selectedSession}
        onSessionSelect={setSelectedSession}
        onThresholdChange={handleThresholdChange}
      />

      {selectedSession && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-6xl md:text-7xl font-light text-foreground">
              {SessionDetector.formatDuration(selectedSession.durationMin)}
              <span className="text-4xl md:text-5xl text-muted-foreground ml-2">Used</span>
            </h1>
            <div className="text-lg text-muted-foreground space-y-1">
              <p>Screen on time: {SessionDetector.formatDuration(selectedSession.activeMinutes)}</p>
              <p>Screen off time: {SessionDetector.formatDuration(selectedSession.idleMinutes)}</p>
            </div>
          </div>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <BatteryChart session={selectedSession} showEnergyData={showEnergyChart} />

              <div className="flex items-center justify-start gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-chart-1 rounded-sm"></div>
                  <span className="text-muted-foreground">Battery use</span>
                </div>
                {selectedSession.usedmWh && (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-chart-5 rounded-sm"></div>
                    <span className="text-muted-foreground">Estimated time</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{selectedSession.startPct}%</div>
                <p className="text-sm text-muted-foreground">Start</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{selectedSession.endPct}%</div>
                <p className="text-sm text-muted-foreground">End</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground">
                  {SessionDetector.formatRate(selectedSession.activeRate_pct_per_hr)}
                </div>
                <p className="text-sm text-muted-foreground">Active Drain</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground">
                  {SessionDetector.formatRate(selectedSession.idleRate_pct_per_hr)}
                </div>
                <p className="text-sm text-muted-foreground">Idle Drain</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Export Controls */}
      <ExportControls analysis={sessionAnalysis} selectedSession={selectedSession} originalData={data} />

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Battery Data Overview</CardTitle>
          <CardDescription>Summary of parsed battery events and data quality</CardDescription>
        </CardHeader>
        <CardContent>
          {!data ? (
            <div className="text-center py-8 text-muted-foreground">
              <Battery className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No battery data loaded. Upload a battery report to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Total Events</p>
                <p className="text-2xl font-bold text-foreground">{stats?.totalEvents}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Time Range</p>
                <p className="text-sm text-muted-foreground">
                  {stats?.timeRange.start && stats?.timeRange.end
                    ? DateFormatter.formatDateRange(stats.timeRange.start, stats.timeRange.end)
                    : "No data available"}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Data Quality</p>
                <div className="flex gap-2">
                  <Badge variant={stats?.hasEnergyData ? "default" : "secondary"}>
                    {stats?.hasEnergyData ? "Energy Data Available" : "Percentage Only"}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart Placeholder when no session selected */}
      {!selectedSession && sessionAnalysis && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Battery Usage Chart</CardTitle>
            <CardDescription>Select a session above to view interactive battery usage visualization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-lg">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a battery session to view the chart</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
