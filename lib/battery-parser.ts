export interface BatteryEvent {
  timestamp: string
  minutesOffset: number
  state: "Active" | "Idle" | "Charging" | "Unknown"
  percent: number
  mWh?: number
  rawState: string
}

export interface ParsedBatteryData {
  events: BatteryEvent[]
  startDate?: Date
  errors: string[]
  metadata: {
    totalEvents: number
    hasEnergyData: boolean
    timeRange: {
      start: string
      end: string
    }
  }
}

export class BatteryLogParser {
  private static readonly PERCENT_REGEX = /(\d{1,3})\s*%/
  private static readonly MWH_REGEX = /([\d,]+)\s*mWh/
  private static readonly TIMESTAMP_REGEX = /^(?:(\d{4}-\d{2}-\d{2})\s*)?(\d{1,2}:\d{2}:\d{2})/

  static async parseFile(file: File): Promise<ParsedBatteryData> {
    const text = await file.text()
    return this.parseText(text)
  }

  static parseText(text: string): ParsedBatteryData {
    console.log("[v0] Input text length:", text.length)

    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    console.log("[v0] Total lines after filtering:", lines.length)
    console.log("[v0] Sample lines:", lines.slice(0, 5))

    let firstFullDate: string | undefined
    for (const line of lines) {
      const timestampMatch = line.match(this.TIMESTAMP_REGEX)
      if (timestampMatch && timestampMatch[1]) {
        firstFullDate = timestampMatch[1]
        break
      }
    }

    // Calculate previous day if we found a full date
    let previousDay: string | undefined
    if (firstFullDate) {
      const firstDate = new Date(firstFullDate)
      firstDate.setDate(firstDate.getDate() - 1)
      const year = firstDate.getFullYear()
      const month = String(firstDate.getMonth() + 1).padStart(2, "0")
      const day = String(firstDate.getDate()).padStart(2, "0")
      previousDay = `${year}-${month}-${day}`
      console.log("[v0] Calculated previous day:", previousDay)
    }

    const events: BatteryEvent[] = []
    const errors: string[] = []
    let startDate: Date | undefined
    let lastSeenDate: string | undefined

    for (let i = 0; i < lines.length; i++) {
      console.log("[v0] Parsing line:", lines[i])
      try {
        const result = this.parseLine(lines[i], lastSeenDate, previousDay)
        if (result) {
          const { event, updatedDate } = result
          if (updatedDate) {
            lastSeenDate = updatedDate
            console.log("[v0] Updated last seen date to:", lastSeenDate)
          }

          const testDate = new Date(event.timestamp)
          if (isNaN(testDate.getTime())) {
            console.log("[v0] Invalid timestamp, skipping:", event.timestamp)
            errors.push(`Line ${i + 1}: Invalid timestamp: ${event.timestamp}`)
            continue
          }

          // Set start date from first valid event
          if (!startDate) {
            startDate = testDate
          }
          events.push(event)
          console.log("[v0] Successfully parsed event:", event)
        } else {
          console.log("[v0] Could not parse line", i + 1, ":", lines[i])
        }
      } catch (error) {
        console.log("[v0] Error parsing line", i + 1, ":", error)
        errors.push(`Line ${i + 1}: ${error instanceof Error ? error.message : "Parse error"}`)
      }
    }

    console.log("[v0] Total events parsed:", events.length)
    console.log("[v0] Total errors:", errors.length)

    // Calculate minutes offset for each event
    if (events.length > 0) {
      const firstTimestamp = new Date(events[0].timestamp)
      events.forEach((event) => {
        const eventTime = new Date(event.timestamp)
        event.minutesOffset = Math.round((eventTime.getTime() - firstTimestamp.getTime()) / (1000 * 60))
      })
    }

    // Sort events by timestamp
    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    return {
      events,
      startDate,
      errors,
      metadata: {
        totalEvents: events.length,
        hasEnergyData: events.some((e) => e.mWh !== undefined),
        timeRange: {
          start: events[0]?.timestamp || "",
          end: events[events.length - 1]?.timestamp || "",
        },
      },
    }
  }

