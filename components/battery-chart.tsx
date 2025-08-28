"use client"

import { useMemo } from "react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import type { BatterySession } from "@/lib/session-detector"
import { SessionDetector } from "@/lib/session-detector"
import { DateFormatter } from "@/lib/date-utils"

interface ChartDataPoint {
  timestamp: string
  time: string
  percent: number
  mWh?: number
  state: "Active" | "Idle" | "Charging" | "Unknown"
  minutesOffset: number
  drainRate?: number
}

interface BatteryChartProps {
  session: BatterySession
  showEnergyData?: boolean
}

export function BatteryChart({ session, showEnergyData = false }: BatteryChartProps) {
  const chartData = useMemo(() => {
    const data: ChartDataPoint[] = []

    for (let i = 0; i < session.events.length; i++) {
      const event = session.events[i]
      const nextEvent = session.events[i + 1]

      // Calculate drain rate for this segment
      let drainRate: number | undefined
      if (nextEvent) {
        const deltaMinutes = nextEvent.minutesOffset - event.minutesOffset
        const drainPct = Math.max(0, event.percent - nextEvent.percent)
        drainRate = deltaMinutes > 0 ? drainPct / (deltaMinutes / 60) : 0
      }

      data.push({
        timestamp: event.timestamp,
        time: DateFormatter.formatCompactTime(event.timestamp),
        percent: event.percent,
        mWh: event.mWh,
        state: event.state,
        minutesOffset: event.minutesOffset,
        drainRate,
      })
    }

    return data
  }, [session])

  const getStateColor = (state: string) => {
    switch (state) {
      case "Active":
        return "hsl(var(--chart-1))" // Blue
      case "Idle":
        return "hsl(var(--chart-2))" // Orange
      case "Charging":
        return "hsl(var(--chart-3))" // Green
      default:
        return "hsl(var(--chart-4))" // Red
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataPoint
      const nextPoint = chartData.find((p) => p.minutesOffset > data.minutesOffset)

      return (
        <div className="bg-white/95 border border-border rounded-lg p-3 shadow-lg backdrop-blur-sm">
          <p className="font-medium text-foreground">{DateFormatter.formatTime12Hour(data.timestamp)}</p>
          <p className="text-sm text-muted-foreground mb-2">{DateFormatter.formatDateWithMonthName(data.timestamp)}</p>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Battery:</span>
              <span className="font-medium text-foreground">{data.percent}%</span>
            </div>

            {data.mWh && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Energy:</span>
                <span className="font-medium text-foreground">{SessionDetector.formatEnergy(data.mWh)}</span>
              </div>
            )}

            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">State:</span>
              <span
                className="font-medium px-2 py-1 rounded text-xs text-white"
                style={{
                  backgroundColor: getStateColor(data.state),
                }}
              >
                {data.state}
              </span>
            </div>

            {data.drainRate !== undefined && data.drainRate > 0 && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Drain Rate:</span>
                <span className="font-medium text-foreground">{SessionDetector.formatRate(data.drainRate)}</span>
              </div>
            )}

            {nextPoint && (
              <div className="pt-2 border-t border-border text-xs text-muted-foreground">
                <p>
                  Next: {nextPoint.time} ({nextPoint.percent}%)
                </p>
                <p>Duration: {SessionDetector.formatDuration(nextPoint.minutesOffset - data.minutesOffset)}</p>
              </div>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props
    if (!payload) return null

    return (
      <circle
        cx={cx}
        cy={cy}
        r={3}
        fill={getStateColor(payload.state)}
        stroke="hsl(var(--background))"
        strokeWidth={2}
      />
    )
  }

  const segments = useMemo(() => {
    const segs: Array<{ start: number; end: number; state: string }> = []
    let currentState = chartData[0]?.state
    let segmentStart = 0

    for (let i = 1; i < chartData.length; i++) {
      if (chartData[i].state !== currentState) {
        segs.push({
          start: segmentStart,
          end: i - 1,
          state: currentState || "Unknown",
        })
        segmentStart = i
        currentState = chartData[i].state
      }
    }

    // Add final segment
    if (segmentStart < chartData.length) {
      segs.push({
        start: segmentStart,
        end: chartData.length - 1,
        state: currentState || "Unknown",
      })
    }

    return segs
  }, [chartData])

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        <p>No data available for this session</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="h-80 relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <defs>
              <linearGradient id="batteryGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.6} />
                <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={true} />
            <XAxis
              dataKey="time"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              angle={0}
              textAnchor="middle"
              height={40}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} />

            <Area
              type="monotone"
              dataKey="percent"
              stroke="hsl(var(--chart-1))"
              strokeWidth={3}
              fill="url(#batteryGradient)"
              dot={false}
            />

            <ReferenceLine y={20} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" strokeOpacity={0.4} />
            <ReferenceLine y={50} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" strokeOpacity={0.3} />
            <ReferenceLine y={80} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" strokeOpacity={0.4} />
          </AreaChart>
        </ResponsiveContainer>

        <div className="absolute bottom-2 left-6 text-sm text-muted-foreground">
          {SessionDetector.formatDuration(session.durationMin)} ago
        </div>
        <div className="absolute bottom-2 right-6 text-sm text-muted-foreground">
          {session.endPct < 20 ? `${session.endPct}% left` : "now"}
        </div>
      </div>

      {/* Energy Chart (if available) */}
      {showEnergyData && chartData.some((d) => d.mWh) && (
        <div className="h-64">
          <h4 className="text-sm font-medium mb-2 text-foreground">Energy Usage (mWh)</h4>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-5))" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="hsl(var(--chart-5))" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="time"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                axisLine={false}
                tickLine={false}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                }}
                formatter={(value: any) => [SessionDetector.formatEnergy(value), "Energy"]}
                labelFormatter={(label) => `Time: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="mWh"
                stroke="hsl(var(--chart-5))"
                strokeWidth={2}
                fill="url(#energyGradient)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
