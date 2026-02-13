'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { InstalacionConDeporte } from '@/types'
import { useState, useEffect } from 'react'

interface ReservasFiltrosProps {
    instalaciones: InstalacionConDeporte[]
    defaultFecha?: string
    defaultEstado?: string
    defaultInstalacion?: string
}

export function ReservasFiltros({ instalaciones, defaultFecha, defaultEstado, defaultInstalacion }: ReservasFiltrosProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Prioridad: 1. URL Param (si existe) 2. Default prop (si existe) 3. Valor base vacío
    const paramFecha = searchParams.get('fecha')
    // Si viene 'todas' en URL, lo convertimos a vacío para el input. Si no hay nada, usamos default o vacío.
    const initialFecha = (paramFecha === 'todas' ? '' : paramFecha) ?? defaultFecha ?? ''

    const [fecha, setFecha] = useState(initialFecha)
    const [instalacion, setInstalacion] = useState(searchParams.get('id_instalacion') ?? defaultInstalacion ?? 'todas')
    const [estado, setEstado] = useState(searchParams.get('id_estado') ?? defaultEstado ?? 'todos')

    // Efecto para actualizar URL automáticamente al cambiar cualquier filtro
    useEffect(() => {
        const params = new URLSearchParams()

        // Manejo explícito: Si está vacío, mandamos 'todas' para anular defaults de servidor
        if (fecha) params.set('fecha', fecha)
        else params.set('fecha', 'todas')

        if (instalacion && instalacion !== 'todas') params.set('id_instalacion', instalacion)
        else params.set('id_instalacion', 'todas')

        if (estado && estado !== 'todos') params.set('id_estado', estado)
        else params.set('id_estado', 'todos')

        router.replace(`/dashboard/reservas?${params.toString()}`)
    }, [fecha, instalacion, estado, router])

    function limpiarFiltros() {
        setFecha('')
        setInstalacion('todas')
        setEstado('todos')
    }

    return (
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-end bg-card p-4 rounded-lg border shadow-sm">
            <div className="w-full md:w-auto">
                <label className="text-sm font-medium mb-1 block">Fecha</label>
                <Input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full md:w-[180px]"
                />
            </div>

            <div className="w-full md:w-auto">
                <label className="text-sm font-medium mb-1 block">Instalación</label>
                <Select value={instalacion} onValueChange={setInstalacion}>
                    <SelectTrigger className="w-full md:w-[200px]">
                        <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="todas">Todas</SelectItem>
                        {instalaciones.map((i) => (
                            <SelectItem key={i.id_instalacion} value={i.id_instalacion}>
                                {i.nombre_instalacion}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="w-full md:w-auto">
                <label className="text-sm font-medium mb-1 block">Estado</label>
                <Select value={estado} onValueChange={setEstado}>
                    <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="0">Temporal</SelectItem>
                        <SelectItem value="1">Vigente</SelectItem>
                        <SelectItem value="2">En Curso</SelectItem>
                        <SelectItem value="3">Finalizada</SelectItem>
                        <SelectItem value="4">Pendiente Pago</SelectItem>
                        <SelectItem value="5">Cancelada</SelectItem>
                        <SelectItem value="6">Ausente</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex gap-2 w-full md:w-auto ml-auto">
                <Button variant="outline" onClick={limpiarFiltros}>
                    Limpiar
                </Button>
            </div>
        </div>
    )
}
