import type { SessionAnalysis, BatterySession } from "./session-detector"
import type { ParsedBatteryData } from "./battery-parser"
import { SessionDetector } from "./session-detector"

export class ExportUtils {
  // Generate CSV data for a single session
  static generateSessionCSV(session: BatterySession): string {
    const headers = ["Timestamp", "Minutes Offset", "State", "Battery Percent", "Energy (mWh)", "Raw State"]

    const rows = session.events.map((event) => [
      event.timestamp,
      event.minutesOffset.toString(),
      event.state,
      event.percent.toString(),
      event.mWh?.toString() || "",
      event.rawState,
    ])

    const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n")

    return csvContent
  }

  // Generate comprehensive analysis CSV
  static generateAnalysisCSV(analysis: SessionAnalysis, originalData: ParsedBatteryData): string {
    const sections: string[] = []

    // Analysis Summary
    sections.push("=== BATTERY ANALYSIS SUMMARY ===")
    sections.push(`Generated,${new Date().toISOString()}`)
    sections.push(`Full Charge Threshold,${analysis.settings.fullChargeThreshold}%`)
    sections.push(`Total Sessions,${analysis.summary.totalSessions}`)
    sections.push(`Average Screen Time,${SessionDetector.formatDuration(analysis.summary.avgScreenOnTime)}`)
    sections.push(`Average Active Drain,${SessionDetector.formatRate(analysis.summary.avgActiveDrain)}`)
    sections.push(`Average Idle Drain,${SessionDetector.formatRate(analysis.summary.avgIdleDrain)}`)
    sections.push("")

    // Session Summary Table
    sections.push("=== SESSION SUMMARY ===")
    const sessionHeaders = [
      "Session ID",
      "Start Time",
      "End Time",
      "Duration (min)",
      "Start %",
      "End %",
      "Used %",
      "Screen Time (min)",
      "Active Drain (%/hr)",
      "Idle Drain (%/hr)",
      "Energy Used (mWh)",
      "Complete",
    ]
    sections.push(sessionHeaders.join(","))

    analysis.sessions.forEach((session) => {
      const row = [
        session.sessionId.toString(),
        session.startTime,
        session.endTime,
        session.durationMin.toString(),
        session.startPct.toString(),
        session.endPct.toString(),
        session.usedPct.toString(),
        session.activeMinutes.toString(),
        session.activeRate_pct_per_hr.toFixed(2),
        session.idleRate_pct_per_hr.toFixed(2),
        session.usedmWh?.toString() || "",
        session.isComplete.toString(),
      ]
      sections.push(row.map((cell) => `"${cell}"`).join(","))
    })

    sections.push("")

    // Detailed Event Log
    sections.push("=== DETAILED EVENT LOG ===")
    const eventHeaders = [
      "Session ID",
      "Timestamp",
      "Minutes Offset",
      "State",
      "Battery %",
      "Energy (mWh)",
      "Raw State",
    ]
    sections.push(eventHeaders.join(","))

    analysis.sessions.forEach((session) => {
      session.events.forEach((event) => {
        const row = [
          session.sessionId.toString(),
          event.timestamp,
          event.minutesOffset.toString(),
          event.state,
          event.percent.toString(),
          event.mWh?.toString() || "",
          event.rawState,
        ]
        sections.push(row.map((cell) => `"${cell}"`).join(","))
      })
    })

    return sections.join("\n")
  }

  // Generate session report as JSON
  static generateSessionJSON(session: BatterySession): string {
    const report = {
      sessionId: session.sessionId,
      startTime: session.startTime,
      endTime: session.endTime,
      startPct: session.startPct,
      endPct: session.endPct,
      usedPct: session.usedPct,
      startmWh: session.startmWh,
      endmWh: session.endmWh,
      usedmWh: session.usedmWh,
      durationMin: session.durationMin,
      activeMinutes: session.activeMinutes,
      idleMinutes: session.idleMinutes,
      chargingMinutes: session.chargingMinutes,
      activeDrainPct: session.activeDrainPct,
      idleDrainPct: session.idleDrainPct,
      activeRate_pct_per_hr: session.activeRate_pct_per_hr,
      idleRate_pct_per_hr: session.idleRate_pct_per_hr,
      activeRate_mWh_per_hr: session.activeRate_mWh_per_hr,
      idleRate_mWh_per_hr: session.idleRate_mWh_per_hr,
      isComplete: session.isComplete,
      events: session.events.map((event) => ({
        minutesOffset: event.minutesOffset,
        timestamp: event.timestamp,
        state: event.state,
        percent: event.percent,
        mWh: event.mWh,
      })),
    }

    return JSON.stringify(report, null, 2)
  }

