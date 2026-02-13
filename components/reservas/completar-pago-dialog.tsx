'use client'

import React from 'react'
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { completarPagoReserva } from '@/lib/actions/reservas'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface CompletarPagoDialogProps {
    idReserva: number
    montoPendiente: number
    fechaReservada: string
    nombreInstalacion: string
    tieneInfraccion?: boolean
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export function CompletarPagoDialog({
    idReserva,
    montoPendiente,
    fechaReservada,
    nombreInstalacion,
    tieneInfraccion,
    isOpen,
    onClose,
    onSuccess
}: CompletarPagoDialogProps) {
    const [loading, setLoading] = React.useState(false)
    const [result, setResult] = React.useState<{ success: boolean; message: string } | null>(null)
    const router = useRouter()

    async function handleConfirm() {
        setLoading(true)
        try {
            const res = await completarPagoReserva(idReserva)
            if (res.error) {
                setResult({
                    success: false,
                    message: typeof res.error === 'string' ? res.error : 'Ocurrió un error al procesar el pago.'
                })
            } else {
                setResult({
                    success: true,
                    message: res.mensajePago || 'Pago completado con éxito.'
                })
                onSuccess()
            }
        } catch (error) {
            console.error(error)
            setResult({
                success: false,
                message: 'Ocurrió un error inesperado al conectar con el servidor.'
            })
        } finally {
            setLoading(false)
        }
    }

    function handleClose() {
        if (result?.success) {
            router.refresh()
        }
        setResult(null)
        onClose()
    }

    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <AlertDialogContent>
                {!result ? (
                    <>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{tieneInfraccion ? 'Confirmar Pago de Infracción' : 'Confirmar Pago'}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {tieneInfraccion
                                    ? "Existe una multa pendiente. Debes abonar el total para regularizar tu situación y la de esta reserva."
                                    : "Vas a completar el pago de la reserva."}
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        <div className="bg-muted p-4 rounded-md space-y-2 text-sm text-foreground">
                            {tieneInfraccion && (
                                <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded mb-3 text-center font-medium">
                                    ¡Atención! Este monto incluye recargos por infracción.
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="font-medium text-muted-foreground">Instalación:</span>
                                <span>{nombreInstalacion}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium text-muted-foreground">Fecha:</span>
                                <span>{new Date(fechaReservada).toLocaleDateString()} {new Date(fechaReservada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="flex justify-between border-t border-border mt-2 pt-2 text-base font-bold">
                                <span>Total a Pagar:</span>
                                <span className="text-green-600">${montoPendiente.toLocaleString('es-AR')}</span>
                            </div>
                        </div>

                        <AlertDialogFooter>
                            <Button variant="outline" onClick={handleClose} disabled={loading}>
                                Cancelar
                            </Button>
                            <Button onClick={handleConfirm} disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirmar Pago
                            </Button>
                        </AlertDialogFooter>
                    </>
                ) : (
                    <>
                        <AlertDialogHeader>
                            <AlertDialogTitle className={result.success ? "text-green-600" : "text-destructive"}>
                                {result.success ? '¡Pago Exitoso!' : 'Error en el Pago'}
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-base pt-2">
                                {result.message}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <Button onClick={handleClose} className={result.success ? "bg-green-600 hover:bg-green-700 text-white" : ""}>
                                {result.success ? 'Aceptar' : 'Cerrar'}
                            </Button>
                        </AlertDialogFooter>
                    </>
                )}
            </AlertDialogContent>
        </AlertDialog>
    )
}
