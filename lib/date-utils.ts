export class DateFormatter {
  /**
   * Format date with month name instead of number
   * Example: "August 26, 2025"
   */
  static formatDateWithMonthName(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  /**
   * Format time in 12-hour format
   * Example: "2:35 PM"
   */
  static formatTime12Hour(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  /**
   * Format full datetime with month name and 12-hour time
   * Example: "August 26, 2025 at 2:35 PM"
   */
  static formatDateTime(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date
    return `${this.formatDateWithMonthName(d)} at ${this.formatTime12Hour(d)}`
  }

  /**
   * Format date range with month names
   * Example: "August 25 to August 26, 2025"
   */
  static formatDateRange(startDate: Date | string, endDate: Date | string): string {
    const start = typeof startDate === "string" ? new Date(startDate) : startDate
    const end = typeof endDate === "string" ? new Date(endDate) : endDate

    const startFormatted = start.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    })

    const endFormatted = end.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    // If same year and month, show "August 25 to 26, 2025"
    if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
      return `${startFormatted} to ${end.getDate()}, ${end.getFullYear()}`
    }

    // Otherwise show full dates
    return `${startFormatted} to ${endFormatted}`
  }

  /**
   * Format compact time for chart labels
   * Example: "2:35 PM"
   */
  static formatCompactTime(date: Date | string): string {
    return this.formatTime12Hour(date)
  }
}
