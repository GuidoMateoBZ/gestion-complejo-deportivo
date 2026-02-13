'use server'
import { enviarEmailCancelacion, enviarEmailNuevaReserva, enviarEmailPagoCompletado } from './emails'
import { createClient, createClientAdmin } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { calcularMontoPagoNormal, crearPago, devolverPago, sumarAlPago } from './pagos'
import { PORCENTAJE_SENIA_MIN } from '@/lib/constantes'
import { obtenerUsuario } from '@/lib/queries/usuarios'
import { CANTIDAD_CANCELACIONES_PERMITIDAS, HORAS_MINIMAS_DEVOLUCION } from '@/lib/constantes'
import { calcularMontoDeuda, crearInfraccionCancelaciones, desactivarInfraccionDeuda } from './infracciones'
import { getInfraccionDeuda , getInfraccionesUsuario} from '@/lib/queries/infracciones'
import { getReservaDetalle } from '../queries/reservas'
import { getPagoReserva } from '../queries/pagos'




interface CrearReservaData {
    id_instalacion: string
    fecha: Date  // La fecha viene del cliente
    hora_inicio: number
    monto_senia: number
    precio_total: number
    dni_cliente?: string
}

export async function crearReserva(data: CrearReservaData) {
    const supabase = await createClient()
    const supabaseAdmin = await createClientAdmin()
    let esCliente = true

    // 1. Obtener usuario actual
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Debes iniciar sesión para reservar' }
    }

    let targetUserId = user.id

    // Si se envía dni_cliente, verificar que el usuario actual es ADMIN
    if (data.dni_cliente) {
        // Obtenemos rol del usuario ACTUAL
        const { data: currentUserData } = await supabase
            .from('usuarios')
            .select('rol')
            .eq('id_usuario', user.id)
            .single()

        if (currentUserData?.rol !== 'administrador') {
            return { error: 'Solo los administradores pueden reservar para terceros' }
        }

        // Si es admin, buscamos al usuario destino por DNI
        const { data: targetUser, error: targetError } = await supabase
            .from('usuarios')
            .select('id_usuario')
            .eq('dni_usuario', parseInt(data.dni_cliente)) // dni_usuario es number en la BD
            .single()

        if (targetError || !targetUser) {
            return { error: `No se encontró ningún usuario con DNI ${data.dni_cliente}` }
        }

        targetUserId = targetUser.id_usuario
        esCliente = false 
    }

    const reservasPendientesDePago = await getReservasPendientesDePago(targetUserId)
    if (reservasPendientesDePago.data){
        if (reservasPendientesDePago.data.length > 0){
            return { error: 'No se puede crear una reserva porque el usuario tiene reservas pendientes de pago' }
        }
    }

    const infracciones = await getInfraccionesUsuario(targetUserId)
    if (infracciones.data){
        if (infracciones.data.length > 0){
            return { error: 'No se puede crear una reserva porque el usuario tiene infracciones' }
        }
    }

    // 2. Preparar fechas (Forzar Zona Horaria Argentina -03:00)
    // Usamos Intl.DateTimeFormat para garantizar YYYY-MM-DD sin errores de locale
    const formatter = new Intl.DateTimeFormat('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    })

    // Obtenemos las partes exactas
    const parts = formatter.formatToParts(new Date(data.fecha))
    const anio = parts.find(p => p.type === 'year')?.value
    const mes = parts.find(p => p.type === 'month')?.value
    const dia = parts.find(p => p.type === 'day')?.value

    // Construimos manualmente YYYY-MM-DD
    const fechaStr = `${anio}-${mes}-${dia}`

    const hora = data.hora_inicio.toString().padStart(2, '0')
    const fechaInicioISO = `${fechaStr}T${hora}:00:00-03:00`

    // 3. Validaciones Server-Side - Debería estar en query/instalaciones.ts
    // a) Verificar existencia de instalación y su tarifa actual
    const { data: instalacion, error: instError } = await supabaseAdmin
        .from('instalaciones')
        .select('tarifa_hora, nombre_instalacion')
        .eq('id_instalacion', data.id_instalacion)
        .single()

    if (instError || !instalacion) {
        return { error: 'La instalación no existe o no está disponible' }
    }

    // b) Verificar suspensión
    const { data: suspension, error: susError } = await supabaseAdmin
        .from('suspensiones')
        .select('id_suspension')
        .eq('id_instalacion', data.id_instalacion)
        .lte('fecha_y_hora_inicio', fechaInicioISO)
        .gte('fecha_y_hora_fin', fechaInicioISO)
        .maybeSingle()

    if (susError || suspension) {
        return { error: 'La instalación está suspendida en este horario' }
    }

    // Validar monto mínimo de seña
    const montoMinimo = instalacion.tarifa_hora * PORCENTAJE_SENIA_MIN
    if (data.monto_senia < montoMinimo) {
        return { error: `Monto inválido. La seña mínima es $${montoMinimo} (${PORCENTAJE_SENIA_MIN * 100}%)` }
    }

    // Verificar disponibilidad (que no exista reserva activa en ese horario)
    const { count, error: countError } = await supabaseAdmin
        .from('reservas')
        .select('*', { count: 'exact', head: true })
        .eq('id_instalacion', data.id_instalacion)
        .eq('fecha_y_hora_reservada', fechaInicioISO)
        .neq('id_estado', 5) // Excluir canceladas

    if (countError) {
        console.error('Error verificando disponibilidad:', countError)
        return { error: 'Error al verificar disponibilidad' }
    }

    if (count && count > 0) {
        return { error: 'El turno seleccionado ya ha sido reservado por otro usuario.' }
    }

    // 4. Crear la reserva (Estado inicial 0 = Temporal)
    // El precio total lo tomamos de la BD tarifa_hora como total real
    const { data: reserva, error: reservaError } = await supabase
        .from('reservas')
        .insert({
            id_usuario: targetUserId,
            id_instalacion: data.id_instalacion,
            // id_estado tiene default 0 en BD
            fecha_y_hora_reservada: fechaInicioISO,
            tarifa_total: instalacion.tarifa_hora // Usamos el precio real de la BD
        })
        .select('id_reserva')
        .single()

    if (reservaError) {
        console.error('Error al crear reserva:', reservaError)
        return { error: 'Error al crear la reserva' }
    }

    const idReserva = reserva.id_reserva

    // 5. Procesar el pago
    const pagoResult = await crearPago(idReserva, data.monto_senia, esCliente)
    if (pagoResult.error) {
            //Eliminar reserva temporal si falla el pago
            const { error: deleteError } = await supabase
                .from('reservas')
                .delete()
                .eq('id_reserva', idReserva)
            if (deleteError) {
                console.error('Error al eliminar reserva temporal:', deleteError)
                return { error: 'Error al eliminar la reserva temporal' }
            }
            return { error: 'Falló el registro del pago, se eliminó la reserva temporal', id_reserva: idReserva }
    }

    // 6. Actualizar estado de reserva a Vigente (1)
    const { data: updatedData, error: updateError } = await supabaseAdmin
        .from('reservas')
        .update({ id_estado: 1 }) // Vigente
        .eq('id_reserva', idReserva)
        .select()

    console.log('Update result:', updatedData) // Ver si array tiene elementos
    if (updateError) {
        console.error('Error al actualizar estado reserva a Vigente:', JSON.stringify(updateError, null, 2))
        return { error: `Error Admin Update: ${updateError.message} (${updateError.code})` }
    }

    await enviarEmailNuevaReserva({
        idReserva: idReserva,
        monto: data.monto_senia
    })

    revalidatePath(`/dashboard/instalaciones/${data.id_instalacion}`)

    return { success: true, id_reserva: idReserva }
}

