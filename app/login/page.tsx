'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { login } from './actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

export default function LoginPage() {
    const searchParams = useSearchParams()
    const justRegistered = searchParams.get('registered') === 'true'

    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true)
        setError(null)

        const result = await login(formData)

        if (result?.error) {
            setError(result.error)
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <ThemeToggle />
            <div className="w-full max-w-sm">
                <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold text-foreground">Iniciar Sesión</h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Ingresá tus credenciales para continuar
                        </p>
                    </div>

                    {justRegistered && (
                        <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm text-center">
                            ✓ Registro exitoso. Ya podés iniciar sesión.
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
                            {error}
                        </div>
                    )}

                    <form action={handleSubmit} className="space-y-4">
                        <Input
                            label="Email"
                            id="email"
                            name="email"
                            type="email"
                            placeholder="tu@email.com"
                            required
                            disabled={isLoading}
                        />

                        <Input
                            label="Contraseña"
                            id="password"
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            required
                            disabled={isLoading}
                            minLength={5}
                        />

                        <Button type="submit" className="w-full" isLoading={isLoading}>
                            Ingresar
                        </Button>
                    </form>

                    <div className="text-center mt-6">
                        <span className="text-sm text-muted-foreground">¿No tenés cuenta? </span>
                        <Link href="/register" className="text-sm text-primary hover:underline">
                            Registrate
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
