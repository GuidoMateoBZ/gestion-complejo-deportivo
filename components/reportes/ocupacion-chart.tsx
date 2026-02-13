"use client"

import { TrendingUp } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart"

export interface OcupacionChartProps {
    data: any[] // Datos procesados fecha, deporte1, deporte2, etc.
    deportes: string[] // Lista de nombres de deportes para generar series
    titulo?: string
    descripcion?: string
}

// Colores personalizados por deporte
const getColor = (deporte: string) => {
    const d = deporte.toLowerCase();
    if (d.includes('pádel')) return "#2563eb"; // Blue 600
    if (d.includes('fútbol')) return "#16a34a"; // Green 600
    if (d.includes('básquet')) return "#ea580c"; // Orange 600
    return "#7c3aed"; // Violet 600 (Default)
}

export function OcupacionChart({ data, deportes, titulo = "Ocupación por Deporte", descripcion }: OcupacionChartProps) {
    const esTotal = deportes.length > 1;

    // Si es "Todos", pre-procesamos la data para tener un campo 'total'
    const chartData = esTotal
        ? data.map(item => {
            const total = deportes.reduce((sum, dep) => sum + (Number(item[dep]) || 0), 0)
            return { ...item, total }
        })
        : data

    // Si es total, usamos solo una serie "Total". Si no, las series de los deportes.
    const series = esTotal ? ['total'] : deportes

    // Configuración dinámica
    const chartConfig: ChartConfig = series.reduce((acc, seriesName) => {
        const label = esTotal ? 'Total Horas' : seriesName
        const color = esTotal ? "#7c3aed" : getColor(seriesName)

        acc[seriesName] = { label, color }
        return acc
    }, {} as ChartConfig)

    return (
        <Card>
            <CardHeader>
                <CardTitle>{titulo}</CardTitle>
                <CardDescription>
                    {descripcion || "Mostrando horas reservadas por deporte en el período seleccionado"}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="max-h-[350px] w-full">
                    <AreaChart
                        accessibilityLayer
                        data={chartData}
                        margin={{
                            left: 12,
                            right: 12,
                        }}
                    >
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="fecha"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={(value) => value.slice(0, 5)}
                        />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                        <defs>
                            {series.map((seriesName) => {
                                const color = esTotal ? "#7c3aed" : getColor(seriesName);
                                return (
                                    <linearGradient key={seriesName} id={`fillOcu${seriesName}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop
                                            offset="5%"
                                            stopColor={color}
                                            stopOpacity={0.8}
                                        />
                                        <stop
                                            offset="95%"
                                            stopColor={color}
                                            stopOpacity={0.1}
                                        />
                                    </linearGradient>
                                )
                            })}
                        </defs>

                        {series.map((seriesName) => {
                            const color = esTotal ? "#7c3aed" : getColor(seriesName);
                            return (
                                <Area
                                    key={seriesName}
                                    dataKey={seriesName}
                                    type="monotone"
                                    fill={`url(#fillOcu${seriesName})`}
                                    fillOpacity={0.4}
                                    stroke={color}
                                    stackId="a"
                                />
                            )
                        })}
                    </AreaChart>
                </ChartContainer>
            </CardContent>
            <CardFooter>
                <div className="flex w-full items-start gap-2 text-sm">
                    <div className="grid gap-2">
                        {/* Placeholder footer */}
                        <div className="text-muted-foreground flex items-center gap-2 leading-none">
                            {data.length > 0 ? `${data[0].fecha} - ${data[data.length - 1].fecha}` : 'Sin datos'}
                        </div>
                    </div>
                </div>
            </CardFooter>
        </Card>
    )
}