  // Download file utility
  static downloadFile(content: string, filename: string, mimeType = "text/plain") {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Generate PDF report content (HTML that can be printed to PDF)
  static generatePDFContent(session: BatterySession, analysis: SessionAnalysis): string {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Battery Analysis Report - Session ${session.sessionId}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .metric-card {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
        }
        .metric-value {
            font-size: 24px;
            font-weight: bold;
            color: #1f2937;
        }
        .metric-label {
            font-size: 12px;
            color: #6b7280;
            margin-top: 5px;
        }
        .section {
            margin: 30px 0;
        }
        .section-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 15px;
            color: #1f2937;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        th, td {
            border: 1px solid #e5e7eb;
            padding: 8px 12px;
            text-align: left;
        }
        th {
            background-color: #f9fafb;
            font-weight: 600;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
        }
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Battery Analysis Report</h1>
        <h2>Session ${session.sessionId}</h2>
        <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
    </div>

    <div class="section">
        <div class="section-title">Session Overview</div>
        <p><strong>Time Period:</strong> ${new Date(session.startTime).toLocaleString()} to ${new Date(session.endTime).toLocaleString()}</p>
        <p><strong>Duration:</strong> ${SessionDetector.formatDuration(session.durationMin)}</p>
        <p><strong>Battery Usage:</strong> ${session.startPct}% → ${session.endPct}% (${session.usedPct}% used)</p>
        ${session.usedmWh ? `<p><strong>Energy Used:</strong> ${SessionDetector.formatEnergy(session.usedmWh)}</p>` : ""}
    </div>

    <div class="section">
        <div class="section-title">Key Metrics</div>
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">${SessionDetector.formatDuration(session.activeMinutes)}</div>
                <div class="metric-label">Screen-On Time</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${SessionDetector.formatRate(session.activeRate_pct_per_hr)}</div>
                <div class="metric-label">Active Drain Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${SessionDetector.formatRate(session.idleRate_pct_per_hr)}</div>
                <div class="metric-label">Idle Drain Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${SessionDetector.formatDuration(session.idleMinutes)}</div>
                <div class="metric-label">Idle Time</div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Time Breakdown</div>
        <table>
            <tr>
                <th>State</th>
                <th>Duration</th>
                <th>Percentage of Session</th>
            </tr>
            <tr>
                <td>Active (Screen On)</td>
                <td>${SessionDetector.formatDuration(session.activeMinutes)}</td>
                <td>${((session.activeMinutes / session.durationMin) * 100).toFixed(1)}%</td>
            </tr>
            <tr>
                <td>Idle (Screen Off)</td>
                <td>${SessionDetector.formatDuration(session.idleMinutes)}</td>
                <td>${((session.idleMinutes / session.durationMin) * 100).toFixed(1)}%</td>
            </tr>
            ${
              session.chargingMinutes > 0
                ? `
            <tr>
                <td>Charging</td>
                <td>${SessionDetector.formatDuration(session.chargingMinutes)}</td>
                <td>${((session.chargingMinutes / session.durationMin) * 100).toFixed(1)}%</td>
            </tr>
            `
                : ""
            }
        </table>
    </div>

    <div class="section">
        <div class="section-title">Analysis Summary</div>
        <p>This session shows ${session.isComplete ? "complete" : "incomplete"} battery usage data.</p>
        <p>The device was actively used for ${SessionDetector.formatDuration(session.activeMinutes)} out of ${SessionDetector.formatDuration(session.durationMin)} total session time.</p>
        <p>Active drain rate of ${SessionDetector.formatRate(session.activeRate_pct_per_hr)} indicates ${session.activeRate_pct_per_hr > 15 ? "high" : session.activeRate_pct_per_hr > 8 ? "moderate" : "low"} power consumption during active use.</p>
        <p>Idle drain rate of ${SessionDetector.formatRate(session.idleRate_pct_per_hr)} is ${session.idleRate_pct_per_hr > 2 ? "higher than optimal" : session.idleRate_pct_per_hr > 1 ? "acceptable" : "excellent"}.</p>
    </div>

    <div class="footer">
        <p>Generated by Battery Analytics Tool • Full Charge Threshold: ${analysis.settings.fullChargeThreshold}%</p>
    </div>
</body>
</html>
    `
    return html
  }

  // Print PDF (opens print dialog)
  static printPDF(session: BatterySession, analysis: SessionAnalysis) {
    const htmlContent = this.generatePDFContent(session, analysis)
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
  }
}
