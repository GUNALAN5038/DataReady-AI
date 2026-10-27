'use client'

import { useTheme } from './theme-provider'
import { Sun, Moon, Laptop } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className={cn("flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border/60", className)}>
        <div className="h-8 w-20 rounded-lg bg-muted animate-pulse" />
      </div>
    )
  }

  const options: { value: 'light' | 'dark' | 'system'; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Laptop },
  ]

  return (
    <div
      role="group"
      aria-label="Theme selection"
      className={cn(
        "flex items-center gap-1 p-1 rounded-xl bg-muted/70 border border-border/70 backdrop-blur-xs",
        className
      )}
    >
      {options.map((option) => {
        const Icon = option.icon
        const isSelected = theme === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 cursor-pointer",
              isSelected
                ? "bg-background text-foreground shadow-xs border border-border/80 font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
            )}
            title={`Set theme to ${option.label}`}
            aria-pressed={isSelected}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function ThemeToggleCompact({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className={cn("h-8 w-8 rounded-lg bg-muted/50", className)} />
    )
  }

  const toggleTheme = () => {
    if (theme === 'system') {
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
    } else if (theme === 'light') {
      setTheme('dark')
    } else {
      setTheme('light')
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className={cn(
        "h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60",
        className
      )}
      title={`Current: ${theme} (${resolvedTheme}). Click to switch.`}
      aria-label={`Current theme is ${theme}. Click to toggle.`}
    >
      {resolvedTheme === 'dark' ? (
        <Moon className="h-4 w-4 text-indigo-400" />
      ) : (
        <Sun className="h-4 w-4 text-amber-500" />
      )}
    </Button>
  )
}
