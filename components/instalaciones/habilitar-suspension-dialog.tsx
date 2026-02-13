'use strict';
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { habilitarSuspension } from "@/lib/actions/instalaciones"
import { Suspension } from "@/types"
import { Loader2, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

interface HabilitarSuspensionDialogProps {
    suspensiones: Suspension[]
    idInstalacion: string
    children?: React.ReactNode
}

export function HabilitarSuspensionDialog({ suspensiones, idInstalacion, children }: HabilitarSuspensionDialogProps) {
    const [open, setOpen] = useState(false)
    const [loadingId, setLoadingId] = useState<number | null>(null)
    const router = useRouter()

    // Filtramos solo las suspensiones vigentes o futuras que tengan fecha fin futura o sean indefinidas
    // y que además no estén "pasadas" totalmente.
    const now = new Date()
    const suspensionesActivas = suspensiones.filter(s => {
        // Si ya fue desactivada lógicamente, no mostrar
        if ((s as any).activa === false) return false

        // Si tiene fecha fin y ya pasó, no es activa relevante para cancelar
        if (s.fecha_y_hora_fin && new Date(s.fecha_y_hora_fin) < now) return false
        return true
    })

    const handleHabilitar = async (idSuspension: number) => {
        setLoadingId(idSuspension)
        try {
            // Como id_suspension en BD es int pero las actions a veces usan string, convertimos
            const res = await habilitarSuspension(idSuspension.toString(), idInstalacion)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success("Suspensión eliminada correctamente")
                router.refresh()
                // Si no quedan mas, cerramos
                if (suspensionesActivas.length <= 1) setOpen(false)
            }
        } catch (error) {
            toast.error("Error al eliminar suspensión")
        } finally {
            setLoadingId(null)
        }
    }

    if (suspensionesActivas.length === 0) return null

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="outline" className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700">
                        Habilitar Horarios
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Suspensiones Activas</DialogTitle>
                    <DialogDescription>
                        Lista de suspensiones vigentes. Elimina una suspensión para habilitar los horarios nuevamente.
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[300px] overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Inicio</TableHead>
                                <TableHead>Fin</TableHead>
                                <TableHead className="text-right">Acción</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {suspensionesActivas.map((suspension) => (
                                <TableRow key={suspension.id_suspension}>
                                    <TableCell>
                                        {new Date(suspension.fecha_y_hora_inicio).toLocaleString('es-AR')}
                                    </TableCell>
                                    <TableCell>
                                        {suspension.fecha_y_hora_fin
                                            ? new Date(suspension.fecha_y_hora_fin).toLocaleString('es-AR')
                                            : 'Indefinida'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                            onClick={() => handleHabilitar(suspension.id_suspension)}
                                            disabled={loadingId === suspension.id_suspension}
                                            title="Habilitar (Eliminar suspensión)"
                                        >
                                            {loadingId === suspension.id_suspension ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="h-4 w-4" />
                                            )}
                                            <span className="sr-only">Habilitar</span>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    )
}
