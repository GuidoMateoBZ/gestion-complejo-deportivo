'use client'

import { useDashboard } from '@/components/dashboard/dashboard-authcontext'
import { InstalacionCard } from '@/components/instalaciones/instalacion-card'
import { InstalacionFormDialog } from '@/components/instalaciones/instalacion-form-dialog'
import { InstalacionConDeporte, Deporte } from '@/types'

interface InstalacionesListProps {
    instalaciones: InstalacionConDeporte[]
    deportes: Deporte[]
}

export function InstalacionesList({ instalaciones, deportes }: InstalacionesListProps) {
    const { isAdmin } = useDashboard()

    if (instalaciones.length === 0 && !isAdmin) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                No hay instalaciones disponibles
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {instalaciones.map((instalacion) => (
                <InstalacionCard
                    key={instalacion.id_instalacion}
                    instalacion={instalacion}
                />
            ))}

            {/* Sin instalacion = modo crear */}
            {isAdmin && <InstalacionFormDialog deportes={deportes} />}
        </div>
    )
}
