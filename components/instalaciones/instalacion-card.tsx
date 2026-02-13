'use client'

import { useRouter } from 'next/navigation'
import PixelCard from '@/components/PixelCard'
import { InstalacionConDeporte } from '@/types'

// Iconos de MUI
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer'
import SportsBasketballIcon from '@mui/icons-material/SportsBasketball'
import SportsTennisIcon from '@mui/icons-material/SportsTennis'

interface InstalacionCardProps {
    instalacion: InstalacionConDeporte
}

// Mapeo de deportes a variantes y colores
const deporteConfig: Record<string, {
    variant: 'green' | 'orange' | 'blue',
    icon: React.ComponentType<{ sx?: object }>,
    textColor: string,
    borderColor: string
}> = {
    'fútbol': {
        variant: 'green',
        icon: SportsSoccerIcon,
        textColor: 'text-green-600 dark:text-green-400',
        borderColor: 'border-green-300'
    },
    'básquet': {
        variant: 'orange',
        icon: SportsBasketballIcon,
        textColor: 'text-orange-600 dark:text-orange-400',
        borderColor: 'border-orange-300'
    },
    'pádel': {
        variant: 'blue',
        icon: SportsTennisIcon,
        textColor: 'text-blue-600 dark:text-blue-400',
        borderColor: 'border-blue-300'
    }
}

export function InstalacionCard({ instalacion }: InstalacionCardProps) {
    const router = useRouter()
    const deporte = instalacion.deporte?.nombre_deporte?.toLowerCase() || ''
    const config = deporteConfig[deporte]

    // Icono por defecto si no hay configuración
    const IconComponent = config?.icon || SportsSoccerIcon
    const variant = config?.variant || 'default'
    const textColor = config?.textColor || 'text-foreground'
    const borderColor = config?.borderColor || 'border-border'

    const handleClick = () => {
        router.push(`/dashboard/instalaciones/${instalacion.id_instalacion}`)
    }

    return (
        <div onClick={handleClick}>
            <PixelCard
                variant={variant}
                className={`h-[200px]! w-full! cursor-pointer border ${borderColor}`}
            >
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-10">
                    <div className={textColor}>
                        <IconComponent sx={{ fontSize: 48 }} />
                    </div>
                    <h3 className="font-bold text-lg text-foreground mt-3">
                        {instalacion.nombre_instalacion}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {instalacion.descripcion}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                        {instalacion.hora_apertura?.slice(0, 5)} - {instalacion.hora_cierre?.slice(0, 5)}
                    </p>
                </div>
            </PixelCard>
        </div>
    )
}
