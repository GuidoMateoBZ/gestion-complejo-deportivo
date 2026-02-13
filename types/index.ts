/**
 * TIPOS TYPESCRIPT PARA LA BASE DE DATOS
 * 
 * Este archivo contiene las interfaces/types que representan
 * las entidades de la base de datos en Supabase.
 * 
 * ¿Para qué sirve?
 * ================
 * 1. AUTOCOMPLETADO: El IDE sugiere propiedades al escribir
 * 2. DETECCIÓN DE ERRORES: TypeScript avisa si se usa mal un campo
 * 3. DOCUMENTACIÓN: Los tipos sirven como documentación viva del modelo
 * 4. REFACTORING SEGURO: Si se cambia algo, TypeScript marca todos los lugares afectados
 *
*/

// ============================================
// USUARIOS
// ============================================
export type RolUsuario = 'administrador' | 'cliente'

export interface Usuario {
    id_usuario: string
    dni_usuario: number
    nombre_usuario: string | null
    email_usuario: string | null
    rol: RolUsuario | null
    habilitado: boolean
}

// ============================================
// DEPORTES
// ============================================
export interface Deporte {
    id_deporte: number
    nombre_deporte: string
}

// ============================================
// INSTALACIONES
// ============================================
export interface Instalacion {
    id_instalacion: string
    id_deporte: number
    nombre_instalacion: string
    descripcion: string | null
    hora_apertura: string  // formato "HH:MM:SS"
    hora_cierre: string    // formato "HH:MM:SS"
    tarifa_hora: number
}

// Con relación al deporte (para queries con join)
export interface InstalacionConDeporte extends Instalacion {
    deporte: Deporte
}

// ============================================
// ESTADOS DE RESERVA
// ============================================
export type EstadoReservaId = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type EstadoReservaNombre =
    | 'Temporal'         // 0 - Reserva iniciada, no confirmada
    | 'Vigente'          // 1 - Reserva confirmada
    | 'EnCurso'          // 2 - Reserva en progreso
    | 'Finalizada'       // 3 - Reserva completada y pagada
    | 'PendienteDePago'  // 4 - Reserva completada, falta pago
    | 'Cancelada'        // 5 - Reserva cancelada
    | 'Ausente'          // 6 - Cliente no se presentó

export interface TipoEstadoReserva {
    id_estado: EstadoReservaId
    nombre_estado: EstadoReservaNombre
}

// ============================================
// RESERVAS
// ============================================
export interface Reserva {
    id_reserva: number
    id_usuario: string
    id_instalacion: string
    id_estado: EstadoReservaId
    fecha_y_hora_reservada: string  // ISO timestamp (inicio del turno)
    tarifa_total: number
    asistencia: boolean
    cancelo_cliente: boolean
}

// Con relaciones (para queries con join)
export interface ReservaCompleta extends Reserva {
    usuario: Usuario
    instalacion: InstalacionConDeporte
    estado: TipoEstadoReserva
}

// ============================================
// PAGOS
// ============================================
export interface Pago {
    id_pago: string
    id_reserva: number
    monto_pago: number
    fecha_y_hora_pago: string  // ISO timestamp
}

// ============================================
// TIPOS DE INFRACCIÓN
// ============================================
export type TipoInfraccionId = 1 | 2

export interface TipoInfraccion {
    id_tipo_infraccion: TipoInfraccionId
    nombre_tipo_infraccion: 'Deuda' | 'Inhabilitado'
    descripcion_tipo_infraccion: string | null
}

// ============================================
// INFRACCIONES
// ============================================
export interface Infraccion {
    id_infraccion: number
    id_usuario: string
    id_tipo_infraccion: TipoInfraccionId
    fecha_inicial: string  // ISO timestamp
    fecha_final: string | null
    monto_inicial: number | null
    activa: boolean
}

export interface InfraccionConTipo extends Infraccion {
    tipo_infraccion: TipoInfraccion
}

// ============================================
// SUSPENSIONES
// ============================================
export interface Suspension {
    id_suspension: number
    id_instalacion: string
    fecha_y_hora_inicio: string  // ISO timestamp
    fecha_y_hora_fin: string | null
}

export interface SuspensionConInstalacion extends Suspension {
    instalacion: Instalacion
}

// ============================================
// TIPOS AUXILIARES PARA FORMULARIOS
// ============================================
export interface NuevaReservaInput {
    id_instalacion: string
    fecha_y_hora_inicio: string
    fecha_y_hora_fin: string
}

export interface NuevoUsuarioInput {
    email: string
    password: string
    nombre: string
    dni: string
}
