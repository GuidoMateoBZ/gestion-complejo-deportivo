'use server'

import { createClient, createClientAdmin } from '@/lib/supabase/server'
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
    const supabase = await createClientAdmin()

    const { data: pagos, error: errorPago } = await getPagoReserva(id_reserva)
    if (errorPago) {
        console.error('Error al obtener pagos:', errorPago)
        return { error: 'Error al obtener los pagos' }
    }
    if (!pagos || pagos.length === 0) {
        return { error: 'No se encontraron pagos' }
    }

    const monto_a_devolver = pagos.reduce((acc: number, curr: any) => acc + curr.monto_pago, 0)
    
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
    const { data: pagos, error: errorPago } = await getPagoReserva(id_reserva)
    if (errorPago) {
        console.error('Error al obtener pagos:', errorPago)
        return { error: 'Error al obtener los pagos' }
    }
    if (!pagos || pagos.length === 0) {
       // Si no hay pagos, el monto a pagar es el total
       return { success: true, monto_a_pagar: tarifa_total }
    }
    const total_pagado = pagos.reduce((acc: number, curr: any) => acc + curr.monto_pago, 0)
    const monto_a_pagar = tarifa_total - total_pagado
    if (monto_a_pagar <= 0) {
        return { error: 'No se puede completar el pago porque el monto pagado es mayor o igual al monto total' }
    }
    return { success: true, monto_a_pagar }
}

export async function sumarAlPago(id_reserva: number, monto_a_sumar: number) {
    const supabase = await createClient()

    // Nota: sumarAlPago modifica un pago existente. Si hay múltiples, ¿cuál modifica?
    // Asumimos que modifica el último o requiere lógica nueva.
    // Por simplicidad y consistencia, createPago es preferible para agregar fondos.
    // Pero si se usa esta función:
    const { data: pagos, error: errorPago } = await getPagoReserva(id_reserva)
    if (errorPago || !pagos || pagos.length === 0) {
         return { error: 'No se encontraron pagos para actualizar' }
    }
    // Modificamos el último pago
    const ultimoPago = pagos[pagos.length - 1]
    const monto_total = ultimoPago.monto_pago + monto_a_sumar
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