  private static parseLine(
    line: string,
    lastSeenDate?: string,
    previousDay?: string,
  ): { event: BatteryEvent; updatedDate?: string } | null {
    // Skip HTML tags and non-data lines
    if (line.includes("<") || line.includes("Report generated") || line.length < 10) {
      console.log("[v0] Skipping non-data line")
      return null
    }

    // Split by tabs or multiple spaces
    const parts = line.split(/\t+|\s{2,}/).filter((part) => part.trim().length > 0)

    console.log("[v0] Split parts:", parts)

    if (parts.length < 3) {
      console.log("[v0] Not enough parts, skipping")
      return null
    }

    // Extract timestamp
    const timestampMatch = parts[0].match(this.TIMESTAMP_REGEX)
    console.log("[v0] Timestamp match:", timestampMatch)

    if (!timestampMatch) {
      console.log("[v0] No timestamp match, skipping")
      return null
    }

    const [, dateStr, timeStr] = timestampMatch
    let timestamp: string
    let updatedDate: string | undefined

    if (dateStr) {
      timestamp = `${dateStr} ${timeStr}`
      updatedDate = dateStr
      console.log("[v0] Full date found:", timestamp)
    } else if (lastSeenDate) {
      timestamp = `${lastSeenDate} ${timeStr}`
      console.log("[v0] Using last seen date:", timestamp)
    } else if (previousDay) {
      timestamp = `${previousDay} ${timeStr}`
      console.log("[v0] Using previous day for time-only row:", timestamp)
    } else {
      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, "0")
      const day = String(today.getDate()).padStart(2, "0")
      const defaultDate = `${year}-${month}-${day}`
      timestamp = `${defaultDate} ${timeStr}`
      updatedDate = defaultDate
      console.log("[v0] Using default date:", timestamp)
    }

    // Extract state
    const rawState = parts[1] || "Unknown"
    const state = this.normalizeState(rawState)

    // Extract battery percentage
    const percentMatch = line.match(this.PERCENT_REGEX)
    if (!percentMatch) {
      console.log("[v0] No percentage match found")
      return null
    }
    const percent = Number.parseInt(percentMatch[1], 10)

    // Extract mWh if present
    const mWhMatch = line.match(this.MWH_REGEX)
    const mWh = mWhMatch ? Number.parseInt(mWhMatch[1].replace(/,/g, ""), 10) : undefined

    console.log("[v0] Parsed values - percent:", percent, "mWh:", mWh, "state:", state)

    return {
      event: {
        timestamp,
        minutesOffset: 0, // Will be calculated later
        state,
        percent,
        mWh,
        rawState,
      },
      updatedDate,
    }
  }

  private static normalizeState(rawState: string): "Active" | "Idle" | "Charging" | "Unknown" {
    const state = rawState.toLowerCase()

    if (state.includes("active")) {
      return "Active"
    }
    if (state.includes("standby") || state.includes("suspended") || state.includes("sleep")) {
      return "Idle"
    }
    if (state.includes("charging") || state.includes("plugged") || state.includes("ac")) {
      return "Charging"
    }

    return "Unknown"
  }

  static validateData(data: ParsedBatteryData): {
    isValid: boolean
    issues: string[]
  } {
    const issues: string[] = []

    console.log("[v0] Validating data - events count:", data.events.length)
    console.log("[v0] Sample events:", data.events.slice(0, 3))

    if (data.events.length === 0) {
      issues.push("No valid battery events found")
    }

    if (data.events.length < 5) {
      issues.push("Very few events found - results may not be meaningful")
    }

    const percentValues = data.events.map((e) => e.percent)
    const minPercent = Math.min(...percentValues)
    const maxPercent = Math.max(...percentValues)

    if (minPercent < 0 || maxPercent > 100) {
      issues.push("Invalid battery percentage values detected")
    }

    // Check for reasonable time progression
    const timestamps = data.events.map((e) => new Date(e.timestamp).getTime())
    const hasValidProgression = timestamps.every((time, i) => i === 0 || time >= timestamps[i - 1])

    if (!hasValidProgression) {
      issues.push("Timestamps are not in chronological order")
    }

    console.log("[v0] Validation result - isValid:", issues.length === 0, "issues:", issues)

    return {
      isValid: issues.length === 0,
      issues,
    }
  }
}
