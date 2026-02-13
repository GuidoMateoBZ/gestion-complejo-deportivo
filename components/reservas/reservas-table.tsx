'use client'

import { CancelarReservaDialog } from './cancelar-reserva-dialog'
import { ReservaCompleta } from '@/types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { confirmarAsistencia } from '@/lib/actions/reservas'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Check, X, Eye } from 'lucide-react'
import { useDashboard } from '@/components/dashboard/dashboard-authcontext'
import { ReservaDetalleDialog } from './reserva-detalle-dialog'

interface ReservasTableProps {
    reservas: ReservaCompleta[]
    isAdmin?: boolean
}

const ESTADO_COLORS: Record<number, string> = {
    0: 'bg-yellow-100 text-yellow-800 border-yellow-200', // Temporal
    1: 'bg-green-100 text-green-800 border-green-200',   // Vigente
    2: 'bg-blue-100 text-blue-800 border-blue-200',      // EnCurso
    3: 'bg-gray-100 text-gray-800 border-gray-200',      // Finalizada
    4: 'bg-orange-100 text-orange-800 border-orange-200',// PendienteDePago
    5: 'bg-red-100 text-red-800 border-red-200',         // Cancelada
    6: 'bg-purple-100 text-purple-800 border-purple-200' // Ausente
}

export function ReservasTable({ reservas, isAdmin = false }: ReservasTableProps) {
    const router = useRouter()
    const { usuario } = useDashboard()
    const [loadingMap, setLoadingMap] = useState<Record<number, boolean>>({})
    const [selectedReservaId, setSelectedReservaId] = useState<number | null>(null)
    const [cancelDialogState, setCancelDialogState] = useState<{ isOpen: boolean; idReserva: number | null; idUsuario: string }>({
        isOpen: false,
        idReserva: null,
        idUsuario: '',
    })

    function openCancelDialog(idReserva: number, idUsuario: string) {
        setCancelDialogState({ isOpen: true, idReserva, idUsuario })
    }

    async function handleConfirmar(id_reserva: number) {
        setLoadingMap(prev => ({ ...prev, [id_reserva]: true }))
        try {
            const res = await confirmarAsistencia(id_reserva)
            if (res.error) {
                toast.error(typeof res.error === 'string' ? res.error : 'Error al confirmar')
            } else if (res.message) {
                // Warning persistente que debe cerrar el admin
                toast.warning(res.message, { duration: Infinity })
            } else {
                toast.success('Asistencia confirmada correctamente')
                router.refresh()
            }
        } catch (error) {
            toast.error('Ocurrió un error')
        } finally {
            setLoadingMap(prev => ({ ...prev, [id_reserva]: false }))
        }
    }

    if (reservas.length === 0) {
        return <div className="text-center py-12 text-muted-foreground border rounded-lg bg-card">No se encontraron reservas con los filtros seleccionados.</div>
    }

    return (
        <>
            <div className="border rounded-lg bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="min-w-[100px]">Fecha</TableHead>
                                <TableHead className="hidden md:table-cell">Instalación</TableHead>
                                <TableHead>Usuario</TableHead>
                                <TableHead className="hidden sm:table-cell">Estado</TableHead>
                                <TableHead className="text-right hidden md:table-cell">Monto</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reservas.map((reserva) => {
                                const fecha = new Date(reserva.fecha_y_hora_reservada)
                                // Ajustamos visualización
                                const fechaStr = fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
                                const horaStr = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

                                const estadoColor = ESTADO_COLORS[reserva.id_estado] || 'bg-gray-100'

                                return (
                                    <TableRow key={reserva.id_reserva}>
                                        <TableCell>
                                            <div className="font-medium">{fechaStr}</div>
                                            <div className="text-sm text-muted-foreground">{horaStr} hs</div>
                                            {/* Mobile: Instalación debajo */}
                                            <div className="md:hidden text-xs text-muted-foreground mt-1 truncate max-w-[100px]">
                                                {reserva.instalacion?.nombre_instalacion}
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            {reserva.instalacion?.nombre_instalacion || 'Instalación eliminada'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium truncate max-w-[140px] sm:max-w-none">
                                                {reserva.usuario?.nombre_usuario || 'Sin nombre'}
                                            </div>
                                            <div className="text-xs text-muted-foreground truncate max-w-[140px] sm:max-w-none">
                                                {reserva.usuario?.email_usuario || reserva.usuario?.dni_usuario}
                                            </div>
                                            {/* Mobile: Estado debajo */}
                                            <div className="sm:hidden mt-2">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${estadoColor}`}>
                                                    {reserva.estado?.nombre_estado || reserva.id_estado}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${estadoColor}`}>
                                                {reserva.estado?.nombre_estado || reserva.id_estado}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-medium hidden md:table-cell">
                                            ${reserva.tarifa_total}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2 items-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    onClick={() => setSelectedReservaId(reserva.id_reserva)}
                                                    title="Ver detalles"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>

                                                {/* Si es Admin, mostrar Confirmar Asistencia para Vigente (1) */}
                                                {isAdmin && reserva.id_estado === 1 && (
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        onClick={() => handleConfirmar(reserva.id_reserva)}
                                                        disabled={loadingMap[reserva.id_reserva]}
                                                        className="h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700 text-white"
                                                        title="Confirmar asistencia"
                                                    >
                                                        {loadingMap[reserva.id_reserva] ? '...' : <Check className="h-4 w-4" />}
                                                    </Button>
                                                )}

                                                {/* Cancelar */}
                                                {(reserva.id_estado === 1 || reserva.id_estado === 0) && (
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => openCancelDialog(reserva.id_reserva, reserva.id_usuario || '')}
                                                        disabled={loadingMap[reserva.id_reserva]}
                                                        className={isAdmin ? "h-8 w-8 p-0" : "h-8 px-2 text-xs"}
                                                        title="Cancelar reserva"
                                                    >
                                                        {isAdmin ? <X className="h-4 w-4" /> : 'Cancelar'}
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {cancelDialogState.idReserva && (
                <CancelarReservaDialog
                    isOpen={cancelDialogState.isOpen}
                    idReserva={cancelDialogState.idReserva}
                    idUsuario={cancelDialogState.idUsuario}
                    onClose={() => setCancelDialogState(prev => ({ ...prev, isOpen: false }))}
                />
            )}

            {selectedReservaId && (
                <ReservaDetalleDialog
                    idReserva={selectedReservaId}
                    open={!!selectedReservaId}
                    onOpenChange={(open) => !open && setSelectedReservaId(null)}
                    isAdmin={isAdmin}
                    currentUserId={usuario?.id_usuario}
                    onSuccess={() => router.refresh()}
                />
            )}
        </>
    )
}
