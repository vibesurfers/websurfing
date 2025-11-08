'use client'

import { useEffect, useState } from 'react'

interface CountdownTimerProps {
  intervalMs: number
  onTick: () => void
  label?: string
}

export function CountdownTimer({ intervalMs, onTick, label = "Next update" }: CountdownTimerProps) {
  const [seconds, setSeconds] = useState(Math.floor(intervalMs / 1000))

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          // Reset to full interval and trigger callback
          onTick()
          return Math.floor(intervalMs / 1000)
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [intervalMs, onTick])

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
        <span>{label}</span>
      </div>
      <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
        {seconds}s
      </span>
    </div>
  )
}