'use client'
import { useTheme as useNextTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function useTheme() {
  const { theme, setTheme, resolvedTheme } = useNextTheme()
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(timer)
  }, [])

  return {
    theme:   mounted ? resolvedTheme : undefined,
    rawTheme: mounted ? theme : undefined,
    setTheme,
    isDark:  mounted ? resolvedTheme === 'dark' : false,
    isLight: mounted ? resolvedTheme === 'light' : true,
    mounted,
    toggle:  () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'),
  }
}
