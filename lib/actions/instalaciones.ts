'use server'
// Nota: El RLS se encarga de verificar que el usuario sea admin, además de verificarse en dashboard-authcontext
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cancelarReservaInstalacion } from './reservas'

export interface NuevaInstalacionData {
    nombre_instalacion: string
    id_deporte: number
    descripcion: string
    hora_apertura: string
    hora_cierre: string
    tarifa_hora: number
}

export async function crearInstalacion(data: NuevaInstalacionData) {
    const supabase = await createClient()

    // Validaciones de datos
    if (!data.nombre_instalacion?.trim()) {
        return { error: 'El nombre es requerido' }
    }

    if (!data.id_deporte) {
        return { error: 'El deporte es requerido' }
    }

    if (!data.hora_apertura || !data.hora_cierre) {
        return { error: 'Los horarios son requeridos' }
    }

    if (data.tarifa_hora <= 0) {
        return { error: 'La tarifa debe ser mayor a 0' }
    }

    // Verificar que el nombre no exista
    const { data: existente } = await supabase
        .from('instalaciones')
        .select('id_instalacion')
        .ilike('nombre_instalacion', data.nombre_instalacion.trim())
        .maybeSingle()

    if (existente) {
        return { error: 'Ya existe una instalación con ese nombre' }
    }

    // Crear la instalación
    const { error } = await supabase
        .from('instalaciones')
        .insert({
            nombre_instalacion: data.nombre_instalacion.trim(),
            id_deporte: data.id_deporte,
            descripcion: data.descripcion?.trim() || '',
            hora_apertura: data.hora_apertura,
            hora_cierre: data.hora_cierre,
            tarifa_hora: data.tarifa_hora
        })

    if (error) {
        console.error('Error al crear instalación:', error)
        // Si el RLS bloquea, el error será de permisos
        if (error.code === '42501') {
            return { error: 'No tenés permisos para crear instalaciones' }
        }
        return { error: 'Error al crear la instalación' }
    }

    revalidatePath('/dashboard/instalaciones')
    return { success: true }
}

export interface ModificarInstalacionData extends NuevaInstalacionData {
    id_instalacion: string
}

export async function modificarInstalacion(data: ModificarInstalacionData) {
    const supabase = await createClient()
    // Validaciones de datos
    if (!data.id_instalacion) {
        return { error: 'ID de instalación requerido' }
    }

    if (!data.nombre_instalacion?.trim()) {
        return { error: 'El nombre es requerido' }
    }

    if (!data.id_deporte) {
        return { error: 'El deporte es requerido' }
    }

    if (!data.hora_apertura || !data.hora_cierre) {
        return { error: 'Los horarios son requeridos' }
    }

    if (data.tarifa_hora <= 0) {
        return { error: 'La tarifa debe ser mayor a 0' }
    }

    // Verificar que el nombre no exista (excepto la misma instalación)
    const { data: existente } = await supabase
        .from('instalaciones')
        .select('id_instalacion')
        .ilike('nombre_instalacion', data.nombre_instalacion.trim())
        .neq('id_instalacion', data.id_instalacion)
        .maybeSingle()

    if (existente) {
        return { error: 'Ya existe otra instalación con ese nombre' }
    }

    // Modificar la instalación
    const { error } = await supabase
        .from('instalaciones')
        .update({
            nombre_instalacion: data.nombre_instalacion.trim(),
            id_deporte: data.id_deporte,
            descripcion: data.descripcion?.trim() || '',
            hora_apertura: data.hora_apertura,
            hora_cierre: data.hora_cierre,
            tarifa_hora: data.tarifa_hora
        })
        .eq('id_instalacion', data.id_instalacion)

    if (error) {
        console.error('Error al modificar instalación:', error)
        if (error.code === '42501') {
            return { error: 'No tenés permisos para modificar instalaciones' }
        }
        return { error: 'Error al modificar la instalación' }
    }

    revalidatePath('/dashboard/instalaciones')
    revalidatePath(`/dashboard/instalaciones/${data.id_instalacion}`)
    return { success: true }
}

export async function actualizarTarifaDeporte(id_deporte: number, tarifa_hora: number) {
    const supabase = await createClient()

    if (!id_deporte || tarifa_hora <= 0) {
        return { error: 'Datos inválidos' }
    }

    // Actualizar todas las instalaciones del deporte
    const { error } = await supabase
        .from('instalaciones')
        .update({ tarifa_hora })
        .eq('id_deporte', id_deporte)

    if (error) {
        console.error('Error al actualizar tarifas:', error)
        if (error.code === '42501') {
            return { error: 'No tenés permisos para modificar instalaciones' }
        }
        return { error: 'Error al actualizar las tarifas' }
    }

    revalidatePath('/dashboard/instalaciones')
    return { success: true }
}

export async function suspenderInstalacion(id_instalacion: string, fecha_y_hora_inicio: string, fecha_y_hora_fin: string) {
    const supabase = await createClient()

    if (!id_instalacion || !fecha_y_hora_inicio || !fecha_y_hora_fin) {
        return { error: 'Datos inválidos' }
    }

    const { error } = await supabase
        .from('suspensiones')
        .insert({ id_instalacion, fecha_y_hora_inicio, fecha_y_hora_fin })

    if (error) {
        console.error('Error al suspender instalación:', error)
        if (error.code === '42501') {
            return { error: 'No tenés permisos para suspender instalaciones' }
        }
        return { error: 'Error al suspender la instalación' }
    }

    cancelarReservaInstalacion(id_instalacion, fecha_y_hora_inicio, fecha_y_hora_fin)

    revalidatePath('/dashboard/instalaciones')
    revalidatePath(`/dashboard/instalaciones/${id_instalacion}`)
    return { success: true }
}

export async function habilitarSuspension(idSuspension: string, idInstalacion: string) {
    const supabase = await createClient()

    if (!idSuspension) {
        return { error: 'ID de suspensión requerido' }
    }

    const { error } = await supabase
        .from('suspensiones')
        .update({ activa: false })
        .eq('id_suspension', idSuspension)

    if (error) {
        console.error('Error al habilitar instalación:', error)
        if (error.code === '42501') {
            return { error: 'No tenés permisos para habilitar instalaciones' }
        }
        return { error: 'Error al habilitar la instalación' }
    }

    revalidatePath('/dashboard/instalaciones')
    revalidatePath(`/dashboard/instalaciones/${idInstalacion}`)
    return { success: true }
}

export async function eliminarInstalacion(id_instalacion: string) {
    const supabase = await createClient()

    if (!id_instalacion) {
        return { error: 'ID de instalación requerido' }
    }

    const { error: errorReservas } = await cancelarReservaInstalacion(id_instalacion);
    if (errorReservas) {
        console.error('Error al cancelar reservas:', errorReservas)
        return { error: 'Error al cancelar las reservas' }
    }

    const { error } = await supabase
        .from('instalaciones')
        .update({ activa: false })
        .eq('id_instalacion', id_instalacion)

    if (error) {
        console.error('Error al eliminar instalación:', error)
        if (error.code === '42501') {
            return { error: 'No tenés permisos para eliminar instalaciones' }
        }
        return { error: 'Error al eliminar la instalación' }
    }

    revalidatePath('/dashboard/instalaciones')
    return { success: true }
}