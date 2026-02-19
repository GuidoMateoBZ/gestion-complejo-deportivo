import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { suspenderInstalacion } from "@/lib/actions/instalaciones"
import { useState, useEffect } from "react"
import { Instalacion } from "@/types"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { DateRange } from "react-day-picker"
import { addDays, format } from "date-fns"
import { es } from "date-fns/locale"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface Props {
    instalacion: Instalacion
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function SuspensionDialog({ instalacion, open, onOpenChange, onSuccess }: Props) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    // Estado para el rango de fechas
    const [date, setDate] = useState<DateRange | undefined>()

    // Estado para las horas (formato HH:00)
    const [horaInicio, setHoraInicio] = useState("08") // Default apertura
    const [horaFin, setHoraFin] = useState("23")       // Default cierre

    // Resetear al abrir
    useEffect(() => {
        if (open) {
            setDate(undefined)
            setSuccess(false)
            setError(null)
            setLoading(false)
        }
    }, [open])

    const handleSubmit = async () => {
        if (!date?.from || !date?.to) {
            setError("Debes seleccionar un rango de fechas.")
            return
        }

        setError(null)
        setLoading(true)

        // Construir timestamps ISO con zona horaria local (-03:00 forzada o UTC manejo)
        // Simplificamos construyendo strings YYYY-MM-DDTHH:mm:ss

        const formatDateTime = (d: Date, t: string) => {
            const y = d.getFullYear()
            const m = (d.getMonth() + 1).toString().padStart(2, '0')
            const day = d.getDate().toString().padStart(2, '0')
            // Asumimos que el usuario piensa en hora local del complejo (-03:00)
            return `${y}-${m}-${day}T${t}:00:00-03:00`
        }

        const inicioISO = formatDateTime(date.from, horaInicio)
        const finISO = formatDateTime(date.to, horaFin)

        const result = await suspenderInstalacion(instalacion.id_instalacion, inicioISO, finISO)

        if (result.error) {
            setError(result.error)
            setLoading(false)
            return
        }

        setLoading(false)
        setSuccess(true)
    }

    const handleSuccessClose = () => {
        onOpenChange(false)
        if (onSuccess) onSuccess()
    }

    // Generar opciones de hora (00-23)
    const horasOptions = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[600px]"> {/* Más ancho para el calendario */}
                <DialogHeader>
                    <DialogTitle>Suspender Instalación</DialogTitle>
                    <DialogDescription>

                    </DialogDescription>
                </DialogHeader>

                {success ? (
                    <div className="py-6 text-center space-y-4">
                        <div className="text-green-600 text-4xl mb-2">✓</div>
                        <h3 className="text-lg font-medium">Suspensión creada correctamente</h3>
                        <p className="text-muted-foreground">Los turnos en ese rango quedarán bloqueados.</p>
                        <Button onClick={handleSuccessClose} className="w-full">
                            Aceptar
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col sm:flex-row gap-6">
                            {/* Calendario */}
                            <div className="flex flex-col gap-2">
                                <div className="border rounded-md p-2 flex justify-center">
                                    <Calendar
                                        mode="range"
                                        selected={date}
                                        onSelect={setDate}
                                        numberOfMonths={1}
                                        locale={es}
                                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                        initialFocus
                                    />
                                </div>
                                {date?.from && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setDate(undefined)}
                                        className="text-xs w-full text-red-400 border hover:text-red-500"
                                    >
                                        Limpiar selección de fechas
                                    </Button>
                                )}
                            </div>

                            {/* Controles de Hora */}
                            <div className="flex flex-col justify-center gap-6 min-w-[150px]">
                                <div className="space-y-2">
                                    <Label>Hora Inicio ({date?.from ? format(date.from, 'dd/MM', { locale: es }) : '-'})</Label>
                                    <Select value={horaInicio} onValueChange={setHoraInicio}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Hora" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[200px]">
                                            {horasOptions.map(h => (
                                                <SelectItem key={`start-${h}`} value={h}>{h}:00</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Hora Fin ({date?.to ? format(date.to, 'dd/MM', { locale: es }) : '-'})</Label>
                                    <Select value={horaFin} onValueChange={setHoraFin}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Hora" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[200px]">
                                            {horasOptions.map(h => (
                                                <SelectItem key={`end-${h}`} value={h}>{h}:00</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                                {error}
                            </div>
                        )}

                        <DialogFooter>
                            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSubmit} disabled={loading || !date?.from || !date?.to}>
                                {loading ? 'Suspendiendo...' : 'Confirmar Suspensión'}
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}