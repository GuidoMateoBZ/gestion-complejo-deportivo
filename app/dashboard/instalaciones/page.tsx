import { getInstalaciones } from '@/lib/queries/instalaciones'
import { getDeportes } from '@/lib/queries/deportes'
import { InstalacionesList } from '@/components/instalaciones/instalaciones-list'

export default async function InstalacionesPage() {
    const [instalaciones, deportes] = await Promise.all([
        getInstalaciones(),
        getDeportes()
    ])

    return (
        <div>
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">
                    Instalaciones
                </h1>
                <p className="text-muted-foreground mt-1">
                    Seleccioná una instalación para ver disponibilidad y reservar
                </p>
            </header>

            <InstalacionesList instalaciones={instalaciones} deportes={deportes} />
        </div>
    )
}
