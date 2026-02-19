'use server'

import { createClientAdmin } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function register(formData: FormData) {
    const supabase = await createClientAdmin()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string
    const nombre = formData.get('nombre') as string
    const dniInput = formData.get('dni') as string
    const dni = parseInt(dniInput, 10)

    // Validar que las contraseñas coincidan
    if (password !== confirmPassword) {
        return { error: 'Las contraseñas no coinciden' }
    }

    // Validar DNI válido y longitud correcta (7 a 8 dígitos)
    if (isNaN(dni) || dniInput.length < 7 || dniInput.length > 8) {
        return { error: 'El DNI debe tener entre 7 y 8 dígitos numéricos válidos.' }
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
        return { error: 'La contraseña debe tener al menos 6 caracteres' }
    }

    // Verificar DNI explícitamente
    const { data: usuarioPorDni } = await supabase
        .from('usuarios')
        .select('dni')
        .eq('dni', dni)
        .maybeSingle()
    
    if (usuarioPorDni) {
        return { error: 'El DNI ingresado ya pertenece a un usuario registrado.' }
    }

    // Verificar Email explícitamente
    const { data: usuarioPorEmail } = await supabase
        .from('usuarios')
        .select('email')
        .eq('email', email.trim())
        .maybeSingle()

    if (usuarioPorEmail) {
        return { error: 'Este correo electrónico ya está registrado en el sistema.' }
    }

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                nombre,
                dni, // Ya es un número entero
            },
        },
    })

    if (error) {
        console.error('Error en registro:', error)
        
        if (error.message.includes('User already registered')) {
             return { error: 'Este correo electrónico ya está registrado.' }
        }
        
        if (error.message.includes('Database error')) {
             return { error: 'Error al registrar: El DNI o Email podría estar duplicado en el sistema.' }
        }
        
        return { error: error.message }
    }

    // Registro exitoso - redirigir al login con mensaje
    redirect('/login?registered=true')
}
