import type { BatteryEvent, ParsedBatteryData } from "./battery-parser"

export interface BatterySession {
  sessionId: number
  startTime: string
  endTime: string
  startPct: number
  endPct: number
  usedPct: number
  startmWh?: number
  endmWh?: number
  usedmWh?: number
  durationMin: number
  activeMinutes: number
  idleMinutes: number
  chargingMinutes: number
  activeDrainPct: number
  idleDrainPct: number
  activeRate_pct_per_hr: number
  idleRate_pct_per_hr: number
  activeRate_mWh_per_hr?: number
  idleRate_mWh_per_hr?: number
  events: BatteryEvent[]
  isComplete: boolean
}

export interface SessionAnalysis {
  sessions: BatterySession[]
  fullChargeEvents: number[]
  settings: {
    fullChargeThreshold: number
  }
  summary: {
    totalSessions: number
    avgScreenOnTime: number
    avgActiveDrain: number
    avgIdleDrain: number
  }
}

export class SessionDetector {
  private static readonly DEFAULT_FULL_CHARGE_THRESHOLD = 98

  static detectSessions(
    data: ParsedBatteryData,
    fullChargeThreshold: number = this.DEFAULT_FULL_CHARGE_THRESHOLD,
  ): SessionAnalysis {
    const events = data.events
    if (events.length === 0) {
      return this.createEmptyAnalysis(fullChargeThreshold)
    }

    // Find full-charge events
    const fullChargeEvents = this.findFullChargeEvents(events, fullChargeThreshold)

    // Create sessions based on full-charge boundaries
    const sessions = this.createSessions(events, fullChargeEvents)

    // Calculate detailed metrics for each session
    const analyzedSessions = sessions.map((session, index) => this.analyzeSession(session, index + 1))

    return {
      sessions: analyzedSessions,
      fullChargeEvents,
      settings: { fullChargeThreshold },
      summary: this.calculateSummary(analyzedSessions),
    }
  }

  private static findFullChargeEvents(events: BatteryEvent[], threshold: number): number[] {
    const fullChargeIndices: number[] = []

    for (let i = 0; i < events.length; i++) {
      const event = events[i]
      const prevEvent = i > 0 ? events[i - 1] : null

      // Detect full charge: high percentage OR explicit charging state at high %
      const isFullCharge =
        event.percent >= threshold ||
        (event.state === "Charging" && event.percent >= threshold - 2) ||
        (prevEvent && prevEvent.percent < threshold && event.percent >= threshold)

      if (isFullCharge) {
        // Avoid duplicate consecutive full-charge events
        const lastFullCharge = fullChargeIndices[fullChargeIndices.length - 1]
        if (lastFullCharge === undefined || i - lastFullCharge > 5) {
          fullChargeIndices.push(i)
        }
      }
    }

    return fullChargeIndices
  }

  private static createSessions(events: BatteryEvent[], fullChargeEvents: number[]): BatteryEvent[][] {
    const sessions: BatteryEvent[][] = []

    if (fullChargeEvents.length === 0) {
      // No full charges found - treat entire log as one session
      return [events]
    }

    // Create sessions between full-charge events
    for (let i = 0; i < fullChargeEvents.length; i++) {
      const sessionStart = fullChargeEvents[i]
      const sessionEnd = i < fullChargeEvents.length - 1 ? fullChargeEvents[i + 1] : events.length - 1

      // Find the actual start of discharge (first non-charging event after full charge)
      let dischargeStart = sessionStart
      for (let j = sessionStart; j <= sessionEnd && j < events.length; j++) {
        if (events[j].state !== "Charging") {
          dischargeStart = j
          break
        }
      }

      const sessionEvents = events.slice(dischargeStart, sessionEnd + 1)
      if (sessionEvents.length > 1) {
        sessions.push(sessionEvents)
      }
    }

    return sessions
  }

