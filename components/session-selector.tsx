"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Battery, Clock, Zap } from "lucide-react"
import type { SessionAnalysis, BatterySession } from "@/lib/session-detector"
import { SessionDetector } from "@/lib/session-detector"
import { DateFormatter } from "@/lib/date-utils"

interface SessionSelectorProps {
  analysis: SessionAnalysis | null
  selectedSession: BatterySession | null
  onSessionSelect: (session: BatterySession | null) => void
  onThresholdChange?: (threshold: number) => void
}

export function SessionSelector({
  analysis,
  selectedSession,
  onSessionSelect,
  onThresholdChange,
}: SessionSelectorProps) {
  const [threshold, setThreshold] = useState(analysis?.settings.fullChargeThreshold || 98)

  const handleThresholdChange = (value: number[]) => {
    const newThreshold = value[0]
    setThreshold(newThreshold)
    onThresholdChange?.(newThreshold)
  }

  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Battery Sessions</CardTitle>
          <CardDescription>Session analysis will appear here after processing battery data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Battery className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No battery data loaded</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Threshold Control */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Full Charge Detection</CardTitle>
          <CardDescription>Adjust the battery percentage threshold for detecting full charge events</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Threshold: {threshold}%</span>
              <Badge variant="outline">{analysis.fullChargeEvents.length} full charges found</Badge>
            </div>
            <Slider
              value={[threshold]}
              onValueChange={handleThresholdChange}
              min={90}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Session List */}
      <Card>
        <CardHeader>
          <CardTitle>Battery Sessions ({analysis.sessions.length})</CardTitle>
          <CardDescription>Select a session to analyze detailed battery usage patterns</CardDescription>
        </CardHeader>
        <CardContent>
          {analysis.sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Battery className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No battery sessions detected. Try adjusting the full charge threshold.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {analysis.sessions.map((session) => (
                <div
                  key={session.sessionId}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedSession?.sessionId === session.sessionId
                      ? "border-secondary bg-secondary/10"
                      : "border-border hover:border-secondary/50"
                  }`}
                  onClick={() => onSessionSelect(session)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">Session {session.sessionId}</h4>
                      <p className="text-sm text-muted-foreground">
                        {DateFormatter.formatDateWithMonthName(session.startTime)} •{" "}
                        {SessionDetector.formatDuration(session.durationMin)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {session.startPct}% → {session.endPct}%
                      </p>
                      <p className="text-xs text-muted-foreground">-{session.usedPct}%</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span>SOT: {SessionDetector.formatDuration(session.activeMinutes)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3 text-muted-foreground" />
                      <span>Active: {SessionDetector.formatRate(session.activeRate_pct_per_hr)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Battery className="h-3 w-3 text-muted-foreground" />
                      <span>Idle: {SessionDetector.formatRate(session.idleRate_pct_per_hr)}</span>
                    </div>
                  </div>

                  {!session.isComplete && (
                    <Badge variant="secondary" className="mt-2">
                      Incomplete Session
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {analysis.summary.totalSessions > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Session Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{analysis.summary.totalSessions}</p>
                <p className="text-sm text-muted-foreground">Complete Sessions</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{SessionDetector.formatDuration(analysis.summary.avgScreenOnTime)}</p>
                <p className="text-sm text-muted-foreground">Avg Screen Time</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{SessionDetector.formatRate(analysis.summary.avgActiveDrain)}</p>
                <p className="text-sm text-muted-foreground">Avg Active Drain</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{SessionDetector.formatRate(analysis.summary.avgIdleDrain)}</p>
                <p className="text-sm text-muted-foreground">Avg Idle Drain</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