//Debería estar en queries
export async function obtenerReservasInstalacion(id_instalacion: string, fecha?: string) {
    const supabaseAdmin = await createClientAdmin() //Para mostrar todas las reservas
    let query = supabaseAdmin
        .from('reservas')
        .select('*')
        .eq('id_instalacion', id_instalacion)
        .neq('id_estado', 5)

    // Si hay fecha, filtramos por rango del día completo en Argentina
    if (fecha) {
        // fecha es YYYY-MM-DD
        const inicioDia = `${fecha}T00:00:00-03:00`
        const finDia = `${fecha}T23:59:59-03:00`

        query = query
            .gte('fecha_y_hora_reservada', inicioDia)
            .lte('fecha_y_hora_reservada', finDia)
    }
    const { data, error } = await query

    if (error) {
        console.error('Error al obtener reservas:', error)
        return { error: 'Error al obtener reservas' }
    }
    return { success: true, reservas: data }
}



export async function getReservaDetalleAction(id_reserva: number) {
    return await getReservaDetalle(id_reserva)
}

export async function cancelarReserva(idReserva: string) {
    const supabase = await createClient()
    const supabaseAdmin = await createClientAdmin()

    // 1. Obtener detalles de la reserva (para saber qué usuario y qué instalación)
    const { data: reserva, error: fetchError } = await supabase
        .from('reservas')
        .select('*')
        .eq('id_reserva', idReserva)
        .single()

    if (fetchError || !reserva) {
        return { error: 'Reserva no encontrada' }
    }

    if (reserva.id_estado !== 1) {
        return { error: 'Reserva no se puede cancelar' }
    }

    // 2. Actualizar estado a Cancelada (5)
    const { data: updatedData, error: updateError } = await supabaseAdmin
        .from('reservas')
        .update({ id_estado: 5, cancelo_cliente: true }) // 5 = Cancelada
        .eq('id_reserva', idReserva)
        .select()

    if (updateError) {
        console.error('Error al cancelar reserva:', updateError)
        return { error: 'Error al cancelar la reserva' }
    }

    // 3. Devolver el dinero si corresponde (Regla: Si cancela el usuario antes de 5hs, se devuelve el 100%)
    // Calcular la diferencia horaria.

    const fechaReserva = new Date(reserva.fecha_y_hora_reservada)
    const ahora = new Date()
    const diffMs = fechaReserva.getTime() - ahora.getTime()
    const diffHoras = diffMs / (1000 * 60 * 60)

    let montoADevolver
    let mensajeDevolucion = ''

    if (diffHoras < HORAS_MINIMAS_DEVOLUCION) {
        // No devolvemos
        montoADevolver = 0
        mensajeDevolucion = `No se devolvió el pago por cancelación con menos de ${HORAS_MINIMAS_DEVOLUCION}hs de anticipación.`
    } else {
        // Devolvemos 100%
        const {monto_devuelto, error: errorPagoDevolucion} = await devolverPago(reserva.id_reserva, reserva.tarifa_total)
        if (errorPagoDevolucion) {
            console.error('Error al devolver el pago:', errorPagoDevolucion)
            return { error: 'Error al devolver el pago' }
        }
        montoADevolver = monto_devuelto
    }

    // 4. Devolver el dinero si corresponde
    if (montoADevolver && montoADevolver > 0) {
        mensajeDevolucion = `Se devolvió el 100% del pago ($${montoADevolver}) por cancelación con más de ${HORAS_MINIMAS_DEVOLUCION}hs de anticipación.`
        console.log(mensajeDevolucion)
    }

    // 5. Mandar mail al cliente de confirmación de cancelación
    await enviarEmailCancelacion({ idReserva: reserva.id_reserva });

    // 6. Procesar Infracción
    const reservasCanceladas = await contarReservasCanceladas(reserva.id_usuario)
    if (reservasCanceladas > CANTIDAD_CANCELACIONES_PERMITIDAS) {
        await crearInfraccionCancelaciones(reserva.id_usuario);
        mensajeDevolucion += ` Se le aplicó una infracción por exceder el límite de cancelaciones.`
    }

    revalidatePath(`/dashboard/instalaciones/${reserva.id_instalacion}`)
    revalidatePath(`/dashboard/reservas`)

    return { success: true, message: `Reserva cancelada correctamente. ${mensajeDevolucion}` }
}

