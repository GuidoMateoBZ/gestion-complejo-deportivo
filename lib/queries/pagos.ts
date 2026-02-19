import { createClient } from "../supabase/server"

export async function getPagoReserva (id_reserva: number){
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('pagos')
        .select('*')
        .eq('id_reserva', id_reserva)
        
    if (error) {
        console.error('Error al obtener pagos:', error)
        return { error: 'Error al obtener los pagos' }
    }
    return { success: true, data }
}
