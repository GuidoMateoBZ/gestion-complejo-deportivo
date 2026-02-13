'use client'

import { createContext, useContext } from 'react'
import { Usuario } from '@/types'

interface DashboardContextType {
    usuario: Usuario
    isAdmin: boolean
}

const DashboardContext = createContext<DashboardContextType | null>(null)

export function DashboardProvider({
    children,
    usuario
}: {
    children: React.ReactNode
    usuario: Usuario
}) {
    const isAdmin = usuario.rol === 'administrador'

    return (
        <DashboardContext.Provider value={{ usuario, isAdmin }}>
            {children}
        </DashboardContext.Provider>
    )
}

export function useDashboard() {
    const context = useContext(DashboardContext)
    if (!context) {
        throw new Error('useDashboard debe usarse dentro de DashboardProvider')
    }
    return context
}
