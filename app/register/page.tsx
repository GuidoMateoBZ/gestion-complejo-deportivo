'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { register } from './actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

export default function RegisterPage() {
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [formDataLocal, setFormDataLocal] = useState({
        nombre: '',
        dni: '',
        email: ''
    })

    // Cargar datos guardados al montar
    useEffect(() => {
        const savedData = sessionStorage.getItem('register_form_data')
        if (savedData) {
            try {
                setFormDataLocal(JSON.parse(savedData))
            } catch (e) {
                console.error('Error parsing saved form data', e)
            }
        }
    }, [])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        let newValue = value

        // Para DNI, limitar estrictamente a 8 caracteres (maxLength no funciona en type="number")
        if (name === 'dni') {
            newValue = newValue.slice(0, 8)
        }

        const newData = { ...formDataLocal, [name]: newValue }
        setFormDataLocal(newData)
        sessionStorage.setItem('register_form_data', JSON.stringify(newData))
    }

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true)
        setError(null)

        const result = await register(formData)

        if (result?.error) {
            setError(result.error)
            setIsLoading(false)
        } else {
            // Limpiar datos al tener éxito (aunque redirecciona, es buena práctica)
            sessionStorage.removeItem('register_form_data')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <ThemeToggle />

            <div className="w-full max-w-sm">
                <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold text-foreground">Crear Cuenta</h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Completá tus datos para registrarte
                        </p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
                            {error}
                        </div>
                    )}

                    <form action={handleSubmit} className="space-y-4">
                        <Input
                            label="Nombre"
                            id="nombre"
                            name="nombre"
                            type="text"
                            placeholder="Tu nombre completo"
                            required
                            disabled={isLoading}
                            value={formDataLocal.nombre}
                            onChange={handleChange}
                        />

                        <Input
                            label="DNI"
                            id="dni"
                            name="dni"
                            type="number"
                            placeholder="12345678"
                            required
                            disabled={isLoading}
                            // Ocultar flechas numéricas (spinners)
                            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            onKeyDown={(e) => {
                                // Prevenir caracteres no válidos en un DNI (decimales, exponentes, signos)
                                if (["e", "E", "+", "-", ".", ","].includes(e.key)) {
                                    e.preventDefault()
                                }
                            }}
                            maxLength={8} // Solo semántico para accesibilidad/lectores, ya que type="number" lo ignora
                            min={10000000} // Mínimo razonable (1 millón) para evitar errores simples
                            max={99999999} // Máximo de 8 dígitos
                            pattern="\d{8}"
                            title="El DNI debe tener exactamente 8 dígitos"
                            value={formDataLocal.dni}
                            onChange={handleChange}
                        />

                        <Input
                            label="Email"
                            id="email"
                            name="email"
                            type="email"
                            placeholder="tu@email.com"
                            required
                            disabled={isLoading}
                            value={formDataLocal.email}
                            onChange={handleChange}
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

                        <Input
                            label="Confirmar Contraseña"
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            placeholder="••••••••"
                            required
                            disabled={isLoading}
                            minLength={6}
                        />

                        <Button type="submit" className="w-full" isLoading={isLoading}>
                            Registrarse
                        </Button>
                    </form>

                    <div className="text-center mt-6">
                        <span className="text-sm text-muted-foreground">¿Ya tenés cuenta? </span>
                        <Link href="/login" className="text-sm text-primary hover:underline">
                            Iniciá Sesión
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
