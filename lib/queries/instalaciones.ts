import { createClient, createClientAdmin } from '@/lib/supabase/server'
import { InstalacionConDeporte } from '@/types'

export async function getInstalaciones(): Promise<InstalacionConDeporte[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('instalaciones')
        .select(`
            *,
            deporte:deportes(*)
        `)
        .eq('activa', true)
        .order('nombre_instalacion')

    if (error) {
        console.error('Error fetching instalaciones:', error)
        return []
    }

    return data as InstalacionConDeporte[]
}

export async function getInstalacionById(id: string): Promise<InstalacionConDeporte | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('instalaciones')
        .select(`
            *,
            deporte:deportes(*)
        `)
        .eq('id_instalacion', id)
        .eq('activa', true)
        .single()

    if (error) {
        console.error('Error fetching instalacion:', error)
        return null
    }

    return data as InstalacionConDeporte
}

export async function getSuspensionesInstalacion(idInstalacion: string) {
    const supabaseAdmin = await createClientAdmin()

    const { data, error } = await supabaseAdmin
        .from('suspensiones')
        .select('*')
        .eq('id_instalacion', idInstalacion)

    if (error) {
        console.error('Error fetching suspensiones:', error)
        return []
    }

    return data
}