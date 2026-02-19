'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, UserCheck, UserX, Eye, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { PerfilUsuario } from './perfil-usuario'
import { getDetalleUsuario } from '@/lib/actions/usuarios'
import { toast } from 'sonner'

interface UsuariosTableProps {
    usuarios: any[]
    searchParams: { q?: string; dni?: string; estado?: string }
}

export function UsuariosTable({ usuarios, searchParams }: UsuariosTableProps) {
    const [selectedUser, setSelectedUser] = useState<any>(null)
    const [userDetails, setUserDetails] = useState<{ infraccionDeuda: any, infraccionCancelacion: any, montoDeudaCalculado?: number | null } | null>(null)
    const [isLoadingDetails, setIsLoadingDetails] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    const handleViewUser = async (usuario: any) => {
        setSelectedUser(usuario)
        setUserDetails(null) // Reset previous details
        setIsDialogOpen(true)

        // Si el usuario está habilitado, quizás no necesitamos buscar infracciones, 
        // pero para estar seguros y mostrar el estado completo, buscamos siempre.
        setIsLoadingDetails(true)
        try {
            const details = await getDetalleUsuario(usuario.id_usuario)
            setUserDetails(details)
        } catch (error) {
            console.error("Error fetching user details", error)
            toast.error("Error al cargar detalles del usuario")
        } finally {
            setIsLoadingDetails(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Listado de Usuarios</CardTitle>
            </CardHeader>
            <CardContent>
                {/* Formulario de Filtros */}
                <form className="flex flex-col sm:flex-row gap-4 mb-6" method="GET">
                    <div className="flex-1">
                        <Input
                            name="q"
                            placeholder="Buscar por Nombre o Email..."
                            defaultValue={searchParams.q}
                        />
                    </div>
                    <div className="w-full sm:w-[200px]">
                        <Input
                            name="dni"
                            placeholder="DNI..."
                            defaultValue={searchParams.dni}
                        />
                    </div>
                    <div className="w-full sm:w-[200px]">
                        <select
                            name="estado"
                            defaultValue={searchParams.estado || 'todos'}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="todos">Todos los estados</option>
                            <option value="habilitados">Habilitados</option>
                            <option value="infractores">Infractores</option>
                        </select>
                    </div>
                    <Button type="submit">
                        <Search className="w-4 h-4 mr-2" />
                        Buscar
                    </Button>
                </form>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>DNI</TableHead>
                                <TableHead className="hidden md:table-cell">Email</TableHead>
                                <TableHead>Rol</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {usuarios.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        No se encontraron usuarios.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                usuarios.map((usuario) => (
                                    <TableRow key={usuario.id_usuario}>
                                        <TableCell className="font-medium">
                                            {usuario.nombre_usuario || 'Sin nombre'}
                                        </TableCell>
                                        <TableCell>{usuario.dni_usuario}</TableCell>
                                        <TableCell className="hidden md:table-cell">{usuario.email_usuario}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">
                                                {usuario.rol}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {usuario.habilitado ? (
                                                <Badge className="bg-green-400 hover:bg-green-500">
                                                    <UserCheck className="w-3 h-3 mr-1" />
                                                    Habilitado
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive">
                                                    <UserX className="w-3 h-3 mr-1" />
                                                    Infractor
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleViewUser(usuario)}>
                                                <Eye className="h-4 w-4" />
                                                <span className="sr-only">Ver detalle</span>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Detalle del Usuario</DialogTitle>
                        <DialogDescription>
                            Información completa y estado del usuario.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedUser && (
                        isLoadingDetails ? (
                            <div className="flex justify-center items-center py-10">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <PerfilUsuario
                                usuario={selectedUser}
                                infraccionDeuda={userDetails?.infraccionDeuda}
                                infraccionCancelacion={userDetails?.infraccionCancelacion}
                                montoDeudaCalculado={userDetails?.montoDeudaCalculado ?? undefined}
                                isAdminView={true}
                                onClose={() => setIsDialogOpen(false)}
                                onUserUpdated={(data) => setSelectedUser((prev: any) => ({ ...prev, nombre_usuario: data.nombre, email_usuario: data.email }))}
                            />
                        )
                    )}
                </DialogContent>
            </Dialog>
        </Card>
    )
}
