import { createClient } from "@/lib/supabase/server"
import { ReservaCompleta, Reserva } from "@/types"

export interface FiltrarReservasData {
    id_instalacion?: string
    id_usuario?: string
    id_estado?: string // Viene como string del searchParams
    fecha?: string // YYYY-MM-DD
}

export async function getReservas(data: FiltrarReservasData) {
    const supabase = await createClient()

    let query = supabase
        .from('reservas')
        .select(`
            *,
            instalacion:instalaciones (
                id_instalacion,
                nombre_instalacion
            ),
            estado:tipo_estado_reserva (
                id_estado,
                nombre_estado
            ),
            usuario:usuarios (
                id_usuario,
                nombre_usuario,
                email_usuario,
                dni_usuario
            )
        `)

    // Filtros
    if (data.id_instalacion && data.id_instalacion !== 'todas') {
        query = query.eq('id_instalacion', data.id_instalacion)
    }

    if (data.id_usuario && data.id_usuario !== 'todos') {
        query = query.eq('id_usuario', data.id_usuario)
    }

    if (data.id_estado && data.id_estado !== 'todos') {
        const estadoNum = parseInt(data.id_estado)
        if (!isNaN(estadoNum)) {
            query = query.eq('id_estado', estadoNum)
        }
    }

    if (data.fecha && data.fecha !== 'todas' && data.fecha !== 'null' && data.fecha !== 'undefined') {
        // Asumiendo que data.fecha es YYYY-MM-DD
        const inicio = `${data.fecha}T00:00:00-03:00`
        const fin = `${data.fecha}T23:59:59-03:00`
        query = query
            .gte('fecha_y_hora_reservada', inicio)
            .lte('fecha_y_hora_reservada', fin)
    }

    // Ordenar por fecha desc (más reciente primero)
    query = query.order('fecha_y_hora_reservada', { ascending: false })

    const { data: reservas, error } = await query

    if (error) {
        console.error('Error al obtener reservas:', error)
        return []
    }

    return reservas as unknown as ReservaCompleta[]
}

export async function getReservaDetalle(id_reserva: number) {
    const supabase = await createClient()

    const { data:reserva, error } = await supabase
        .from('reservas')
        .select(`
            *,
            usuario:usuarios(*),
            instalacion:instalaciones(
                *,
                deporte:deportes(*)
            ),
            estado:tipo_estado_reserva(*),
            pagos(*)
        `)
        .eq('id_reserva', id_reserva)
        .single()

    if (error) {
        console.error('Error al obtener detalle reserva:', error)
        return null
    }
    return reserva
}



export async function getReservasEnCurso(id_usuario?: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .eq('id_estado', 3) //3 = EnCurso
        .eq('id_usuario', id_usuario)
        //.maybeSingle()
    if (error) {
        console.error('Error al obtener reservas:', error)
        return { error: 'Error al obtener reservas' }
    }
    return { success: true, data }
}
