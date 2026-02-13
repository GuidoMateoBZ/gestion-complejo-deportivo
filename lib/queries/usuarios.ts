import { createClient } from '@/lib/supabase/server'
import { Usuario } from '@/types'

export async function getUsuarioActual(): Promise<Usuario | null> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id_usuario', user.id)
        .single()

    if (error) {
        console.error('Error fetching usuario:', error)
        return null
    }

    return data as Usuario
}

interface ObtenerUsuariosParams {
    search?: string
    dni?: string
    estado?: string
    id?: string
    email?: string
}

export async function obtenerUsuarios({ search, dni, estado, id, email }: ObtenerUsuariosParams = {}): Promise<Usuario[]> {
    const supabase = await createClient()

    let query = supabase.from('usuarios').select('*')

    if (id) {
        query = query.eq('id_usuario', id)
    }

    if (email) {
        query = query.eq('email_usuario', email)
    }
    
    if (estado === 'habilitados') {
        query = query.eq('habilitado', true)
    } else if (estado === 'infractores') {
        query = query.eq('habilitado', false)
    }

    if (dni) {
         const dniNum = parseInt(dni)
         if (!isNaN(dniNum)) {
            query = query.eq('dni_usuario', dniNum)
         }
    }

    query = query.neq('rol', 'administrador')

    if (search) {
        query = query.or(`nombre_usuario.ilike.%${search}%,email_usuario.ilike.%${search}%`)
    }

    query = query.order('nombre_usuario', { ascending: true })

    const { data, error } = await query

    if (error) {
        console.error('Error fetching usuarios:', error)
        return []
    }

    return data as Usuario[]
}

export async function obtenerUsuario(params: ObtenerUsuariosParams): Promise<Usuario | null> {
    const usuarios = await obtenerUsuarios(params)
    return usuarios.length > 0 ? usuarios[0] : null
}

export async function obtenerUsuarioPorId(id_usuario: string): Promise<Usuario | null> {
    const usuarios = await obtenerUsuarios({ id: id_usuario })
    return usuarios.length > 0 ? usuarios[0] : null
}
