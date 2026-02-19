'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { crearInstalacion, modificarInstalacion, actualizarTarifaDeporte } from '@/lib/actions/instalaciones'
import { InstalacionConDeporte, Deporte } from '@/types'

import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'

interface Props {
    deportes: Deporte[]
    instalacion?: InstalacionConDeporte  // Si viene, es editar. Si no, es crear.
}

export function InstalacionFormDialog({ deportes, instalacion }: Props) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showRateConfirm, setShowRateConfirm] = useState(false)

    const esEditar = !!instalacion

    const valoresIniciales = {
        nombre_instalacion: instalacion?.nombre_instalacion || '',
        id_deporte: instalacion?.id_deporte || 0,
        descripcion: instalacion?.descripcion || '',
        hora_apertura: instalacion?.hora_apertura?.slice(0, 5) || '08:00',
        hora_cierre: instalacion?.hora_cierre?.slice(0, 5) || '22:00',
        tarifa_hora: instalacion?.tarifa_hora || 0
    }

    const [formData, setFormData] = useState(valoresIniciales)

    // Resetear form cuando se abre/cierra
    useEffect(() => {
        if (open) {
            setFormData(valoresIniciales)
            setError(null)
            setShowRateConfirm(false)
        }
    }, [open])

    const handleInitialSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Si es edición y cambió la tarifa, pedir confirmación
        if (esEditar && instalacion && formData.tarifa_hora !== instalacion.tarifa_hora) {
            setShowRateConfirm(true)
            return
        }

        await processSubmit(false)
    }

    const processSubmit = async (actualizarOtras: boolean) => {
        setLoading(true)
        setError(null)

        let result

        // 1. Guardar la instalación (crear o modificar)
        if (esEditar && instalacion) {
            result = await modificarInstalacion({
                ...formData,
                id_instalacion: instalacion.id_instalacion
            })
        } else {
            result = await crearInstalacion(formData)
        }

        if (result.error) {
            setError(result.error)
            setLoading(false)
            setShowRateConfirm(false)
            return
        }

        // 2. Si se pidió actualizar otras, hacerlo ahora
        if (actualizarOtras && formData.id_deporte > 0) {
            const updateResult = await actualizarTarifaDeporte(formData.id_deporte, formData.tarifa_hora)
            if (updateResult.error) {
                console.error("Error al actualizar tarifas masivas:", updateResult.error)
            }
        }

        setLoading(false)
        setOpen(false)
        router.refresh()
    }

    const getNombreDeporte = () => {
        return deportes.find(d => d.id_deporte === formData.id_deporte)?.nombre_deporte || 'este deporte'
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {esEditar ? (
                    <Button variant="outline" size="sm" className="gap-2">
                        <EditIcon sx={{ fontSize: 18 }} />
                        Modificar
                    </Button>
                ) : (
                    <button
                        className="h-[200px] w-full relative overflow-hidden grid place-items-center border-2 border-dashed border-muted-foreground/30 rounded-[20px] transition-all duration-200 hover:border-primary hover:bg-primary/5 group cursor-pointer"
                    >
                        <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                            <AddIcon sx={{ fontSize: 40 }} />
                            <span className="font-medium">Nueva Instalación</span>
                        </div>
                    </button>
                )}
            </DialogTrigger>
            <DialogContent
                className="sm:max-w-[500px]"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>
                        {showRateConfirm ? 'Actualizar tarifas' : (esEditar ? 'Modificar instalación' : 'Crear nueva instalación')}
                    </DialogTitle>
                </DialogHeader>

                {showRateConfirm ? (
                    <div className="space-y-4 py-4">
                        <div className="flex items-center gap-3 p-3 bg-amber-500/10 text-amber-600 rounded-lg border border-amber-200 dark:border-amber-800">
                            <WarningAmberIcon />
                            <p className="text-sm font-medium">
                                Has modificado la tarifa horaria.
                            </p>
                        </div>

                        <p className="text-sm text-muted-foreground">
                            ¿Deseas aplicar la nueva tarifa de <strong>${formData.tarifa_hora}</strong> a todas las instalaciones de <strong>{getNombreDeporte()}</strong>?
                        </p>

                        <div className="flex flex-col gap-2 pt-2">
                            <Button
                                onClick={() => processSubmit(true)}
                                disabled={loading}
                                className="w-full"
                            >
                                {loading ? 'Actualizando...' : `Sí, actualizar todas las de ${getNombreDeporte()}`}
                            </Button>

                            <Button
                                variant="secondary"
                                onClick={() => processSubmit(false)}
                                disabled={loading}
                                className="w-full"
                            >
                                {loading ? 'Guardando...' : 'No, solo esta instalación'}
                            </Button>

                            <Button
                                variant="ghost"
                                onClick={() => setShowRateConfirm(false)}
                                disabled={loading}
                                className="w-full"
                            >
                                Cancelar
                            </Button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleInitialSubmit} className="space-y-4 mt-4">
                        {error && (
                            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                                {error}
                            </div>
                        )}

                        {/* Nombre */}
                        <div className="space-y-2">
                            <label htmlFor="nombre" className="text-sm font-medium">
                                Nombre *
                            </label>
                            <Input
                                id="nombre"
                                placeholder="Ej: Cancha de Fútbol 1"
                                value={formData.nombre_instalacion}
                                onChange={(e) => setFormData({ ...formData, nombre_instalacion: e.target.value })}
                                required
                            />
                        </div>

                        {/* Deporte */}
                        <div className="space-y-2">
                            <label htmlFor="deporte" className="text-sm font-medium">
                                Deporte *
                            </label>
                            <select
                                id="deporte"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={formData.id_deporte}
                                onChange={(e) => setFormData({ ...formData, id_deporte: Number(e.target.value) })}
                                required
                            >
                                <option value={0}>Seleccionar deporte...</option>
                                {deportes.map((deporte) => (
                                    <option key={deporte.id_deporte} value={deporte.id_deporte}>
                                        {deporte.nombre_deporte}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Descripción */}
                        <div className="space-y-2">
                            <label htmlFor="descripcion" className="text-sm font-medium">
                                Descripción
                            </label>
                            <Input
                                id="descripcion"
                                placeholder="Descripción opcional"
                                value={formData.descripcion}
                                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                            />
                        </div>

                        {/* Horarios */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="hora_apertura" className="text-sm font-medium">
                                    Hora apertura *
                                </label>
                                <Input
                                    id="hora_apertura"
                                    type="time"
                                    value={formData.hora_apertura}
                                    onChange={(e) => setFormData({ ...formData, hora_apertura: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="hora_cierre" className="text-sm font-medium">
                                    Hora cierre *
                                </label>
                                <Input
                                    id="hora_cierre"
                                    type="time"
                                    value={formData.hora_cierre}
                                    onChange={(e) => setFormData({ ...formData, hora_cierre: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        {/* Tarifa */}
                        <div className="space-y-2">
                            <label htmlFor="tarifa" className="text-sm font-medium">
                                Tarifa por hora ($) *
                            </label>
                            <Input
                                id="tarifa"
                                type="number"
                                min="0"
                                step="100"
                                placeholder="Ej: 50000"
                                value={formData.tarifa_hora || ''}
                                onChange={(e) => setFormData({ ...formData, tarifa_hora: Number(e.target.value) })}
                                required
                            />
                        </div>

                        {/* Botones */}
                        <div className="flex justify-end gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                                disabled={loading}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading
                                    ? (esEditar ? 'Guardando...' : 'Creando...')
                                    : (esEditar ? 'Guardar cambios' : 'Crear instalación')
                                }
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
