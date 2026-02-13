import { redirect } from 'next/navigation'
import { getUsuarioActual } from '@/lib/queries/usuarios'
import { getReservas } from '@/lib/queries/reservas'
import { getPagoReserva } from '@/lib/queries/pagos'
import { calcularMontoDeuda } from '@/lib/actions/infracciones'
import { ListaPagosPendientes, ReservaConSaldo } from '@/components/pagos/lista-pagos-pendientes'

export const dynamic = 'force-dynamic'

export default async function PagosPendientesPage() {

    const usuario = await getUsuarioActual()

    if (!usuario) {
        redirect('/login')
    }

    // Obtenemos deuda activa si existe
    const deuda = await calcularMontoDeuda(usuario.id_usuario)
    const montoDeuda = (deuda.success && deuda.monto_total) ? deuda.monto_total : null

    // Obtenemos solo las reservas con estado 4 (PendienteDePago)
    const reservas = await getReservas({
        id_usuario: usuario.id_usuario,
        id_estado: '4'
    })

    // Construimos la lista con el saldo pendiente calculado
    const reservasConSaldo: ReservaConSaldo[] = await Promise.all(
        reservas.map(async (reserva) => {
            const pagosRes = await getPagoReserva(reserva.id_reserva)

            let totalPagado = 0
            if (pagosRes.success && pagosRes.data) {
                totalPagado = pagosRes.data.monto_pago
            }

            const saldoNormal = reserva.tarifa_total - totalPagado
            // Si hay deuda, el monto a pagar es el de la deuda (que reemplaza/cubre la reserva)
            const saldoFinal = montoDeuda ? montoDeuda : saldoNormal

            return {
                id_reserva: reserva.id_reserva,
                id_instalacion: reserva.id_instalacion,
                // @ts-ignore: Propiedad viene del join pero puede que el tipo no la reconozca perfectamente sin strict null check
                nombre_instalacion: reserva.instalacion?.nombre_instalacion || 'Instalación',
                fecha_y_hora_reservada: reserva.fecha_y_hora_reservada,
                tarifa_total: reserva.tarifa_total,
                saldo_pendiente: saldoFinal > 0 ? saldoFinal : 0,
                tiene_infraccion: !!montoDeuda
            }
        })
    )

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Pagos Pendientes</h1>
                <p className="text-muted-foreground">Gestiona y completa el pago de tus reservas pendientes.</p>
            </div>

            <ListaPagosPendientes reservas={reservasConSaldo} />
        </div>
    )
}
