'use client'

import { useEffect, useState, useRef } from 'react'

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
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-gray-400' : 'bg-blue-500 animate-pulse'}`}></div>
          <span>{label}</span>
        </div>
        <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
          {isPaused ? 'Paused' : `${seconds}s`}
        </span>
      </div>
      <button
        onClick={togglePause}
        className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-colors flex items-center gap-1.5 ${
          isPaused
            ? 'bg-green-500 hover:bg-green-600 text-white'
            : 'bg-gray-500 hover:bg-gray-600 text-white'
        }`}
        title={isPaused ? 'Resume automatic updates' : 'Pause automatic updates'}
      >
        {isPaused ? (
          <>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
            Play
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Pause
          </>
        )}
      </button>
      <button
        onClick={onToggleRobotMode}
        className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-colors flex items-center gap-1.5 ${
          treatRobotsAsHumans
            ? 'bg-orange-500 hover:bg-orange-600 text-white'
            : 'bg-purple-500 hover:bg-purple-600 text-white'
        }`}
        title={treatRobotsAsHumans ? 'Robot updates create events (cascading enabled)' : 'Robot updates are silent (no cascading)'}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          {treatRobotsAsHumans ? (
            <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
          ) : (
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
          )}
        </svg>
        {treatRobotsAsHumans ? 'Robots: ON' : 'Robots: OFF'}
      </button>
    </div>
  )
}