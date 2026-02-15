'use server'
import { createClient } from "@/lib/supabase/server"
import { enviarEmailEliminacion } from "./emails"
import { getInfraccionDeuda, getInfraccionCancelaciones, getInfraccionesUsuario } from '@/lib/queries/infracciones';
import { calcularMontoDeuda } from '@/lib/actions/infracciones';
import { obtenerUsuario } from '@/lib/queries/usuarios';
import { createClientAdmin } from "@/lib/supabase/server"
import { cancelarReservasVigentes, getReservasPendientesDePago } from "./reservas";


export interface perfilUsuarioData {
    id_usuario: string
    nombre: string
    email: string
}

export async function modificarPerfil(data: perfilUsuarioData) {
    const supabaseAdmin = await createClientAdmin()

    // 1. Actualizar Auth User
    const { error: errorAuth } = await supabaseAdmin.auth.admin.updateUserById(
        data.id_usuario,
        { 
            email: data.email,
            email_confirm: true,
        }
    )

    if (errorAuth) {
        console.error('Error al actualizar auth user:', errorAuth)
        return { error: 'Error al actualizar las credenciales del usuario' }
    }

    // 2. Actualizar Public User
    const { error } = await supabaseAdmin
        .from('usuarios')
        .update({ nombre_usuario: data.nombre, email_usuario: data.email })
        .eq('id_usuario', data.id_usuario)

    if (error) {
        console.error('Error al actualizar usuario publico:', error)
        return { error: 'Error al actualizar los datos del usuario' }
    }

    return { success: true }
}

export async function eliminarUsuario(id_usuario: string, confirmarForzoso: boolean = false) {
    const supabaseAdmin = await createClientAdmin()
    const supabase = await createClient()

    // 1. Obtener quién está ejecutando la acción
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return { error: 'No autorizado' }

    // Consultar rol del ejecutor
    const { data: ejecutorData } = await supabaseAdmin
        .from('usuarios')
        .select('rol')
        .eq('id_usuario', currentUser.id)
        .single()
    
    const esAdmin = ejecutorData?.rol === 'administrador'

    // 2. Verificar datos para alertas y bloqueos
    const infracciones = await getInfraccionesUsuario(id_usuario)
    const tieneInfracciones = infracciones.data && infracciones.data.length > 0

    const reservasPendientes = await getReservasPendientesDePago(id_usuario)
    const tieneDeudas = reservasPendientes.data && reservasPendientes.data.length > 0

    // Si NO es admin, es bloqueante
    if (!esAdmin) {
        if (tieneInfracciones) {
            return { error: 'No puedes eliminar tu cuenta con infracciones pendientes. Contacta a la administración.' }
        }
        if (tieneDeudas) {
            return { error: 'No puedes eliminar tu cuenta con reservas pendientes de pago. Contacta a la administración.' }
        }   
    } 
    
    // Si ES admin, verificamos advertencias (si no viene ya confirmado)
    if (esAdmin && !confirmarForzoso) {
        if (tieneInfracciones || tieneDeudas) {
            const motivos = []
            if (tieneInfracciones) motivos.push('infracciones activas')
            if (tieneDeudas) motivos.push('reservas impagas')
            
            return { 
                requiereConfirmacion: true, 
                mensaje: `El usuario tiene ${motivos.join(' y ')}. ¿Deseas eliminarlo de todas formas? Se cancelarán sus reservas vigentes.` 
            }
        }
    }

    // 3. Cancelar reservas vigentes, en curso, pendientes de pago
    const cancelRes = await cancelarReservasVigentes(id_usuario)
    if (cancelRes.error) {
        return { error: 'Error al cancelar las reservas activas del usuario.' }
    }

    // 4. Soft delete
    const { error } = await supabaseAdmin
        .from('usuarios')
        .update({ activo: false}) 
        .eq('id_usuario', id_usuario)

    if (error) {
        console.error('Error al eliminar usuario:', error)
        return { error: 'Error al eliminar el usuario' }
    }

    // 5. Banear usuario
    const { error: errorBan } = await supabaseAdmin.auth.admin.updateUserById(
        id_usuario,
        { ban_duration: '876600h' } 
    )

    if (errorBan) {
        console.error('Error al banear usuario auth:', errorBan)
    }

    // Enviamos email
    await enviarEmailEliminacion({ idUsuario: id_usuario })

    return { success: true }
}


export async function habilitarUsuario(id_usuario: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('usuarios')
        .update({ habilitado: true })
        .eq('id_usuario', id_usuario)

    if (error) {
        console.error('Error al habilitar usuario:', error)
        return { error: 'Error al habilitar el usuario' }
    }

    return { success: true }
}




export async function buscarUsuarioDniAction(dni: string) {
    const usuario = await obtenerUsuario({ dni })
    if (!usuario) return { error: 'Usuario no encontrado' }
    return { success: true, usuario }
}

export async function getDetalleUsuario(id_usuario: string) {
    const [infraccionDeudaResult, infraccionCancelResult] = await Promise.all([
        getInfraccionDeuda(id_usuario),
        getInfraccionCancelaciones(id_usuario)
    ])
    
    const infraccionDeuda = infraccionDeudaResult.success ? infraccionDeudaResult.data : null;
    let montoDeudaCalculado: number | null = null;
    
    if (infraccionDeuda) {
        const calc = await calcularMontoDeuda(id_usuario);
        if (calc.success && calc.monto_total) montoDeudaCalculado = calc.monto_total;
    }

    return {
        infraccionDeuda: infraccionDeuda,
        infraccionCancelacion: infraccionCancelResult.success ? infraccionCancelResult.data : null,
        montoDeudaCalculado
    }
}