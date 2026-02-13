import { obtenerUsuarios } from '@/lib/queries/usuarios'
import { UsuariosTable } from '@/components/usuarios/usuarios-table'

export default async function UsuariosPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; dni?: string; estado?: string }>
}) {
    const { q, dni, estado } = await searchParams

    const usuarios = await obtenerUsuarios({
        search: q,
        dni: dni,
        estado: estado,
    })

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
            </div>

            <UsuariosTable usuarios={usuarios} searchParams={{ q, dni, estado }} />
        </div>
    )
}
