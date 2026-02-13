'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InstalacionConDeporte } from '@/types'
import { crearReserva } from '@/lib/actions/reservas'
import { buscarUsuarioDniAction } from '@/lib/actions/usuarios'
import { PORCENTAJE_SENIA_MIN } from '@/lib/constantes'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Usuario } from '@/types'
import { Loader2, Search } from 'lucide-react'

interface Props {
    instalacion: InstalacionConDeporte
    fecha: Date
    hora: number
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
    isAdmin?: boolean
}

export function NuevaReservaDialog({ instalacion, fecha, hora, open, onOpenChange, onSuccess, isAdmin }: Props) {
    const montoMinimo = instalacion.tarifa_hora * PORCENTAJE_SENIA_MIN
    const montoTotal = instalacion.tarifa_hora

    const [montoSenia, setMontoSenia] = useState<number | ''>(montoMinimo)
    const [dniCliente, setDniCliente] = useState('')
    const [usuarioEncontrado, setUsuarioEncontrado] = useState<Usuario | null>(null)
    const [buscandoUsuario, setBuscandoUsuario] = useState(false)
    const [errorUsuario, setErrorUsuario] = useState<string | null>(null)

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    // Reset al abrir
    useEffect(() => {
        if (open) {
            setMontoSenia(montoMinimo)
            setDniCliente('')
            setUsuarioEncontrado(null)
            setErrorUsuario(null)
            setError(null)
            setSuccess(false)
            setLoading(false)
        }
    }, [open, montoMinimo])

    // Función para buscar usuario
    const buscarUsuario = async () => {
        if (!dniCliente || dniCliente.length < 7) {
            // Evitar búsquedas con 1 o 2 números si el user está escribiendo
            // Pero si borra y deja vacío, limpiar
            if (!dniCliente) {
                setUsuarioEncontrado(null)
                setErrorUsuario(null)
            }
            return
        }

        setBuscandoUsuario(true)
        setErrorUsuario(null)
        setUsuarioEncontrado(null)

        const res = await buscarUsuarioDniAction(dniCliente)

        if (res.error || !res.usuario) {
            setErrorUsuario('Usuario no encontrado')
            setUsuarioEncontrado(null)
        } else {
            setUsuarioEncontrado(res.usuario)
            setErrorUsuario(null)
        }
        setBuscandoUsuario(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        const monto = Number(montoSenia)

        if (isNaN(monto) || monto < montoMinimo) {
            setError(`El monto mínimo de seña es $${montoMinimo} (${PORCENTAJE_SENIA_MIN * 100}%)`)
            setLoading(false)
            return
        }

        if (monto > montoTotal) {
            setError(`El monto no puede superar el total de $${montoTotal}`)
            setLoading(false)
            return
        }

        if (isAdmin && dniCliente && !usuarioEncontrado) {
            const res = await buscarUsuarioDniAction(dniCliente)
            if (res.error || !res.usuario) {
                setError('El DNI ingresado no corresponde a un usuario válido.')
                setLoading(false)
                return
            }
        }

        const result = await crearReserva({
            id_instalacion: instalacion.id_instalacion,
            fecha: fecha,
            hora_inicio: hora,
            monto_senia: monto,
            precio_total: montoTotal,
            dni_cliente: isAdmin && dniCliente ? dniCliente : undefined
        })

        if (result.error) {
            setError(result.error)
            setLoading(false)
            return
        }

        setLoading(false)
        setSuccess(true)

        if (onSuccess) {
            onSuccess()
        }

        // Ya no cerramos automáticamente
    }

    // Formatear fecha y hora para mostrar
    const fechaStr = format(fecha, "EEEE d 'de' MMMM", { locale: es })
    const horaStr = `${hora}:00 - ${hora + 1}:00`

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Confirmar Reserva</DialogTitle>
                    <DialogDescription className="sr-only">
                        Complete los detalles para confirmar su reserva y realizar el pago de la seña.
                    </DialogDescription>
                </DialogHeader>

                {success ? (
                    <div className="py-6 text-center space-y-4">
                        <div className="text-green-600 text-4xl mb-2">✓</div>
                        <h3 className="text-lg font-medium">¡Reserva creada con éxito!</h3>
                        <p className="text-muted-foreground">Tu turno ha sido reservado y el pago registrado.</p>
                        <Button
                            onClick={() => onOpenChange(false)}
                            className="w-full mt-4"
                        >
                            Aceptar
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                        <div className="space-y-4">
                            {/* Información del turno */}
                            <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Instalación:</span>
                                    <span className="font-medium">{instalacion.nombre_instalacion}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Deporte:</span>
                                    <span className="font-medium">{instalacion.deporte?.nombre_deporte}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Fecha:</span>
                                    <span className="font-medium capitalize">{fechaStr}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Hora:</span>
                                    <span className="font-medium">{horaStr}</span>
                                </div>
                                <div className="border-t pt-2 mt-2 flex justify-between text-base">
                                    <span className="font-medium">Total:</span>
                                    <span className="font-bold">${montoTotal}</span>
                                </div>
                            </div>

                            {/* Input de Seña */}
                            {/* Input de Seña */}
                            {isAdmin && (
                                <div className="space-y-3">
                                    <label htmlFor="dniCliente" className="text-sm font-medium leading-none">
                                        DNI Cliente
                                    </label>
                                    <div className="flex gap-2 relative">
                                        <div className="relative flex-1">
                                            <Input
                                                id="dniCliente"
                                                type="text"
                                                placeholder="Ingrese DNI del usuario"
                                                value={dniCliente}
                                                onChange={(e) => {
                                                    setDniCliente(e.target.value)
                                                    if (usuarioEncontrado) setUsuarioEncontrado(null)
                                                    if (errorUsuario) setErrorUsuario(null)
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault()
                                                        buscarUsuario()
                                                    }
                                                }}
                                                className={errorUsuario ? "border-destructive focus-visible:ring-destructive" : usuarioEncontrado ? "border-green-500 focus-visible:ring-green-500" : ""}
                                            />
                                            {buscandoUsuario && (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="icon"
                                            onClick={buscarUsuario}
                                            title="Buscar usuario"
                                            disabled={buscandoUsuario || !dniCliente}
                                        >
                                            <Search className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    {usuarioEncontrado && (
                                        <div className="text-sm font-medium flex items-center gap-2 pt-1 bg-primary/10 p-2 rounded border border-primary/20 animate-in fade-in slide-in-from-top-1 text-primary">
                                            <div className="items-center pt-1">
                                                <p className="leading-none">{usuarioEncontrado.nombre_usuario}</p>
                                                <p className="text-xs text-muted-foreground font-normal mt-1">{usuarioEncontrado.email_usuario}</p>
                                            </div>
                                        </div>
                                    )}

                                    {errorUsuario && (
                                        <p className="text-xs text-destructive pt-1 font-medium flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                                            <span>⚠</span> {errorUsuario}
                                        </p>
                                    )}

                                    {!usuarioEncontrado && !errorUsuario && (
                                        <p className="text-xs text-muted-foreground pt-1">
                                            Ingrese DNI y presione Enter o buscar. Vacío = Reserva Admin.
                                        </p>
                                    )}
                                </div>
                            )}

                            <div>
                                <label htmlFor="montoSenia" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Monto a pagar (Seña)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                    <Input
                                        id="montoSenia"
                                        type="number"
                                        min={montoMinimo}
                                        max={montoTotal}
                                        step="100"
                                        placeholder={`Mínimo: ${montoMinimo}`}
                                        className="pl-7"
                                        value={montoSenia}
                                        onChange={(e) => setMontoSenia(Number(e.target.value))}
                                        required
                                        autoFocus
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground pt-1">
                                    Debes abonar al menos el {PORCENTAJE_SENIA_MIN * 100}% (${montoMinimo}) para confirmar.
                                </p>
                            </div>

                            {error && (
                                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                                    {error}
                                </div>
                            )}
                        </div>

                        <DialogFooter className="gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={loading}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Procesando...' : 'Confirmar y Pagar'}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
