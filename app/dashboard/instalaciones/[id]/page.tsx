import { createClient } from '@/lib/supabase/server'
import { InstalacionConDeporte } from '@/types'
import { notFound } from 'next/navigation'
import { InstalacionDetalle } from '@/components/instalaciones/instalacion-detalle'
import { getDeportes } from '@/lib/queries/deportes'
import { getSuspensionesInstalacion } from '@/lib/queries/instalaciones'

interface Props {
    params: Promise<{ id: string }>
}

async function getInstalacion(id: string): Promise<InstalacionConDeporte | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('instalaciones')
        .select(`
            *,
            deporte:deportes(*)
        `)
        .eq('id_instalacion', id)
        .single()

    if (error || !data) {
        return null
    }

    return data as InstalacionConDeporte
}

export default async function InstalacionPage({ params }: Props) {
    const { id } = await params

    // Obtener en paralelo
    const [instalacion, deportes, suspensiones] = await Promise.all([
        getInstalacion(id),
        getDeportes(),
        getSuspensionesInstalacion(id)
    ])

    if (!instalacion) {
        notFound()
    }

    return <InstalacionDetalle
        instalacion={instalacion}
        deportes={deportes}
        suspensiones={suspensiones}
    />
}
