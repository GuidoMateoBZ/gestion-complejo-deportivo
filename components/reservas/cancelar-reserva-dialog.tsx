'use client'

import React, { useState } from 'react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { contarReservasCanceladas, cancelarReserva } from '@/lib/actions/reservas'
import { CANTIDAD_CANCELACIONES_PERMITIDAS, HORAS_MINIMAS_DEVOLUCION } from '@/lib/constantes'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react'

interface CancelarDialogProps {
    idReserva: number | string
    idUsuario: string
    onClose: () => void
    isOpen: boolean
}

export function CancelarReservaDialog({ idReserva, idUsuario, isOpen, onClose }: CancelarDialogProps) {
    const [step, setStep] = useState<'confirmation' | 'processing' | 'result'>('confirmation')
    const [cancelaciones, setCancelaciones] = useState<number | null>(null)
    const [loadingCount, setLoadingCount] = useState(false)
    const [resultMessage, setResultMessage] = useState<string>('')
    const [isSuccess, setIsSuccess] = useState(false)
    const router = useRouter()

    React.useEffect(() => {
        if (isOpen && step === 'confirmation') {
            setLoadingCount(true)
            contarReservasCanceladas(idUsuario)
                .then((count) => {
                    setCancelaciones(count)
                })
                .catch((err) => {
                    console.error(err)
                    setCancelaciones(0) // Fallback
                })
                .finally(() => setLoadingCount(false))
        }
    }, [isOpen, idUsuario, step])

    async function handleConfirm() {
        setStep('processing')
        try {
            const res = await cancelarReserva(idReserva.toString())
            if (res.error) {
                setIsSuccess(false)
                setResultMessage(typeof res.error === 'string' ? res.error : 'Ocurrió un error al cancelar.')
            } else {
                setIsSuccess(true)
                setResultMessage(res.message || 'Reserva cancelada correctamente.')
                router.refresh()
            }
        } catch (error) {
            setIsSuccess(false)
            setResultMessage('Error inesperado de red o servidor.')
        } finally {
            setStep('result')
        }
    }

    function handleClose() {
        setStep('confirmation')
        setResultMessage('')
        setIsSuccess(false)
        onClose()
    }

    if (!isOpen) return null

    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <AlertDialogContent className="sm:max-w-[425px]">
                {step === 'confirmation' ? (
                    <>
                        <>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Está seguro de cancelar?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción cancelará la reserva inmediatamente.
                                </AlertDialogDescription>
                            </AlertDialogHeader>

                            <div className="space-y-3 py-4">
                                <div className="p-3 bg-muted rounded-md text-sm">
                                    <div className="flex items-start gap-2 mb-2">
                                        <Info className="w-4 h-4 mt-0.5 text-blue-500" />
                                        <span className="font-semibold text-foreground">Política de Devolución:</span>
                                    </div>
                                    <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                                        <li>Se devuelve el 100% si cancela con más de <strong>{HORAS_MINIMAS_DEVOLUCION}hs</strong> de anticipación.</li>
                                        <li>Caso contrario, no se devuelve la seña.</li>
                                    </ul>
                                </div>

                                <div className={`p-3 rounded-md text-sm border ${(cancelaciones !== null && cancelaciones >= CANTIDAD_CANCELACIONES_PERMITIDAS)
                                    ? 'bg-red-50 border-red-200 text-red-800'
                                    : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                                    }`}>
                                    <div className="flex items-center gap-2 font-medium">
                                        <AlertTriangle className="w-4 h-4" />
                                        Estado de Infracciones
                                    </div>
                                    <p className="mt-1">
                                        Llevas <strong>{loadingCount ? '...' : cancelaciones}</strong> cancelaciones este mes.
                                        <br />
                                        El límite permitido es <strong>{CANTIDAD_CANCELACIONES_PERMITIDAS}</strong>.
                                    </p>
                                    {(cancelaciones !== null && cancelaciones >= CANTIDAD_CANCELACIONES_PERMITIDAS) && (
                                        <p className="mt-2 font-bold text-red-600">
                                            ¡Atención! Al cancelar esta reserva podrías ser inhabilitado.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={handleClose}>Volver</AlertDialogCancel>
                                <Button variant="destructive" onClick={handleConfirm} disabled={loadingCount}>
                                    {loadingCount ? 'Cargando...' : 'Sí, cancelar reserva'}
                                </Button>
                            </AlertDialogFooter>
                        </>
                    </>
                ) : step === 'processing' ? (
                    <div className="py-8 flex flex-col items-center justify-center space-y-4">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-muted-foreground">Procesando cancelación...</p>
                    </div>
                ) : (
                    // Result Step
                    <>
                        <AlertDialogHeader>
                            <div className="flex items-center gap-2">
                                {isSuccess ? (
                                    <CheckCircle className="w-6 h-6 text-green-500" />
                                ) : (
                                    <XCircle className="w-6 h-6 text-red-500" />
                                )}
                                <AlertDialogTitle>{isSuccess ? 'Cancelación Exitosa' : 'Error al Cancelar'}</AlertDialogTitle>
                            </div>
                            <AlertDialogDescription className="pt-2 text-base text-foreground">
                                {resultMessage}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogAction onClick={handleClose} className={isSuccess ? "bg-green-600 hover:bg-green-700" : ""}>
                                Entendido
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </>
                )}
            </AlertDialogContent>
        </AlertDialog>
    )
}