export async function contarReservasCanceladas(idUsuario: string) {
    const supabase = await createClient()

    // Obtener Año y Mes actuales en ARGENTINA (no del servidor)
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric',
        month: '2-digit'
    });

    //[{type: "month", value: "02"}, {type: "year", value: "2024"}]
    const parts = formatter.formatToParts(now);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;

    const inicioArg = `${year}-${month}-01T00:00:00-03:00`;

    const daysInMonth = new Date(parseInt(year!), parseInt(month!), 0).getDate();
    const finArg = `${year}-${month}-${daysInMonth}T23:59:59-03:00`;

    const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .eq('id_usuario', idUsuario)
        .eq('cancelo_cliente', true)
        .gte('fecha_y_hora_reservada', inicioArg)
        .lte('fecha_y_hora_reservada', finArg)

    if (error) {
        console.error('Error contando cancelaciones:', error)
        return 0
    }
    console.log("Reservas canceladas: ", data?.length)
    return data?.length || 0
}

// Por Suspensión o Eliminación de Instalación
export async function cancelarReservaInstalacion(idInstalacion: string, fechaHoraInicio?: string, fechaHoraFin?: string) {
    const supabase = await createClient()

    let query = supabase
        .from('reservas')
        .update({ id_estado: 5 })
        .eq('id_instalacion', idInstalacion)
        .neq('id_estado', 5)

    if (fechaHoraInicio) query = query.gte('fecha_y_hora_reservada', fechaHoraInicio)
    if (fechaHoraFin) query = query.lte('fecha_y_hora_reservada', fechaHoraFin)

    const { data: reservas, error } = await query.select()

    if (error) {
        console.error('Error al actualizar reservas:', error)
        return { error: 'Error al actualizar reservas' }
    }

    // Procesar devoluciones y notificar por email
    
    await Promise.all(reservas.map(async (reserva) => {
        // Devolver el pago
        await devolverPago(reserva.id_reserva, reserva.tarifa_total);
        
        // Enviar email de cancelación
        await enviarEmailCancelacion({ idReserva: reserva.id_reserva }, 'La instalación no se encuentra disponible por motivos de fuerza mayor (suspensión o eliminación). Se ha procesado el reembolso de su pago.');
    }));

    return { success: true, reservas }
}

