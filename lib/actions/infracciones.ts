import { createClientAdmin } from "@/lib/supabase/server"
import { DIAS_INHABILITACION, TIPO_INFRACCION, PORCENTAJE_INTERES_DIARIO } from "../constantes"
import { getInfraccionDeuda } from "../queries/infracciones"
import { habilitarUsuario } from "./usuarios"
import { cancelacionesPorInfraccion } from '@/lib/actions/reservas'

export async function crearInfraccionCancelaciones(id_usuario:string) {
    const supabase = await createClientAdmin()

    const fecha_final = new Date(new Date().getTime() + DIAS_INHABILITACION * 24 * 60 * 60 * 1000)

    const { error } = await supabase
        .from('infracciones')
        .insert({
            id_usuario: id_usuario,
            id_tipo_infraccion: TIPO_INFRACCION.CANCELACIONES, //2 es inhabilita por cancelaciones
            fecha_final: fecha_final.toISOString(),

            //fecha_inicial default now() en bd
            //monto_inicial default null en bd
            //activa default true en bd
        })

    if (error) {
        console.error('Error al crear infracción:', error)
        return { error: 'Error al crear la infracción' }
    }

    const { error: error2 } = await supabase
        .from('usuarios')
        .update({ habilitado: false })
        .eq('id_usuario', id_usuario)
    if (error2) {
        console.error('Error al actualizar usuario:', error2)
        return { error: 'Error al actualizar el usuario' }
    }
    
    // Cancelar reservas vigentes y procesar devoluciones por la infracción
    await cancelacionesPorInfraccion(id_usuario)

    return { success: true }
}

export async function desactivarInfraccionDeuda(id_usuario:string) {
    const supabase = await createClientAdmin()

    const { error } = await supabase
        .from('infracciones')
        .update({ activa: false })
        .eq('id_usuario', id_usuario)
        .eq('id_tipo_infraccion', TIPO_INFRACCION.DEUDA)

    if (error) {
        console.error('Error al desactivar infracción:', error)
        return { error: 'Error al desactivar la infracción' }
    }

    const { error: error2 } = await habilitarUsuario(id_usuario)
    if (error2) {
        console.error('Error al habilitar usuario:', error2)
        return { error: 'Error al habilitar el usuario' }
    }
    
    return { success: true }
}

export async function calcularMontoDeuda(id_usuario:string) {
    //Calcular los intereses diarios de la deuda (entre fecha_inicial y now())
    const { data: infraccion, error: errorInfraccion } = await getInfraccionDeuda(id_usuario)
    if (errorInfraccion) {
        console.error('Error al obtener infracción:', errorInfraccion)
        return { error: 'Error al obtener la infracción' }
    }
    if (!infraccion) {
        return { error: 'No se encontró la infracción' }
    }
    const fecha_inicial = new Date(infraccion.fecha_inicial)
    const now = new Date()

    // Ajustamos a zona horaria Argentina (UTC-3) para cálculo de días calendario
    // Restamos 3 horas (180 minutos)
    const fechaInicioArg = new Date(fecha_inicial.getTime() - (3 * 60 * 60 * 1000))
    const nowArg = new Date(now.getTime() - (3 * 60 * 60 * 1000))

    // Normalizamos a medianoche (00:00:00) para contar días completos
    fechaInicioArg.setHours(0, 0, 0, 0)
    nowArg.setHours(0, 0, 0, 0)

    // Calculamos diferencia en días
    const diffTime = Math.abs(nowArg.getTime() - fechaInicioArg.getTime())
    const dias = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    const intereses = dias * infraccion.monto_inicial * PORCENTAJE_INTERES_DIARIO
    const monto_total = infraccion.monto_inicial + intereses
    
    
    return { success: true, monto_total }
}
