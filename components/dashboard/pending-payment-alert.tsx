'use client'

import { useEffect, useState } from 'react'
import { getReservasPendientesDePago } from '@/lib/actions/reservas'
import { AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function PendingPaymentAlert() {
    const [pendientesCount, setPendientesCount] = useState(0)
    const router = useRouter()

    useEffect(() => {
        const checkPendientes = async () => {
            const res = await getReservasPendientesDePago()
            if (res.success && res.data) {
                setPendientesCount(res.data.length || 0)
            }
        }
        checkPendientes()
    }, [])

    if (pendientesCount === 0) return null

    return (
        <div className="flex-1 flex justify-center">
            <Button
                variant="destructive"
                size="sm"
                className="animate-pulse shadow-md"
                onClick={() => router.push('/dashboard/pagos-pendientes')}
            >
                <div className="flex items-center gap-2 text-white">
                    <AlertCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">Tienes {pendientesCount} reserva(s) pendiente(s) de pago</span>
                    <span className="sm:hidden">{pendientesCount} Pagos Pend.</span>
                </div>
            </Button>
        </div>
    )
}
