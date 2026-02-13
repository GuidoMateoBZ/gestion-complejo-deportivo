'use server'

import { createClient } from '@/lib/supabase/server'
import { getPagoReserva } from '@/lib/queries/pagos'

export async function crearPago(id_reserva: number, monto_pago: number, esCliente: boolean = true) {
    const supabase = await createClient()

    if(esCliente){
        //Procesar pago API y si hay error devolver error
        //Si pago falla return error y no crea el pago en la BD
    }
    const { error } = await supabase
        .from('pagos')
        .insert({
            id_reserva,
            monto_pago
            //fecha_y_hora_pago se genera automático default now() en BD
            //devuelto = false por defecto
        })

    if (error) {
        console.error('Error al crear pago:', error)
        return { error: 'Error al registrar el pago' }
    }

    return { success: true }
}


export async function devolverPago(id_reserva: number, tarifa_total: number) {
    const supabase = await createClient()

    const { data: pago, error: errorPago } = await getPagoReserva(id_reserva)
    if (errorPago) {
        console.error('Error al obtener pagos:', errorPago)
        return { error: 'Error al obtener los pagos' }
    }
    if (!pago) {
        return { error: 'No se encontraron pagos' }
    }
    const monto_a_devolver = tarifa_total - pago.monto_pago
    if (monto_a_devolver <= 0) {
        return { error: 'No se puede devolver pago porque el monto pagado es menor o igual al monto total' }
    }

    //Acá debería llamar a la API de Mercado Pago para hacer el reembolso real.
    const monto_devuelto = monto_a_devolver
    const { error } = await supabase
        .from('pagos')
        .update({devuelto: true})
        .eq('id_reserva', id_reserva)

    if (error) {
        console.error('Error al devolver pago:', error)
        return { error: 'Error al devolver el pago' }
    }

    return { success: true, monto_devuelto }
}


export async function calcularMontoPagoNormal(id_reserva: number, tarifa_total: number) {
    const { data: pago, error: errorPago } = await getPagoReserva(id_reserva)
    if (errorPago) {
        console.error('Error al obtener pagos:', errorPago)
        return { error: 'Error al obtener los pagos' }
    }
    if (!pago) {
        return { error: 'No se encontraron pagos' }
    }
    const monto_a_pagar = tarifa_total - pago.monto_pago
    if (monto_a_pagar <= 0) {
        return { error: 'No se puede completar el pago porque el monto pagado es mayor o igual al monto total' }
    }
    return { success: true, monto_a_pagar }
}

export async function sumarAlPago(id_reserva: number, monto_a_sumar: number) {
    const supabase = await createClient()

    const { data: pago, error: errorPago } = await getPagoReserva(id_reserva)
    if (errorPago) {
        console.error('Error al obtener pagos:', errorPago)
        return { error: 'Error al obtener los pagos' }
    }
    if (!pago) {
        return { error: 'No se encontraron pagos' }
    }
    const monto_total = pago.monto_pago + monto_a_sumar
    const { error } = await supabase
        .from('pagos')
        .update({ monto_pago: monto_total })
        .eq('id_reserva', id_reserva)

    if (error) {
        console.error('Error al sumar al pago:', error)
        return { error: 'Error al sumar al pago' }
    }

    return { success: true, monto_total }
}