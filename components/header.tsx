import { Battery, BarChart3 } from "lucide-react"
import { ThemeToggle } from "./theme-toggle"

export function Header() {
  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Battery className="h-6 w-6 text-primary" />
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Battery Analytics</h1>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
