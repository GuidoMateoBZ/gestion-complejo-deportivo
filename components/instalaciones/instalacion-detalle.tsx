'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { InstalacionConDeporte, Deporte, Reserva, Suspension } from '@/types'
import { useDashboard } from '@/components/dashboard/dashboard-authcontext'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import { InstalacionFormDialog } from '@/components/instalaciones/instalacion-form-dialog'
import { NuevaReservaDialog } from '@/components/reservas/nueva-reserva-dialog'
import { ReservaDetalleDialog } from '@/components/reservas/reserva-detalle-dialog'
import { toast } from 'sonner'
import { obtenerReservasInstalacion } from '@/lib/actions/reservas'
import { SuspensionDialog } from '@/components/instalaciones/suspension-dialog'
import { HabilitarSuspensionDialog } from '@/components/instalaciones/habilitar-suspension-dialog'
import { EliminarInstalacionDialog } from '@/components/instalaciones/eliminar-instalacion-dialog'

// Iconos de MUI
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import DeleteIcon from '@mui/icons-material/Delete'
import BlockIcon from '@mui/icons-material/Block'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer'
import SportsBasketballIcon from '@mui/icons-material/SportsBasketball'
import SportsTennisIcon from '@mui/icons-material/SportsTennis'

interface Props {
    instalacion: InstalacionConDeporte
    deportes: Deporte[]
    suspensiones: Suspension[]
}

// Mapeo de deportes a iconos
const deporteIconos: Record<string, React.ComponentType<{ sx?: object }>> = {
    'fútbol': SportsSoccerIcon,
    'básquet': SportsBasketballIcon,
    'pádel': SportsTennisIcon,
}

// Generar horarios entre apertura y cierre
function generarHorarios(horaApertura: string, horaCierre: string): string[] {
    const horarios: string[] = []
    const [inicioHora] = horaApertura.split(':').map(Number)
    let [finHora] = horaCierre.split(':').map(Number)

    // Si la hora de cierre es 00:00 (medianoche), tratar como 24
    if (finHora === 0) {
        finHora = 24
    }

    for (let hora = inicioHora; hora < finHora; hora++) {
        horarios.push(`${hora.toString().padStart(2, '0')}:00`)
    }

    return horarios
}

