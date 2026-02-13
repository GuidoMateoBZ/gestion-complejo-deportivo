'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useDashboard } from '@/components/dashboard/dashboard-authcontext'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { PendingPaymentAlert } from '@/components/dashboard/pending-payment-alert'
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarInset,
    useSidebar,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'

// Iconos de MUI
import HomeIcon from '@mui/icons-material/Home'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import GroupIcon from '@mui/icons-material/Group'
import AssessmentIcon from '@mui/icons-material/Assessment'
import LogoutIcon from '@mui/icons-material/Logout'
import MenuIcon from '@mui/icons-material/Menu'
import SportsIcon from '@mui/icons-material/Sports'

// Menú principal
const menuItems = [
    {
        title: 'Instalaciones',
        href: '/dashboard/instalaciones',
        icon: HomeIcon,
    },
    {
        title: 'Reservas',
        href: '/dashboard/reservas',
        icon: CalendarTodayIcon,
    },
]

// Menú solo para admins
const adminMenuItems = [
    {
        title: 'Usuarios',
        href: '/dashboard/usuarios',
        icon: GroupIcon,
    },
    {
        title: 'Reportes',
        href: '/dashboard/reportes',
        icon: AssessmentIcon,
    },
]

// Componente personalizado para el trigger
function CustomSidebarTrigger() {
    const { toggleSidebar } = useSidebar()

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8"
        >
            <MenuIcon sx={{ fontSize: 20 }} />
            <span className="sr-only">Toggle Sidebar</span>
        </Button>
    )
}

export function DashboardSidebar({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const { usuario, isAdmin } = useDashboard()

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <SidebarProvider>
            <Sidebar>
                <SidebarHeader className="border-b border-border p-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <SportsIcon sx={{ fontSize: 20 }} />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-semibold text-sm">GSD</span>
                            <span className="text-xs text-muted-foreground">
                                {'Enterprise'}
                            </span>
                        </div>
                    </div>
                </SidebarHeader>

                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupLabel>Menú</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {menuItems.map((item) => (
                                    <SidebarMenuItem key={item.href}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={pathname === item.href}
                                            tooltip={item.title}
                                        >
                                            <Link href={item.href}>
                                                <item.icon sx={{ fontSize: 18 }} />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    {isAdmin && (
                        <SidebarGroup>
                            <SidebarGroupLabel>Administración</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {adminMenuItems.map((item) => (
                                        <SidebarMenuItem key={item.href}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={pathname === item.href}
                                                tooltip={item.title}
                                            >
                                                <Link href={item.href}>
                                                    <item.icon sx={{ fontSize: 18 }} />
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    )}
                </SidebarContent>

                <SidebarFooter className="border-t border-border">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                tooltip={usuario.email_usuario || 'Usuario'}
                                className="justify-start cursor-pointer"
                                onClick={() => router.push('/dashboard/perfil')}
                            >
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                                    {usuario.nombre_usuario?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <span className="truncate">{usuario.nombre_usuario || usuario.email_usuario}</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={handleLogout}
                                tooltip="Cerrar sesión"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                            >
                                <LogoutIcon sx={{ fontSize: 18 }} />
                                <span>Cerrar sesión</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
            </Sidebar>

            <SidebarInset>
                <header className="flex h-14 items-center gap-4 border-b border-border px-6">
                    <CustomSidebarTrigger />
                    <PendingPaymentAlert />
                </header>
                <main className="flex-1 p-6">
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}