export async function confirmarAsistencia(id_reservaActual: number) {
    const supabaseAdmin = await createClientAdmin()

    const reservaActual = await getReservaDetalle(id_reservaActual)
    if (!reservaActual) {
        return { error: 'No se encontró la reserva' }
    }
    if (reservaActual.id_estado !== 1){
        return { error: 'La reserva no está vigente para confirmar' }
    }
    //¿Hay reservas pendientes?
    const {error: error2, data: reservaPendiente} = await getReservasPendientesDePago(reservaActual.id_usuario)
    if (error2) {
        return { error: 'Error al verificar reservas pendientes' }
    }
    if (reservaPendiente && reservaPendiente.length > 0) {
       return { success: true,
        message: `El usuario tiene una reserva pendiente de pago. Si no se regulariza el pago antes de confirmar la reserva, la reserva actual quedará como ausente.` }
       }
    else{
        const { data, error } = await supabaseAdmin
            .from('reservas')
            .update({ id_estado: 2 }) //2 = En curso
            .eq('id_reserva', id_reservaActual)
            .select()

        if (error) {
            console.error('Error al actualizar reservas:', error)
            return { error: 'Error al actualizar reservas' }
        }
    return { success: true, data }
    }
}


export async function completarPagoReserva(id_reserva: number) {
    const supabaseAdmin = await createClientAdmin()
    let montoAPagar = 0
    let mensajePago = ''
    const reserva = await getReservaDetalle(id_reserva)
    if (!reserva) {
        return { error: 'No se encontró la reserva' }
    }
    if (reserva.id_estado !== 4) {
        return { error: 'La reserva no está pendiente de pago' }
    }
    const infraccion = await getInfraccionDeuda(reserva.id_usuario)
    if (infraccion) {
        const monto = await calcularMontoDeuda(reserva.id_usuario)
        if (monto) {
            montoAPagar = monto.monto_total
            mensajePago = `Se le aplicó una infracción por deuda. Monto a pagar: $${montoAPagar}`
        }
    }
    else{
        const monto = await calcularMontoPagoNormal(id_reserva, reserva.tarifa_total)
        if (monto.error) {
            return { error: monto.error }
        }
        if (monto.monto_a_pagar) {
            montoAPagar = monto.monto_a_pagar
            mensajePago = `Pago realizado correctamente. Monto pagado: $${montoAPagar}`
        }   
    }
    const pago = await crearPago(id_reserva, montoAPagar)
    if (!pago.success) {
        return { error: 'Error al crear el pago' }
    }

    if (infraccion) {
        const desactivar = await desactivarInfraccionDeuda(reserva.id_usuario)
        if (desactivar.error) {
            return { error: 'Error al desactivar la infracción' }
        }
    }

    const { data, error } = await supabaseAdmin
        .from('reservas')
        .update({ id_estado: 3 }) //3 = Finalizada (Pagada)
        .eq('id_reserva', id_reserva)
        .select()

    // Enviar email pago completado
    if (!error) {
        await enviarEmailPagoCompletado({
            idReserva: reserva.id_reserva,
            monto: montoAPagar
        })
    }

    if (error) {
        console.error('Error al actualizar reservas:', error)
        return { error: 'Error al actualizar reservas' }
    }
    return { success: true, data, mensajePago }
}