  private static analyzeSession(events: BatteryEvent[], sessionId: number): BatterySession {
    if (events.length === 0) {
      return this.createEmptySession(sessionId)
    }

    const firstEvent = events[0]
    const lastEvent = events[events.length - 1]

    // Basic session info
    const startTime = firstEvent.timestamp
    const endTime = lastEvent.timestamp
    const startPct = firstEvent.percent
    const endPct = lastEvent.percent
    const usedPct = Math.max(0, startPct - endPct)
    const startmWh = firstEvent.mWh
    const endmWh = lastEvent.mWh
    const usedmWh = startmWh && endmWh ? Math.max(0, startmWh - endmWh) : undefined

    const startDate = new Date(startTime)
    const endDate = new Date(endTime)
    const durationMin = Math.max(0, (endDate.getTime() - startDate.getTime()) / (1000 * 60))

    // State-based time and drain calculations
    let activeMinutes = 0
    let idleMinutes = 0
    let chargingMinutes = 0
    let activeDrainPct = 0
    let idleDrainPct = 0
    let activeDrainmWh = 0
    let idleDrainmWh = 0

    console.log(`[v0] Analyzing session ${sessionId} with ${events.length} events`)

    for (let i = 0; i < events.length - 1; i++) {
      const currentEvent = events[i]
      const nextEvent = events[i + 1]

      const currentDate = new Date(currentEvent.timestamp)
      const nextDate = new Date(nextEvent.timestamp)
      const deltaMinutes = Math.max(0, (nextDate.getTime() - currentDate.getTime()) / (1000 * 60))

      const drainPct = Math.max(0, currentEvent.percent - nextEvent.percent)
      const drainmWh = currentEvent.mWh && nextEvent.mWh ? Math.max(0, currentEvent.mWh - nextEvent.mWh) : 0

      console.log(
        `[v0] Event ${i}: ${currentEvent.timestamp} (${currentEvent.state}) -> ${nextEvent.timestamp}, deltaMinutes: ${deltaMinutes.toFixed(2)}, drainPct: ${drainPct}`,
      )

      // Attribute time and drain to the current event's state
      switch (currentEvent.state) {
        case "Active":
          activeMinutes += deltaMinutes
          activeDrainPct += drainPct
          activeDrainmWh += drainmWh
          break
        case "Idle":
          idleMinutes += deltaMinutes
          idleDrainPct += drainPct
          idleDrainmWh += drainmWh
          break
        case "Charging":
          chargingMinutes += deltaMinutes
          break
      }
    }

    console.log(
      `[v0] Session ${sessionId} totals - Active: ${activeMinutes.toFixed(2)}min, Idle: ${idleMinutes.toFixed(2)}min, Charging: ${chargingMinutes.toFixed(2)}min`,
    )

    // Calculate drain rates
    const activeRate_pct_per_hr = activeMinutes > 0 ? activeDrainPct / (activeMinutes / 60) : 0
    const idleRate_pct_per_hr = idleMinutes > 0 ? idleDrainPct / (idleMinutes / 60) : 0
    const activeRate_mWh_per_hr =
      activeMinutes > 0 && activeDrainmWh > 0 ? activeDrainmWh / (activeMinutes / 60) : undefined
    const idleRate_mWh_per_hr = idleMinutes > 0 && idleDrainmWh > 0 ? idleDrainmWh / (idleMinutes / 60) : undefined

    return {
      sessionId,
      startTime,
      endTime,
      startPct,
      endPct,
      usedPct,
      startmWh,
      endmWh,
      usedmWh,
      durationMin,
      activeMinutes,
      idleMinutes,
      chargingMinutes,
      activeDrainPct,
      idleDrainPct,
      activeRate_pct_per_hr,
      idleRate_pct_per_hr,
      activeRate_mWh_per_hr,
      idleRate_mWh_per_hr,
      events,
      isComplete: endPct < startPct, // Session is complete if battery actually drained
    }
  }

  private static calculateSummary(sessions: BatterySession[]) {
    const completeSessions = sessions.filter((s) => s.isComplete)

    if (completeSessions.length === 0) {
      return {
        totalSessions: 0,
        avgScreenOnTime: 0,
        avgActiveDrain: 0,
        avgIdleDrain: 0,
      }
    }

    const totalActiveMinutes = completeSessions.reduce((sum, s) => sum + s.activeMinutes, 0)
    const totalActiveDrain = completeSessions.reduce((sum, s) => sum + s.activeRate_pct_per_hr, 0)
    const totalIdleDrain = completeSessions.reduce((sum, s) => sum + s.idleRate_pct_per_hr, 0)

    return {
      totalSessions: completeSessions.length,
      avgScreenOnTime: Math.round(totalActiveMinutes / completeSessions.length),
      avgActiveDrain: Number((totalActiveDrain / completeSessions.length).toFixed(2)),
      avgIdleDrain: Number((totalIdleDrain / completeSessions.length).toFixed(2)),
    }
  }

  private static createEmptySession(sessionId: number): BatterySession {
    return {
      sessionId,
      startTime: "",
      endTime: "",
      startPct: 0,
      endPct: 0,
      usedPct: 0,
      durationMin: 0,
      activeMinutes: 0,
      idleMinutes: 0,
      chargingMinutes: 0,
      activeDrainPct: 0,
      idleDrainPct: 0,
      activeRate_pct_per_hr: 0,
      idleRate_pct_per_hr: 0,
      events: [],
      isComplete: false,
    }
  }

  private static createEmptyAnalysis(fullChargeThreshold: number): SessionAnalysis {
    return {
      sessions: [],
      fullChargeEvents: [],
      settings: { fullChargeThreshold },
      summary: {
        totalSessions: 0,
        avgScreenOnTime: 0,
        avgActiveDrain: 0,
        avgIdleDrain: 0,
      },
    }
  }

  // Utility functions for formatting
  static formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  static formatRate(rate: number, unit = "%/hr"): string {
    return `${rate.toFixed(2)}${unit}`
  }

  static formatEnergy(mWh: number): string {
    return `${mWh.toLocaleString()} mWh`
  }
}
