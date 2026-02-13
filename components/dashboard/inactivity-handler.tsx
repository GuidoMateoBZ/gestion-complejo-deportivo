'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useDashboard } from '@/components/dashboard/dashboard-authcontext'

// ============================================
// CONFIGURACIÓN DE TIEMPOS DE INACTIVIDAD
// ============================================
const TIMEOUT_CLIENTE_MS = 1 * 60 * 60 * 1000   // 1 hora
const TIMEOUT_ADMIN_MS = 4 * 60 * 60 * 1000     // 4 horas

// ============================================

export function InactivityHandler() {
    const router = useRouter()
    const { isAdmin } = useDashboard()
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    const timeout = isAdmin ? TIMEOUT_ADMIN_MS : TIMEOUT_CLIENTE_MS

    const resetTimer = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)

        timeoutRef.current = setTimeout(async () => {
            const supabase = createClient()
            await supabase.auth.signOut()
            router.push('/login?expired=true')
        }, timeout)
    }

    useEffect(() => {
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
        events.forEach(event => window.addEventListener(event, resetTimer))
        resetTimer()

        return () => {
            events.forEach(event => window.removeEventListener(event, resetTimer))
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [isAdmin])

    return null
}