// Formatear fecha para mostrar
function formatearFecha(fecha: Date): string {
    return fecha.toLocaleDateString('es-AR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
}

export function InstalacionDetalle({ instalacion, deportes, suspensiones = [] }: Props) {
    const router = useRouter()
    const { isAdmin, usuario } = useDashboard()
    const [fechaSeleccionada, setFechaSeleccionada] = useState<Date>(new Date())
    const [reservas, setReservas] = useState<Reserva[]>([])
    const [calendarOpen, setCalendarOpen] = useState(false)
    const [reservaSeleccionada, setReservaSeleccionada] = useState<{ fecha: Date, hora: number } | null>(null)
    const [selectedReservaId, setSelectedReservaId] = useState<number | null>(null)
    const [suspensionOpen, setSuspensionOpen] = useState(false)

    const deporte = instalacion.deporte?.nombre_deporte?.toLowerCase() || ''
    const IconoDeporte = deporteIconos[deporte] || SportsSoccerIcon

    const horarios = generarHorarios(
        instalacion.hora_apertura,
        instalacion.hora_cierre
    )

    // Efecto para cargar reservas cuando cambia la fecha o la instalación
    useEffect(() => {
        const cargarReservas = async () => {
            // Formatear fecha a YYYY-MM-DD para la query
            // Usamos local date components
            const y = fechaSeleccionada.getFullYear()
            const m = (fechaSeleccionada.getMonth() + 1).toString().padStart(2, '0')
            const d = fechaSeleccionada.getDate().toString().padStart(2, '0')
            const fechaStr = `${y}-${m}-${d}`

            const result = await obtenerReservasInstalacion(instalacion.id_instalacion, fechaStr)

            if (result.success && result.reservas) {
                setReservas(result.reservas)
            } else {
                setReservas([]) // O manejar error
            }
        }

        cargarReservas()
    }, [fechaSeleccionada, instalacion.id_instalacion])

    const handleSeleccionarFecha = (fecha: Date | undefined) => {
        if (fecha) {
            setFechaSeleccionada(fecha)
            setCalendarOpen(false)
            // No hacemos router.push, el useEffect se encargará de refrescar los datos
        }
    }

    const handleReserva = (horaStr: string) => {
        const hora = parseInt(horaStr.split(':')[0])
        setReservaSeleccionada({ fecha: fechaSeleccionada, hora })
    }

    return (
        <div className="space-y-6">
            {/* Header con botón volver */}
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="gap-2"
                >
                    <ArrowBackIcon sx={{ fontSize: 20 }} />
                    Volver
                </Button>

                {/* Botones de admin */}
                {isAdmin && (
                    <div className="flex gap-2">
                        <InstalacionFormDialog instalacion={instalacion} deportes={deportes} />

                        <EliminarInstalacionDialog idInstalacion={instalacion.id_instalacion.toString()} nombreInstalacion={instalacion.nombre_instalacion.toString()}>
                            <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive">
                                <DeleteIcon sx={{ fontSize: 18 }} />
                                Eliminar
                            </Button>
                        </EliminarInstalacionDialog>

                        <Button
                            variant="outline" size="sm" className="gap-2 hover:text-destructive"
                            onClick={() => setSuspensionOpen(true)}
                        >
                            <BlockIcon sx={{ fontSize: 18 }} />
                            Suspender Instalación
                        </Button>

                        <HabilitarSuspensionDialog
                            suspensiones={suspensiones}
                            idInstalacion={instalacion.id_instalacion.toString()}
                        >
                            <Button variant="outline" size="sm" className="gap-2 hover:text-green-400">
                                <CheckCircleIcon sx={{ fontSize: 18 }} />
                                Habilitar Suspensión
                            </Button>
                        </HabilitarSuspensionDialog>
                    </div>
                )}
            </div>

            {/* Info de la instalación */}
            <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-start gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <IconoDeporte sx={{ fontSize: 40 }} />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-foreground">
                            {instalacion.nombre_instalacion}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            {instalacion.deporte?.nombre_deporte}
                        </p>
                        {instalacion.descripcion && (
                            <p className="text-muted-foreground mt-2">
                                {instalacion.descripcion}
                            </p>
                        )}
                        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <AccessTimeIcon sx={{ fontSize: 16 }} />
                                <span>
                                    {instalacion.hora_apertura?.slice(0, 5)} - {instalacion.hora_cierre?.slice(0, 5)}
                                </span>
                            </div>
                            <div>
                                <span className="font-medium text-foreground">
                                    ${instalacion.tarifa_hora}
                                </span>
                                <span> / hora</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Selector de fecha */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">
                        Horarios disponibles
                    </h2>
                    <p className="text-muted-foreground capitalize">
                        {formatearFecha(fechaSeleccionada)}
                    </p>
                </div>

                <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="gap-2">
                            <CalendarTodayIcon sx={{ fontSize: 18 }} />
                            Cambiar fecha
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Seleccionar fecha</DialogTitle>
                        </DialogHeader>
                        <div className="flex justify-center py-4">
                            <Calendar
                                mode="single"
                                selected={fechaSeleccionada}
                                onSelect={handleSeleccionarFecha}
                                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                initialFocus
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Grid de horarios */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {horarios.map((horario) => {

                    const esHoy = fechaSeleccionada.toDateString() === new Date().toDateString()
                    const horaActual = new Date().getHours()
                    const horaSlot = parseInt(horario.split(':')[0])
                    const pasado = esHoy && horaSlot <= horaActual

                    // Construir fecha del Slot en hora Argentina
                    const year = fechaSeleccionada.getFullYear()
                    const month = (fechaSeleccionada.getMonth() + 1).toString().padStart(2, '0')
                    const day = fechaSeleccionada.getDate().toString().padStart(2, '0')
                    const slotISO = `${year}-${month}-${day}T${horario}:00-03:00`
                    const slotTime = new Date(slotISO).getTime()

                    // Chequear suspensión
                    const suspendido = suspensiones.some((s) => {
                        // Ignorar suspensiones desactivadas
                        if ((s as any).activa === false) return false

                        const inicio = new Date(s.fecha_y_hora_inicio).getTime()
                        // Si es null, asumimos suspensión indefinida o muy larga
                        const fin = s.fecha_y_hora_fin ? new Date(s.fecha_y_hora_fin).getTime() : 32503680000000 // Año 3000
                        return slotTime >= inicio && slotTime < fin
                    })

                    const reservaOcupada = reservas.find((reserva) => {
                        if (reserva.id_estado === 5) return false
                        const reservaTime = new Date(reserva.fecha_y_hora_reservada).getTime()
                        return Math.abs(reservaTime - slotTime) < 1000
                    })
                    const ocupado = !!reservaOcupada

                    const puedeVerDetalle = ocupado && (isAdmin || reservaOcupada?.id_usuario === usuario?.id_usuario)

                    // Deshabilitado si: Pasado O Suspendido O (Ocupado Y NO puede ver detalle)
                    const deshabilitado = pasado || suspendido || (ocupado && !puedeVerDetalle)

                    // Estilo diferenciado
                    const claseBase = "h-14 transition-all relative overflow-hidden"
                    let claseExtra = ""

                    if (pasado) claseExtra = "opacity-50 cursor-not-allowed bg-muted"
                    else if (suspendido) claseExtra = "bg-destructive/10 text-destructive border-destructive/20 cursor-not-allowed"
                    else if (ocupado) {
                        if (puedeVerDetalle) {
                            claseExtra = "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                        } else {
                            claseExtra = "opacity-40 cursor-not-allowed bg-muted" // Ocupado ajeno
                        }
                    }
                    else claseExtra = "hover:bg-primary hover:text-primary-foreground" // Disponible

                    return (
                        <Button
                            key={horario}
                            variant={ocupado ? "secondary" : "outline"}
                            className={`${claseBase} ${claseExtra}`}
                            disabled={deshabilitado}
                            onClick={() => {
                                if (ocupado && puedeVerDetalle) {
                                    setSelectedReservaId(reservaOcupada?.id_reserva)
                                } else if (!deshabilitado) {
                                    handleReserva(horario)
                                }
                            }}
                        >
                            <div className="text-center w-full">
                                <div className="font-medium text-xs sm:text-sm">{horario}</div>
                                <div className="text-[10px] sm:text-xs opacity-70 truncate px-1">
                                    {pasado ? 'Pasado' : suspendido ? 'Suspendido' : ocupado ? (puedeVerDetalle ? 'Mi Reserva' : 'Ocupado') : 'Disponible'}
                                </div>
                            </div>
                        </Button>
                    )
                })}
            </div>
            {/* Dialog de Reserva */}
            {reservaSeleccionada && (
                <NuevaReservaDialog
                    instalacion={instalacion}
                    fecha={reservaSeleccionada.fecha}
                    hora={reservaSeleccionada.hora}
                    open={!!reservaSeleccionada}
                    onOpenChange={(open) => !open && setReservaSeleccionada(null)}
                    onSuccess={() => {
                        setFechaSeleccionada(new Date(fechaSeleccionada)) // Clonar para disparar efecto
                    }}
                    isAdmin={isAdmin}
                />
            )}

            {/* Dialog de Suspensión */}
            {suspensionOpen && (
                <SuspensionDialog
                    instalacion={instalacion}
                    open={suspensionOpen}
                    onOpenChange={setSuspensionOpen}
                    onSuccess={() => {
                        setSuspensionOpen(false)
                        // Disparar recarga de reservas
                        setFechaSeleccionada(new Date(fechaSeleccionada))
                    }}
                />
            )}

            <ReservaDetalleDialog
                idReserva={selectedReservaId}
                open={!!selectedReservaId}
                onOpenChange={(open) => !open && setSelectedReservaId(null)}
                isAdmin={isAdmin}
                currentUserId={usuario?.id_usuario}
                onSuccess={() => {
                    setFechaSeleccionada(new Date(fechaSeleccionada)) // Recargar reservas
                }}
            />
        </div>
    )
}
