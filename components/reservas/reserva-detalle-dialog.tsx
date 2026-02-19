'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getReservaDetalleAction, cancelarReserva, confirmarAsistencia } from '@/lib/actions/reservas'
import { Loader2, Calendar, Clock, MapPin, User, ChevronRight, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Props {
    idReserva: number | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
    isAdmin?: boolean
    currentUserId?: string
}

export function ReservaDetalleDialog({ idReserva, open, onOpenChange, onSuccess, isAdmin, currentUserId }: Props) {
    const [loading, setLoading] = useState(false)
    const [reserva, setReserva] = useState<any>(null)
    const [actionLoading, setActionLoading] = useState(false)

    const puedeConfirmar = reserva ? new Date() >= new Date(new Date(reserva.fecha_y_hora_reservada).getTime() - 3600000) : false

    useEffect(() => {
        if (open && idReserva) {
            loadReserva()
        }
    }, [open, idReserva])

    const loadReserva = async () => {
        if (!idReserva) return
        setLoading(true)
        try {
            const data = await getReservaDetalleAction(idReserva)
            setReserva(data)
        } catch (error) {
            console.error(error)
            toast.error('Error al cargar la reserva')
            onOpenChange(false)
        } finally {
            setLoading(false)
        }
    }

    const handleCancelar = async () => {
        if (!reserva) return

        // Confirmación simple
        // En una app real usaríamos un AlertDialog para confirmar, aquí por brevedad usaremos window.confirm o confiamos en el usuario
        // Mejor agregar un estado de confirmación visual

        setActionLoading(true)
        try {
            const res = await cancelarReserva(reserva.id_reserva.toString())
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success(res.message || 'Reserva cancelada exitosamente')
                onSuccess?.()
                onOpenChange(false)
            }
        } catch (error) {
            toast.error('Error al cancelar')
        } finally {
            setActionLoading(false)
        }
    }

    const handleConfirmarAsistencia = async () => {
        if (!reserva) return
        setActionLoading(true)
        try {
            const res = await confirmarAsistencia(reserva.id_reserva)
            if (res.error) {
                toast.error(res.error)
            } else if (res.message) {
                toast.warning(res.message)
            } else {
                toast.success('Asistencia confirmada exitosamente')
                onSuccess?.()
                onOpenChange(false)
            }
        } catch (error) {
            toast.error('Error al confirmar asistencia')
        } finally {
            setActionLoading(false)
        }
    }

    if (!open) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Detalle de la Reserva #{idReserva}</DialogTitle>
                    <DialogDescription>Información completa de la reserva.</DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : reserva ? (
                    <div className="space-y-6">
                        {/* Estado */}
                        <div className="flex items-center justify-between bg-muted/40 p-4 rounded-lg">
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground font-medium">Estado</p>
                                <Badge variant={
                                    reserva.id_estado === 1 ? 'default' :
                                        reserva.id_estado === 3 ? 'secondary' :
                                            reserva.id_estado === 5 ? 'destructive' : 'outline'
                                } className="text-sm px-3 py-1">
                                    {reserva.estado?.nombre_estado || 'Desconocido'}
                                </Badge>
                            </div>
                            <div className="text-right space-y-1">
                                <p className="text-sm text-muted-foreground font-medium">Monto Total</p>
                                <p className="text-xl font-bold">${reserva.tarifa_total}</p>
                            </div>
                        </div>

                        {/* Detalles Principales */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-start gap-3 p-3 border rounded-md">
                                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                                <div>
                                    <p className="font-medium text-sm">Fecha</p>
                                    <p className="text-muted-foreground">
                                        {format(new Date(reserva.fecha_y_hora_reservada), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 border rounded-md">
                                <Clock className="h-5 w-5 text-primary mt-0.5" />
                                <div>
                                    <p className="font-medium text-sm">Hora</p>
                                    <p className="text-muted-foreground">
                                        {format(new Date(reserva.fecha_y_hora_reservada), "HH:mm")} hs
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 border rounded-md">
                                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                                <div>
                                    <p className="font-medium text-sm">Instalación</p>
                                    <p className="text-muted-foreground">{reserva.instalacion?.nombre_instalacion}</p>
                                    <p className="text-xs text-muted-foreground/70">{reserva.instalacion?.deporte?.nombre_deporte}</p>
                                </div>
                            </div>
                            {/* Mostrar Usuario solo a Admin o si es reserva propia */}
                            <div className="flex items-start gap-3 p-3 border rounded-md">
                                <User className="h-5 w-5 text-primary mt-0.5" />
                                <div>
                                    <p className="font-medium text-sm">Reservado por</p>
                                    <p className="text-muted-foreground">{reserva.usuario?.nombre_usuario || 'Usuario eliminado'}</p>
                                    {isAdmin && (
                                        <p className="text-xs text-muted-foreground/70">{reserva.usuario?.email_usuario} - DNI: {reserva.usuario?.dni_usuario}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Pagos */}
                        {reserva.pagos && reserva.pagos.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4" /> Pagos Registrados
                                </h3>
                                <div className="space-y-2">
                                    {reserva.pagos.map((pago: any) => (
                                        <div key={pago.id_pago} className="flex justify-between items-center text-sm p-2 bg-secondary/20 rounded">
                                            <span>{format(new Date(pago.fecha_y_hora_pago), "dd/MM/yyyy HH:mm")}</span>
                                            <span className="font-medium">${pago.monto_pago}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Acciones */}
                        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 pt-4 border-t">
                            {/* Cancelar: Permitido si es estado 1 o 2 (Vigentes) y (Admin o Dueño) */}
                            {['1', '2', '4'].includes(reserva.id_estado.toString()) && (isAdmin || currentUserId === reserva.id_usuario) && (
                                <Button
                                    variant="destructive"
                                    onClick={handleCancelar}
                                    disabled={actionLoading}
                                    className="w-full sm:w-auto mr-auto"
                                >
                                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                                    Cancelar Reserva
                                </Button>
                            )}

                            {/* Confirmar Asistencia: Solo Admin y si estado es 1 (Vigente) */}
                            {isAdmin && reserva.id_estado === 1 && puedeConfirmar && (
                                <Button
                                    onClick={handleConfirmarAsistencia}
                                    disabled={actionLoading}
                                    className="w-full sm:w-auto"
                                >
                                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                    Confirmar Asistencia
                                </Button>
                            )}

                            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                                Cerrar
                            </Button>
                        </DialogFooter>
                    </div>
                ) : (
                    <div className="py-8 text-center text-muted-foreground">
                        No se encontró la reserva.
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
