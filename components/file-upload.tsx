"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Upload, FileText, AlertCircle, CheckCircle, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { BatteryLogParser, type ParsedBatteryData } from "@/lib/battery-parser"

interface FileUploadProps {
  onDataParsed?: (data: ParsedBatteryData) => void
  onAnalyzeClick?: () => void
}

export function FileUpload({ onDataParsed, onAnalyzeClick }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [textInput, setTextInput] = useState("")
  const [error, setError] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [parseResult, setParseResult] = useState<ParsedBatteryData | null>(null)

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        // 10MB limit
        setError("File size must be less than 10MB")
        return
      }
      setFile(selectedFile)
      setError("")
    }
  }, [])

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    const droppedFile = event.dataTransfer.files[0]
    if (droppedFile) {
      if (droppedFile.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB")
        return
      }
      setFile(droppedFile)
      setError("")
    }
  }, [])

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
  }, [])

  const processData = async () => {
    setIsProcessing(true)
    setError("")
    setParseResult(null)

    try {
      let parsedData: ParsedBatteryData

      if (file) {
        parsedData = await BatteryLogParser.parseFile(file)
      } else if (textInput.trim()) {
        parsedData = BatteryLogParser.parseText(textInput)
      } else {
        throw new Error("No data to process")
      }

      const validation = BatteryLogParser.validateData(parsedData)

      if (!validation.isValid) {
        setError(`Data validation failed: ${validation.issues.join(", ")}`)
        return
      }

      if (parsedData.errors.length > 0) {
        console.warn("Parse warnings:", parsedData.errors)
      }

      setParseResult(parsedData)
      onDataParsed?.(parsedData)

      setTimeout(() => {
        onAnalyzeClick?.()
        const statsElement = document.getElementById("battery-stats")
        if (statsElement) {
          statsElement.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      }, 500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process battery data. Please check the format.")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto border-border/50 shadow-lg">
      <CardHeader className="text-center pb-6">
        <CardTitle className="flex items-center justify-center gap-3 text-2xl">
          <div className="p-2 rounded-full bg-primary/10">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          Upload Battery Report
        </CardTitle>
        <CardDescription className="text-base max-w-2xl mx-auto">
          Upload a battery-report.html file or paste raw battery log data to begin comprehensive analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div
          className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary/50 transition-all duration-200 bg-muted/30 hover:bg-muted/50"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-6">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-4">
            <p className="text-muted-foreground">Drag and drop your battery-report.html file here, or</p>
            <label htmlFor="file-upload">
              <Button
                variant="outline"
                size="lg"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors bg-transparent"
              >
                Choose File
              </Button>
              <input
                id="file-upload"
                type="file"
                accept=".html,.txt,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
          {file && (
            <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="font-medium text-primary">Selected: {file.name}</p>
              <p className="text-sm text-muted-foreground mt-1">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <label className="text-sm font-medium">Or paste raw battery log data:</label>
          <Textarea
            placeholder="Paste your battery log data here...&#10;Example:&#10;23:27:06	Active	Battery	100 %	69,993 mWh&#10;23:46:19	Connected standby	Battery	96 %	67,186 mWh"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            className="min-h-32 font-mono text-sm resize-none"
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {parseResult && (
          <Alert className="border-primary/20 bg-primary/5">
            <CheckCircle className="h-4 w-4 text-primary" />
            <AlertDescription className="text-foreground">
              Successfully parsed {parseResult.metadata.totalEvents} battery events
              {parseResult.metadata.hasEnergyData && " with energy data"}
              {parseResult.errors.length > 0 && ` (${parseResult.errors.length} warnings)`}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-center pt-4">
          <Button
            onClick={processData}
            disabled={(!file && !textInput.trim()) || isProcessing}
            size="lg"
            className="px-12 py-3 text-base font-medium bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent mr-2" />
                Processing...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4 mr-2" />
                Analyze Battery Stats
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
