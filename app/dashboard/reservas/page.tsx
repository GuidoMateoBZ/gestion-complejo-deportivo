import { getReservas } from '@/lib/queries/reservas'
import { getInstalaciones } from '@/lib/queries/instalaciones'
import { ReservasFiltros } from '@/components/reservas/reservas-filtros'
import { ReservasTable } from '@/components/reservas/reservas-table'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function Page({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    // 0. Detectar defaults para Admin (Si no hay params)
    const resolvedSearchParams = await searchParams
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let isAdmin = false
    if (user) {
        // Asumimos tabla usuarios para el rol, si falla, isAdmin es false y no afecta lógica crítica
        const { data: dbUser } = await supabase
            .from('usuarios')
            .select('rol')
            .eq('id_usuario', user.id)
            .single()
        isAdmin = dbUser?.rol === 'administrador'
    }

    // Calculamos fecha de hoy en Argentina YYYY-MM-DD
    const now = new Date()
    const argTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }))
    const year = argTime.getFullYear()
    const month = String(argTime.getMonth() + 1).padStart(2, '0')
    const day = String(argTime.getDate()).padStart(2, '0')
    const hoyArg = `${year}-${month}-${day}`

    // Lógica de Defaults: Si es admin y el param está undefined, usar default.
    const paramFecha = typeof resolvedSearchParams.fecha === 'string' ? resolvedSearchParams.fecha : undefined
    const paramEstado = typeof resolvedSearchParams.id_estado === 'string' ? resolvedSearchParams.id_estado : undefined
    const paramInstalacion = typeof resolvedSearchParams.id_instalacion === 'string' ? resolvedSearchParams.id_instalacion : undefined

    // Si es admin y no se especificó nada en absoluto (ni fecha, ni estado), aplicamos defaults
    // Solo aplicar defaults si es la PRIMERA carga (no hay ningun param).

    const fecha = paramFecha ?? (isAdmin ? hoyArg : undefined)
    const id_estado = paramEstado ?? (isAdmin ? '1' : undefined)
    const id_instalacion = paramInstalacion

    // 1. Traer datos en paralelo (Server Side uses computed filters)
    const [reservas, instalaciones] = await Promise.all([
        getReservas({ fecha, id_instalacion, id_estado }),
        getInstalaciones()
    ])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Reservas</h1>
                <p className="text-muted-foreground">
                    Historial y administración de reservas del complejo.
                </p>
            </div>

            <ReservasFiltros
                instalaciones={instalaciones}
                defaultFecha={fecha}
                defaultEstado={id_estado}
                defaultInstalacion={id_instalacion}
            />

            <ReservasTable reservas={reservas} isAdmin={isAdmin} />
        </div>
    )
}
