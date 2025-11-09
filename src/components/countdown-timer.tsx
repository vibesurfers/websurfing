'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, Settings2 } from "lucide-react"

interface CountdownTimerProps {
  intervalMs: number
  onTick: () => void
  label?: string
  treatRobotsAsHumans: boolean
  onToggleRobotMode: () => void
}

export function CountdownTimer({ intervalMs, onTick, label = "Next update", treatRobotsAsHumans, onToggleRobotMode }: CountdownTimerProps) {
  const [seconds, setSeconds] = useState(Math.floor(intervalMs / 1000))
  const [isPaused, setIsPaused] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isPaused) {
      // Clear the interval when paused
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Start the timer when not paused
    intervalRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          // Reset to full interval and trigger callback
          onTick()
          return Math.floor(intervalMs / 1000)
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [intervalMs, onTick, isPaused])

  const togglePause = () => {
    setIsPaused(!isPaused)
    if (isPaused) {
      // When resuming, reset the timer
      setSeconds(Math.floor(intervalMs / 1000))
    }
  }

  return (
    <div className="flex items-center gap-3">
      {/* Timer Display */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-muted-foreground' : 'bg-primary animate-pulse'}`} />
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          {isPaused ? 'Paused' : `${seconds}s`}
        </Badge>
      </div>

      {/* Pause/Play Button */}
      <Button
        variant={isPaused ? "default" : "secondary"}
        size="sm"
        onClick={togglePause}
        title={isPaused ? 'Resume automatic updates' : 'Pause automatic updates'}
      >
        {isPaused ? (
          <>
            <Play className="h-4 w-4 mr-1" />
            Play
          </>
        ) : (
          <>
            <Pause className="h-4 w-4 mr-1" />
            Pause
          </>
        )}
      </Button>

      {/* Robots Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onToggleRobotMode}
        className={treatRobotsAsHumans ? 'bg-orange-500 text-white hover:bg-orange-600 hover:text-white' : ''}
        title={treatRobotsAsHumans ? 'Robot updates create events (cascading enabled)' : 'Robot updates are silent (no cascading)'}
      >
        <Settings2 className="h-4 w-4 mr-1" />
        Robots: {treatRobotsAsHumans ? 'ON' : 'OFF'}
      </Button>
    </div>
  )
}