import { createClientAdmin } from "../supabase/server"
import { TIPO_INFRACCION } from "../constantes"

export async function getInfraccionDeuda(id_usuario:string) {
    const supabase = await createClientAdmin()

    const { data, error } = await supabase
        .from('infracciones')
        .select('*')
        .eq('id_usuario', id_usuario)
        .eq('id_tipo_infraccion', TIPO_INFRACCION.DEUDA)
        .eq('activa', true)
        .maybeSingle()

    if (error) {
        console.error('Error al obtener infracción:', error)
        return { error: 'Error al obtener la infracción' }
    }
    return { success: true, data }
}

export async function getInfraccionCancelaciones(id_usuario:string) {
    const supabase = await createClientAdmin()

    const { data, error } = await supabase
        .from('infracciones')
        .select('*')
        .eq('id_usuario', id_usuario)
        .eq('id_tipo_infraccion', TIPO_INFRACCION.CANCELACIONES)
        .eq('activa', true)
        .maybeSingle()

    if (error) {
        console.error('Error al obtener infracción:', error)
        return { error: 'Error al obtener la infracción' }
    }
    return { success: true, data }
}

export async function getInfraccionesUsuario(id_usuario:string) {
    const supabase = await createClientAdmin()

    const { data, error } = await supabase
        .from('infracciones')
        .select('*')
        .eq('id_usuario', id_usuario)
        .eq('activa', true)

    if (error) {
        console.error('Error al obtener infracciones:', error)
        return { error: 'Error al obtener las infracciones' }
    }
    return { success: true, data }
}