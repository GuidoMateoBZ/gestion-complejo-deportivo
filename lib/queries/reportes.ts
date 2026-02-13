
import { createClient } from "../supabase/server"
import { eachDayOfInterval, format } from "date-fns"
import { es } from "date-fns/locale"

export interface FiltrosReporte {
    fechaInicio: Date
    fechaFin: Date
    id_deporte?: string
}

export type DatosGrafico = {
    fecha: string
    [key: string]: number | string
}

export async function getDatosReportes(filtros: FiltrosReporte) {
    const supabase = await createClient()

    // Validación básica de rango de fechas para evitar errores en eachDayOfInterval
    if (filtros.fechaInicio > filtros.fechaFin) {
        return { ingresos: [], ocupacion: [] }
    }
    
    // Convertir fechas a strings para postgrest
    const inicioStr = filtros.fechaInicio.toISOString()
    const finStr = filtros.fechaFin.toISOString()

    // 1. Obtener Ingresos
    // Consultamos Pagos -> Reserva -> Instalacion -> Deporte
    // NOTA: Supabase JS no soporta nested filters profundos tan facilmente en una linea.
    // Traeremos los datos crudos necesarios y filtraremos en JS si es necesario el ID deporte.
    
    let queryIngresos = supabase
        .from('pagos')
        .select(`
            monto_pago,
            fecha_y_hora_pago,
            reserva:reservas!inner (
                instalacion:instalaciones!inner (
                    id_deporte,
                    nombre_instalacion,
                    deporte:deportes!inner (
                        nombre_deporte
                    )
                )
            )
        `)
        .gte('fecha_y_hora_pago', inicioStr)
        .lte('fecha_y_hora_pago', finStr)

    const { data: pagos, error: errorPagos } = await queryIngresos

    if (errorPagos) {
        console.error("Error al obtener ingresos:", errorPagos)
        return { ingresos: [], ocupacion: [] }
    }

    // 2. Obtener Reservas (Ocupación)
    // Reservas confirmadas/pagadas/en curso
    let queryOcupacion = supabase
        .from('reservas')
        .select(`
            fecha_y_hora_reservada,
            instalacion:instalaciones!inner (
                id_deporte,
                nombre_instalacion,
                deporte:deportes!inner (
                    nombre_deporte
                )
            )
        `)
        .gte('fecha_y_hora_reservada', inicioStr)
        .lte('fecha_y_hora_reservada', finStr)
        .in('id_estado', [1, 2, 3, 4]) // Vigente, EnCurso, Finalizada, PendientePago

    const { data: reservas, error: errorReservas } = await queryOcupacion

    if (errorReservas) {
        console.error("Error al obtener ocupación:", errorReservas)
        return { ingresos: [], ocupacion: [] }
    }

    // FILTRADO POR DEPORTE (si aplica)
    const pagosFiltrados = filtros.id_deporte 
        // @ts-ignore: Tipado complejo de Supabase response
        ? pagos.filter(p => p.reserva.instalacion.id_deporte.toString() === filtros.id_deporte)
        : pagos

    const reservasFiltradas = filtros.id_deporte
        // @ts-ignore: Tipado complejo
        ? reservas.filter(r => r.instalacion.id_deporte.toString() === filtros.id_deporte)
        : reservas


    // PROCESAMIENTO DE DATOS PARA GRÁFICOS
    // Generamos array base de fechas
    const diasIntervalo = eachDayOfInterval({
        start: filtros.fechaInicio,
        end: filtros.fechaFin
    })

    // --- GRÁFICO DE INGRESOS ---
    // Agrupar por Deporte y Fecha
    // Estructura deseada: [{ fecha: "01 Feb", Futbol: 1000, Tenis: 500 }, ...]
    
    const datosIngresos: DatosGrafico[] = diasIntervalo.map(dia => {
        const fechaKey = format(dia, 'yyyy-MM-dd')
        const fechaLabel = format(dia, 'd MMM', { locale: es })
        
        const entry: DatosGrafico = {
            fecha: fechaLabel,
            rawDate: fechaKey // Para ordenamiento interno si hiciese falta
        }

        // Inicializar deportes en 0
        // (Deberíamos saber todos los deportes posibles, o solo los que aparecen. Usamos set de los filtrados)
        const deportesEnRango = new Set<string>()

        // @ts-ignore: Tipado complejo de join
        pagosFiltrados.forEach(p => deportesEnRango.add(p.reserva.instalacion.deporte.nombre_deporte))
        // @ts-ignore: Tipado complejo de join
        reservasFiltradas.forEach(r => deportesEnRango.add(r.instalacion.deporte.nombre_deporte))
        
        deportesEnRango.forEach(dep => { entry[dep] = 0 })

        // Sumar montos
        pagosFiltrados.forEach(pago => {
            // @ts-ignore
            const fechaPago = pago.fecha_y_hora_pago.split('T')[0]
            if (fechaPago === fechaKey) {
                // @ts-ignore
                const deporte = pago.reserva.instalacion.deporte.nombre_deporte
                // @ts-ignore
                entry[deporte] = (entry[deporte] as number || 0) + pago.monto_pago
            }
        })
        
        // Sumar Total General si se quiere
        // @ts-ignore
        entry['Total'] = Object.values(entry).filter(v => typeof v === 'number').reduce((a, b) => (a as number) + (b as number), 0)

        return entry
    })


    // --- GRÁFICO DE OCUPACIÓN ---
    // Estructura: [{ fecha: "01 Feb", Futbol: 5 (horas), Tenis: 2 (horas) }]
    // Asumimos 1 reserva = 1 hora de ocupación (si no hay duración en BD)

    const datosOcupacion: DatosGrafico[] = diasIntervalo.map(dia => {
        const fechaKey = format(dia, 'yyyy-MM-dd')
        const fechaLabel = format(dia, 'd MMM', { locale: es })
        
        const entry: DatosGrafico = {
            fecha: fechaLabel,
            rawDate: fechaKey
        }

        // @ts-ignore
        const deportesEnRango = new Set<string>()
        // @ts-ignore: Tipado complejo
        reservasFiltradas.forEach(r => deportesEnRango.add(r.instalacion.deporte.nombre_deporte))
        deportesEnRango.forEach(dep => { entry[dep] = 0 })

        reservasFiltradas.forEach(reserva => {
            // @ts-ignore
            const fechaRes = reserva.fecha_y_hora_reservada.split('T')[0]
            if (fechaRes === fechaKey) {
                // @ts-ignore
                const deporte = reserva.instalacion.deporte.nombre_deporte
                // @ts-ignore
                entry[deporte] = (entry[deporte] as number || 0) + 1 // 1 hora
            }
        })

        return entry
    })

    return {
        ingresos: datosIngresos,
        ocupacion: datosOcupacion
    }
}

export async function getDeportesParaFiltro() {
    const supabase = await createClient()
    const { data } = await supabase.from('deportes').select('*')
    return data || []
}
