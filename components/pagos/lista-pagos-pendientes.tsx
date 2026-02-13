'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, DollarSign } from 'lucide-react'
import { CompletarPagoDialog } from '@/components/reservas/completar-pago-dialog'

export interface ReservaConSaldo {
    id_reserva: number
    id_instalacion: string
    nombre_instalacion: string
    fecha_y_hora_reservada: string
    tarifa_total: number
    saldo_pendiente: number
    tiene_infraccion?: boolean
}

interface ListaPagosPendientesProps {
    reservas: ReservaConSaldo[]
}

export function ListaPagosPendientes({ reservas }: ListaPagosPendientesProps) {
    const [selectedReserva, setSelectedReserva] = useState<ReservaConSaldo | null>(null)

    if (reservas.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg bg-muted/20">
                <p className="text-muted-foreground text-lg mb-2">¡Todo al día!</p>
                <p className="text-sm text-muted-foreground">No tienes pagos pendientes en este momento.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {reservas.map((reserva) => (
                    <Card key={reserva.id_reserva} className="flex flex-col shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold truncate">
                                {reserva.nombre_instalacion || 'Instalación'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-4 pt-2">
                            <div className="grid gap-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-primary/70" />
                                    <span>{new Date(reserva.fecha_y_hora_reservada).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-primary/70" />
                                    <span>{new Date(reserva.fecha_y_hora_reservada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>

                            <div className="pt-3 mt-1 border-t flex flex-col gap-1">
                                <div className="flex justify-between items-center text-xs text-muted-foreground">
                                    <span>Total Reserva:</span>
                                    <span>${reserva.tarifa_total.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center font-medium text-destructive mt-1">
                                    <span className="text-sm">Saldo Restante:</span>
                                    <span className="text-lg font-bold">${reserva.saldo_pendiente.toLocaleString()}</span>
                                </div>
                                {reserva.tiene_infraccion && (
                                    <div className="bg-red-50 text-red-600 text-xs p-1 rounded border border-red-200 text-center font-medium mt-1">
                                        Incluye multa por infracción
                                    </div>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter className="pt-2">
                            <Button
                                className="w-full bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => setSelectedReserva(reserva)}
                            >
                                <DollarSign className="w-4 h-4 mr-2" />
                                Pagar Resto
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {selectedReserva && (
                <CompletarPagoDialog
                    isOpen={!!selectedReserva}
                    onClose={() => setSelectedReserva(null)}
                    onSuccess={() => setSelectedReserva(null)}
                    idReserva={selectedReserva.id_reserva}
                    montoPendiente={selectedReserva.saldo_pendiente}
                    fechaReservada={selectedReserva.fecha_y_hora_reservada}
                    nombreInstalacion={selectedReserva.nombre_instalacion}
                    tieneInfraccion={selectedReserva.tiene_infraccion}
                />
            )}
        </div>
    )
}
