'use client'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { User, Mail, CreditCard, ShieldCheck, AlertTriangle, Pencil, Trash2, Banknote, CalendarDays, KeyRound, Loader2, Save, X } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { modificarPerfil, eliminarUsuario } from '@/lib/actions/usuarios'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface PerfilUsuarioProps {
    usuario: any;
    infraccionDeuda?: any;
    infraccionCancelacion?: any;
    montoDeudaCalculado?: number;
    isAdminView?: boolean;
    onClose?: () => void;
}

export function PerfilUsuario({ usuario, infraccionDeuda, infraccionCancelacion, montoDeudaCalculado, isAdminView = false, onClose }: PerfilUsuarioProps) {
    const router = useRouter()
    const [isEditing, setIsEditing] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [deleteMessage, setDeleteMessage] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        nombre: usuario.nombre_usuario || '',
        email: usuario.email_usuario || ''
    })

    const handleSave = async () => {
        if (!formData.nombre || !formData.email) {
            toast.error('Nombre y Email son requeridos')
            return
        }

        setIsLoading(true)
        const toastId = toast.loading('Guardando cambios...')

        try {
            const res = await modificarPerfil({
                id_usuario: usuario.id_usuario,
                nombre: formData.nombre,
                email: formData.email
            })

            if (res.error) {
                toast.error(res.error, { id: toastId })
            } else {
                toast.success('Perfil actualizado correctamente', { id: toastId })
                setIsEditing(false)
                router.refresh()
            }
        } catch (error) {
            toast.error('Error inesperado', { id: toastId })
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async () => {
        setIsDeleting(true)
        const toastId = toast.loading('Procesando...')
        try {
            // Si hay mensaje, es confirmación forzosa
            const isForce = !!deleteMessage
            const res = await eliminarUsuario(usuario.id_usuario, isForce)

            if (res.requiereConfirmacion) {
                toast.dismiss(toastId)
                setDeleteMessage(res.mensaje)
                return
            }

            if (res.error) {
                toast.error(res.error, { id: toastId })
                setDeleteMessage(null)
                setShowDeleteDialog(false)
            } else {
                toast.success('Cuenta eliminada', { id: toastId })
                setShowDeleteDialog(false)
                setDeleteMessage(null)
                if (isAdminView) {
                    if (onClose) onClose()
                    router.refresh()
                } else {
                    router.refresh()
                }
            }
        } catch (error) {
            toast.error("Error al eliminar", { id: toastId })
        } finally {
            setIsDeleting(false)
        }
    }

    const closeDeleteDialog = () => {
        setShowDeleteDialog(false)
        setDeleteMessage(null)
    }

    const montoMostrar = montoDeudaCalculado !== undefined ? montoDeudaCalculado : infraccionDeuda?.monto_inicial;

    return (
        <div className="space-y-6">

            {infraccionDeuda && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-start gap-4">
                        <Banknote className="h-5 w-5 mt-0.5 text-red-600" />
                        <div className="space-y-1">
                            <h4 className="font-semibold leading-none text-red-900">Infracción por Deuda Activa</h4>
                            <p className="text-sm text-red-800 opacity-90" style={{ marginTop: '0.5rem' }}>
                                {isAdminView ? 'El usuario tiene' : 'Tenés'} un saldo pendiente de <strong>${montoMostrar}</strong>.
                                <br />
                                La cuenta se encuentra inhabilitada. {isAdminView ? '' : 'Por favor, acercate a administración para regularizar el pago.'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {infraccionCancelacion && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-orange-900 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-start gap-4">
                        <CalendarDays className="h-5 w-5 mt-0.5 text-orange-600" />
                        <div className="space-y-1">
                            <h4 className="font-semibold leading-none text-orange-900">Suspensión Temporal</h4>
                            <p className="text-sm text-orange-800 opacity-90" style={{ marginTop: '0.5rem' }}>
                                La cuenta está suspendida hasta el <strong>{new Date(infraccionCancelacion.fecha_final).toLocaleDateString()}</strong> debido a cancelaciones excesivas.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <Card className={isAdminView ? "border-0 shadow-none" : ""}>
                {!isAdminView && (
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-xl">Información Personal</CardTitle>
                                <CardDescription>Detalles de tu cuenta en el complejo.</CardDescription>
                            </div>
                            {usuario.habilitado ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    <ShieldCheck className="w-3 h-3 mr-1" />
                                    Habilitado
                                </Badge>
                            ) : (
                                <Badge variant="destructive">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Infractor
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                )}

                <CardContent className="space-y-6 pt-6">
                    <div className="grid gap-6">
                        <div className="flex items-center space-x-4 rounded-md border p-4">
                            <User className="h-5 w-5 text-muted-foreground" />
                            <div className="flex-1 space-y-1">
                                <p className="text-sm font-medium leading-none">Nombre Completo</p>
                                {isEditing ? (
                                    <Input
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                        className="h-8 mt-1"
                                    />
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        {usuario.nombre_usuario || 'Sin nombre registrado'}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center space-x-4 rounded-md border p-4">
                            <CreditCard className="h-5 w-5 text-muted-foreground" />
                            <div className="flex-1 space-y-1">
                                <p className="text-sm font-medium leading-none">DNI</p>
                                <p className="text-sm text-muted-foreground">
                                    {usuario.dni_usuario}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4 rounded-md border p-4">
                            <Mail className="h-5 w-5 text-muted-foreground" />
                            <div className="flex-1 space-y-1">
                                <p className="text-sm font-medium leading-none">Correo Electrónico</p>
                                {isEditing ? (
                                    <Input
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="h-8 mt-1"
                                        type="email"
                                    />
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        {usuario.email_usuario}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>

                <Separator />
                <CardFooter className="flex justify-between py-6">
                    {isEditing ? (
                        <div className="flex gap-2 w-full justify-end">
                            <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={isLoading}>
                                <X className="h-4 w-4 mr-2" />
                                Cancelar
                            </Button>
                            <Button onClick={handleSave} disabled={isLoading} className="gap-2">
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Guardar
                            </Button>
                        </div>
                    ) : (
                        <>
                            <Button variant="outline" className="gap-2" onClick={() => setIsEditing(true)}>
                                <Pencil className="h-4 w-4" />
                                Modificar Datos
                            </Button>

                            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" className="gap-2">
                                        <Trash2 className="h-4 w-4" />
                                        Eliminar Cuenta
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>
                                            {deleteMessage ? '⚠️ Advertencia de Administración' : '¿Está absolutamente seguro?'}
                                        </AlertDialogTitle>
                                        <AlertDialogDescription className={deleteMessage ? "text-orange-700 font-medium" : ""}>
                                            {deleteMessage ||
                                                `Esta acción no se puede deshacer. Esto desactivará permanentemente la cuenta ${isAdminView ? 'del usuario' : 'tuya'} e impedirá su acceso futuro.`
                                            }
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <Button variant="outline" onClick={closeDeleteDialog} disabled={isDeleting}>
                                            Cancelar
                                        </Button>
                                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                                            {isDeleting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                                            {deleteMessage ? 'Eliminar e Ignorar Advertencias' : 'Confirmar Eliminación'}
                                        </Button>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </>
                    )}
                </CardFooter>
            </Card>
        </div>
    )
}
