"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"

export interface Deporte {
    id_deporte: number
    nombre_deporte: string
}

interface ReportesFiltroProps {
    deportes: Deporte[]
}

export function ReportesFiltro({ deportes }: ReportesFiltroProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Estado inicial basado en URL params
    const initialFechaInicio = searchParams.get('fechaInicio') || ''
    const initialFechaFin = searchParams.get('fechaFin') || ''
    const initialDeporte = searchParams.get('deporteId') || 'todos'

    const [fechaInicio, setFechaInicio] = React.useState(initialFechaInicio)
    const [fechaFin, setFechaFin] = React.useState(initialFechaFin)
    const [deporteId, setDeporteId] = React.useState(initialDeporte)

    const handleApplyFilters = () => {
        const params = new URLSearchParams()
        if (fechaInicio) params.set('fechaInicio', fechaInicio)
        if (fechaFin) params.set('fechaFin', fechaFin)
        if (deporteId && deporteId !== 'todos') params.set('deporteId', deporteId)

        router.push(`/dashboard/reportes?${params.toString()}`)
    }

    const handleClearFilters = () => {
        setFechaInicio('')
        setFechaFin('')
        setDeporteId('todos')
        router.push('/dashboard/reportes')
    }

    return (
        <div className="flex flex-col gap-4 p-4 border rounded-lg bg-card text-card-foreground shadow-sm mb-6">
            <h3 className="text-lg font-semibold">Filtros de Reporte</h3>
            <div className="flex flex-wrap gap-4 items-end">
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Deporte</label>
                    <Select value={deporteId} onValueChange={setDeporteId}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Todos los deportes" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todos">Todos los deportes</SelectItem>
                            {deportes.map((d) => (
                                <SelectItem key={d.id_deporte} value={d.id_deporte.toString()}>
                                    {d.nombre_deporte}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Desde</label>
                    <Input
                        type="date"
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                        className="w-[160px]"
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Hasta</label>
                    <Input
                        type="date"
                        value={fechaFin}
                        onChange={(e) => setFechaFin(e.target.value)}
                        className="w-[160px]"
                    />
                </div>

                <div className="flex gap-2 ml-auto sm:ml-0">
                    <Button onClick={handleApplyFilters}>Aplicar Filtros</Button>
                    <Button variant="outline" onClick={handleClearFilters}>Limpiar</Button>
                </div>
            </div>
        </div>
    )
}
