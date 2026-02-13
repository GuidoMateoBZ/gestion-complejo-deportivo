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

export interface IngresosChartProps {
    data: any[] // Datos procesados fecha, deporte1, deporte2, etc.
    deportes: string[] // Lista de nombres de deportes para generar series
    titulo?: string
    descripcion?: string
}

// Colores personalizados por deporte
const getColor = (deporte: string) => {
    const d = deporte.toLowerCase();
    if (d.includes('padel') || d.includes('pádel')) return "#2563eb"; // Blue 600
    if (d.includes('futbol') || d.includes('fútbol')) return "#16a34a"; // Green 600
    if (d.includes('basquet') || d.includes('básquet') || d.includes('basket')) return "#ea580c"; // Orange 600
    if (d.includes('tenis')) return "#eab308"; // Yellow 600
    if (d.includes('voley')) return "#db2777"; // Pink 600
    return "#7c3aed"; // Violet 600 (Default)
}

export function IngresosChart({ data, deportes, titulo = "Ingresos por Deporte", descripcion }: IngresosChartProps) {
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
        const label = esTotal ? 'Total Ingresos' : seriesName
        const color = esTotal ? "#7c3aed" : getColor(seriesName)

        acc[seriesName] = { label, color }
        return acc
    }, {} as ChartConfig)


    // Calculamos tendencia simple (último mes vs anterior, o semana)
    // Pero como data es variable, esto es solo decorativo por ahora.
    const trending = 0 // Placeholder logic

    return (
        <Card>
            <CardHeader>
                <CardTitle>{titulo}</CardTitle>
                <CardDescription>
                    {descripcion || "Mostrando ingresos detallados por deporte en el período seleccionado"}
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
                            tickFormatter={(value) => value.slice(0, 5)} // Cortar "01 Feb" -> "01 Fe"
                        />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                        <defs>
                            {series.map((seriesName) => {
                                const color = esTotal ? "#7c3aed" : getColor(seriesName);
                                return (
                                    <linearGradient key={seriesName} id={`fill${seriesName}`} x1="0" y1="0" x2="0" y2="1">
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
                                    fill={`url(#fill${seriesName})`}
                                    fillOpacity={0.4}
                                    stroke={color}
                                    stackId="a" // Stacked area chart para ver total acumulado visualmente
                                />
                            )
                        })}
                    </AreaChart>
                </ChartContainer>
            </CardContent>
            <CardFooter>
                <div className="flex w-full items-start gap-2 text-sm">
                    <div className="grid gap-2">
                        {/* 
                        <div className="flex items-center gap-2 leading-none font-medium">
                            Trending up by {trending}% this month <TrendingUp className="h-4 w-4" />
                        </div>
                        */}
                        <div className="text-muted-foreground flex items-center gap-2 leading-none">
                            {data.length > 0 ? `${data[0].fecha} - ${data[data.length - 1].fecha}` : 'Sin datos'}
                        </div>
                    </div>
                </div>
            </CardFooter>
        </Card>
    )
}
