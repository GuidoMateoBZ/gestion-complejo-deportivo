'use server'

import { createClientAdmin } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function register(formData: FormData) {
    const supabase = await createClientAdmin()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string
    const nombre = formData.get('nombre') as string
    const dni = formData.get('dni') as string

    // Validar que las contraseñas coincidan
    if (password !== confirmPassword) {
        return { error: 'Las contraseñas no coinciden' }
    }

    // Validar DNI de 8 dígitos
    if (!/^\d{8}$/.test(dni)) {
        return { error: 'El DNI debe tener exactamente 8 dígitos' }
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
        return { error: 'La contraseña debe tener al menos 6 caracteres' }
    }

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                nombre,
                dni,
            },
        },
    })

    if (error) {
        return { error: error.message }
    }

    // Registro exitoso - redirigir al login con mensaje
    redirect('/login?registered=true')
}
