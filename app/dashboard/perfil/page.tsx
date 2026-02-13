import { getUsuarioActual } from '@/lib/queries/usuarios'
import { getInfraccionDeuda, getInfraccionCancelaciones } from '@/lib/queries/infracciones'
import { calcularMontoDeuda } from '@/lib/actions/infracciones'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldCheck } from 'lucide-react'
import { redirect } from 'next/navigation'
import { PerfilUsuario } from '@/components/usuarios/perfil-usuario'

export default async function PerfilPage() {
    const usuario = await getUsuarioActual()

    if (!usuario) {
        redirect('/login')
    }

    // Obtenemos infracciones activas si las hay
    const [infraccionDeudaResult, infraccionCancelResult] = await Promise.all([
        getInfraccionDeuda(usuario.id_usuario),
        getInfraccionCancelaciones(usuario.id_usuario)
    ])

    const infraccionDeuda = infraccionDeudaResult.success ? infraccionDeudaResult.data : null;
    const infraccionCancelacion = infraccionCancelResult.success ? infraccionCancelResult.data : null;

    let montoDeudaCalculado: number | undefined = undefined;
    if (infraccionDeuda) {
        const calculo = await calcularMontoDeuda(usuario.id_usuario);
        if (calculo.success && calculo.monto_total) {
            montoDeudaCalculado = calculo.monto_total;
        }
    }

    // Si es admin, muestra algo básico
    if (usuario.rol === 'administrador') {
        return (
            <div className="container max-w-2xl mx-auto py-10">
                <Card>
                    <CardHeader>
                        <CardTitle>Perfil de Administrador</CardTitle>
                        <CardDescription>Cuenta de gestión del sistema.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
                            <ShieldCheck className="h-8 w-8 text-primary" />
                            <div>
                                <p className="font-medium">Cuenta Administrativa</p>
                                <p className="text-sm text-muted-foreground">{usuario.email_usuario}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="container max-w-2xl mx-auto py-10 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
                <p className="text-muted-foreground">Gestiona tu información personal y cuenta.</p>
            </div>

            <PerfilUsuario
                usuario={usuario}
                infraccionDeuda={infraccionDeuda}
                infraccionCancelacion={infraccionCancelacion}
                montoDeudaCalculado={montoDeudaCalculado}
            />
        </div>
    )
}
