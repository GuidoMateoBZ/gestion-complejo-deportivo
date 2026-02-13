'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    // Evitar hydration mismatch
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <Button variant="ghost" size="icon" className="fixed top-4 right-4">
                <Sun className="h-5 w-5" />
            </Button>
        )
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="fixed top-4 right-4 z-50"
            aria-label="Cambiar tema"
        >
            {theme === 'dark' ? (
                <Sun className="h-5 w-5 transition-transform hover:rotate-45" />
            ) : (
                <Moon className="h-5 w-5 transition-transform hover:-rotate-12" />
            )}
        </Button>
    )
}
