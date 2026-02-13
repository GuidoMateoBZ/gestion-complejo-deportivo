'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { eliminarInstalacion } from "@/lib/actions/instalaciones"
import { Loader2, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

interface EliminarInstalacionDialogProps {
    idInstalacion: string
    nombreInstalacion: string
    children?: React.ReactNode
}

export function EliminarInstalacionDialog({ idInstalacion, nombreInstalacion, children }: EliminarInstalacionDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleEliminar = async () => {
        setLoading(true)
        try {
            const res = await eliminarInstalacion(idInstalacion)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success("Instalación eliminada correctamente")
                setOpen(false)
                router.push('/dashboard/instalaciones')
                router.refresh()
            }
        } catch (error) {
            toast.error("Error al eliminar instalación")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="destructive" size="sm" className="gap-2">
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>¿Estás completamente seguro?</DialogTitle>
                    <DialogDescription>
                        Esta acción no se puede deshacer. Se eliminará permanentemente la instalación <strong>{nombreInstalacion}</strong> y todas sus reservas asociadas.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-4">
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleEliminar}
                        disabled={loading}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Eliminar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
