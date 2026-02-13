import { redirect } from 'next/navigation'
import { getUsuarioActual } from '@/lib/queries/usuarios'
import { DashboardProvider } from '@/components/dashboard/dashboard-authcontext'
import { InactivityHandler } from '@/components/dashboard/inactivity-handler'
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar'
import { ThemeToggle } from '@/components/theme-toggle'

export default async function DashboardLayout({
    children
}: {
    children: React.ReactNode
}) {
    const usuario = await getUsuarioActual()

    // Si no hay usuario, redirigir al login
    if (!usuario) {
        redirect('/login')
    }

    return (
        <DashboardProvider usuario={usuario}>
            <InactivityHandler />
            <div className="min-h-screen bg-background">
                <div className="fixed top-4 right-4 z-50">
                    <ThemeToggle />
                </div>
                <DashboardSidebar>
                    <div className="max-w-6xl mx-auto">
                        {children}
                    </div>
                </DashboardSidebar>
            </div>
        </DashboardProvider>
    )
}