export async function getReservasPendientesDePago(id_usuario?: string) {
    const supabase = await createClient()

    if (!id_usuario){
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { error: 'Error al obtener usuario' }
        }
        id_usuario = user.id
    }

    const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .eq('id_estado', 4) //4 = PendienteDePago
        .eq('id_usuario', id_usuario)
        
    if (error) {
        console.error('Error al obtener reservas:', error)
        return { error: 'Error al obtener reservas' }
    }
    return { success: true, data }
}





// Cancelar todas las reservas vigentes de un usuario (para eliminación de cuenta)
export async function cancelarReservasVigentes(id_usuario: string) {
    const supabaseAdmin = await createClientAdmin()

    // 1. Procesar Devoluciones de reservas VIGENTES (Estado 1)
    const { data: reservasVigentes } = await supabaseAdmin
        .from('reservas')
        .select('*')
        .eq('id_usuario', id_usuario)
        .eq('id_estado', 1)

    if (reservasVigentes && reservasVigentes.length > 0) {
        await Promise.all(reservasVigentes.map(async (reserva) => {
            const fechaReserva = new Date(reserva.fecha_y_hora_reservada)
            const ahora = new Date()
            const diffMs = fechaReserva.getTime() - ahora.getTime()
            const diffHoras = diffMs / (1000 * 60 * 60)

            // Solo devolvemos si cancela con anticipación suficiente
            if (diffHoras >= HORAS_MINIMAS_DEVOLUCION) {
                await devolverPago(reserva.id_reserva, reserva.tarifa_total)
            }
        }))
    }

    // 2. Cancelar masivamente todas las activas (1=Vigente, 2=EnCurso). 4=PendientePago se deja para deuda.
    const { error } = await supabaseAdmin
        .from('reservas')
        .update({ id_estado: 5, cancelo_cliente: false }) // 5 = Cancelada
        .eq('id_usuario', id_usuario)
        .in('id_estado', [1, 2])

    if (error) {
        console.error('Error al cancelar reservas vigentes del usuario:', error)
        return { error: 'Error al cancelar reservas vigentes' }
    }
    //No se envian emails porque se está eliminando la cuenta
    return { success: true }
}

export async function cancelacionesPorInfraccion(id_usuario: string) {
    // Reutilizamos cancelarReservasVigentes
    return await cancelarReservasVigentes(id_usuario)
}