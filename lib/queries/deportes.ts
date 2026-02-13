import { createClient } from '@/lib/supabase/server'
import { Deporte } from '@/types'

export async function getDeportes(): Promise<Deporte[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('deportes')
        .select('*')
        .order('nombre_deporte')

    if (error) {
        console.error('Error al obtener deportes:', error)
        return []
    }

    return data || []
}
