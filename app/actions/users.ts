'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw new Error('No autenticado')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('roles')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || !profile.roles?.includes('admin-plataforma')) {
    throw new Error('No autorizado: Requiere rol admin-plataforma')
  }

  return supabase
}

export async function getUsers() {
  try {
    const supabase = await checkAdmin()
    
    // 1. Get whitelist
    const { data: whitelist, error: wlError } = await supabase
      .from('whitelist')
      .select('*')
      .order('created_at', { ascending: false })

    if (wlError) throw wlError

    // 2. Get profiles to check effective roles
    // We get all profiles that match emails in whitelist (optimization possible but full scan for admin page is ok for now)
    const { data: profiles, error: prError } = await supabase
        .from('profiles')
        .select('email, roles')
    
    if (prError) throw prError

    // 3. Merge data: If a user has a profile, those are the effective roles.
    const profileMap = new Map(profiles.map(p => [p.email, p.roles]))

    const mergedData = whitelist.map(user => {
        const profileRoles = profileMap.get(user.email)
        // If profile exists, use its roles as they are the ones active in the system
        if (profileRoles) {
            return {
                ...user,
                roles: profileRoles
            }
        }
        return user
    })

    return { success: true, data: mergedData }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

export async function addUser(formData: FormData) {
  const email = formData.get('email') as string
  const rolesJson = formData.get('roles') as string // Recibimos JSON stringified array
  const first_name = formData.get('first_name') as string
  const last_name = formData.get('last_name') as string
  const dni = formData.get('dni') as string
  const birth_date = formData.get('birth_date') as string
  const phone = formData.get('phone') as string

  if (!email || !rolesJson) {
    return { success: false, error: 'Email y Roles son requeridos' }
  }

  let roles: string[] = []
  try {
      roles = JSON.parse(rolesJson)
      // Filtrar roles vacíos
      roles = roles.filter(r => r && r.trim() !== '')
  } catch {
      return { success: false, error: 'Formato de roles inválido' }
  }

  try {
    const supabase = await checkAdmin()
    const { error } = await supabase
      .from('whitelist')
      .insert({ 
        email, 
        roles,
        first_name: first_name || null,
        last_name: last_name || null,
        dni: dni || null,
        birth_date: birth_date || null,
        phone: phone || null
      })

    if (error) throw error
    revalidatePath('/')
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

export async function deleteUser(email: string) {
  try {
    const supabase = await checkAdmin()
    const { error } = await supabase
      .from('whitelist')
      .delete()
      .eq('email', email)

    if (error) throw error
    revalidatePath('/')
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

export async function updateUser(email: string, data: { 
    roles: string[], 
    first_name?: string, 
    last_name?: string, 
    dni?: string, 
    birth_date?: string, 
    phone?: string 
}) {
    try {
      const supabase = await checkAdmin()
      
      // Filtrar roles vacíos o inválidos
      const cleanRoles = data.roles.filter(r => r && r.trim() !== '')

      const updateData = {
        roles: cleanRoles,
        first_name: data.first_name || null,
        last_name: data.last_name || null,
        dni: data.dni || null,
        birth_date: data.birth_date || null,
        phone: data.phone || null
      }

      // 1. Update Whitelist
      const { error: wlError } = await supabase
        .from('whitelist')
        .update(updateData)
        .eq('email', email)
  
      if (wlError) throw wlError

      // 2. Update Profile (if exists) - Sync active roles and data
      // We don't fail if profile doesn't exist, but if it does, it must be updated.
      await supabase
        .from('profiles')
        .update(updateData)
        .eq('email', email)

      revalidatePath('/')
      return { success: true }
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message }
    }
  }
