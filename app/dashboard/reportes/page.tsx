import { FiltrosReporte, getDatosReportes, getDeportesParaFiltro } from "@/lib/queries/reportes"
import { IngresosChart } from "@/components/reportes/ingresos-chart"
import { OcupacionChart } from "@/components/reportes/ocupacion-chart"
import { ReportesFiltro } from "@/components/reportes/reportes-filtro"
import { startOfMonth, endOfMonth, parseISO } from "date-fns"
import { Suspense } from "react"
import { Loader2 } from "lucide-react"

export const dynamic = 'force-dynamic'

interface PageProps {
    searchParams: Promise<{
        fechaInicio?: string
        fechaFin?: string
        deporteId?: string
    }>
}

export default async function ReportesPage({ searchParams }: PageProps) {
    const params = await searchParams

    // Default dates if not provided
    const now = new Date()
    const defaultStart = startOfMonth(now)
    const defaultEnd = endOfMonth(now)

    const fechaInicio = params.fechaInicio ? parseISO(params.fechaInicio) : defaultStart
    const fechaFin = params.fechaFin ? parseISO(params.fechaFin) : defaultEnd
    const deporteId = params.deporteId && params.deporteId !== 'todos' ? params.deporteId : undefined

    const filtros: FiltrosReporte = {
        fechaInicio,
        fechaFin,
        id_deporte: deporteId
    }

    // Parallel fetching
    const [reportesData, deportes] = await Promise.all([
        getDatosReportes(filtros),
        getDeportesParaFiltro()
    ])

    // Extraemos nombres de deportes para las series del gráfico
    const nombresDeportes = deportes.map(d => d.nombre_deporte)

    // Si hay un filtro de deporte aplicado, mostramos solo ese deporte en el gráfico
    // para que se vea con su color específico. Si no, mostramos todos (total violeta).
    let deportesChart = nombresDeportes;
    if (deporteId) {
        const d = deportes.find(dep => String(dep.id_deporte) === String(deporteId))
        if (d) {
            deportesChart = [d.nombre_deporte]
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
                <p className="text-muted-foreground">Análisis de ingresos y ocupación del complejo.</p>
            </div>

            <ReportesFiltro deportes={deportes} />

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                <Suspense fallback={<div className="flex h-[350px] items-center justify-center border rounded-lg"><Loader2 className="animate-spin" /></div>}>
                    <IngresosChart
                        data={reportesData.ingresos}
                        deportes={deportesChart}
                        descripcion={`Ingresos entre ${fechaInicio.toLocaleDateString()} y ${fechaFin.toLocaleDateString()}`}
                    />
                </Suspense>

                <Suspense fallback={<div className="flex h-[350px] items-center justify-center border rounded-lg"><Loader2 className="animate-spin" /></div>}>
                    <OcupacionChart
                        data={reportesData.ocupacion}
                        deportes={deportesChart}
                        descripcion={`Horas reservadas entre ${fechaInicio.toLocaleDateString()} y ${fechaFin.toLocaleDateString()}`}
                    />
                </Suspense>
            </div>
        </div>
    )
}
