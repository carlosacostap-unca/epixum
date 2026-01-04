'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function checkPlatformAdmin() {
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

export async function checkInstitutionAdmin() {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('No autenticado')
    }
  
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('roles, email')
      .eq('id', user.id)
      .single()
  
    if (profileError || !profile) {
        throw new Error('Perfil no encontrado')
    }
    
    const hasPlatformAdmin = profile.roles?.includes('admin-plataforma')
    const hasInstitutionAdmin = profile.roles?.includes('admin-institucion')
  
    if (!hasPlatformAdmin && !hasInstitutionAdmin) {
      throw new Error('No autorizado')
    }
  
    return { supabase, user, profile }
  }

export async function getInstitutionsForUser() {
    try {
        const { supabase, profile } = await checkInstitutionAdmin()

        // Siempre filtramos por las instituciones asignadas explícitamente,
        // incluso si es admin de plataforma (para que la vista de "Mis Instituciones" sea correcta).
        const { data, error } = await supabase
            .from('instituciones')
            .select('*, institution_roles!inner(role)')
            .eq('institution_roles.email', profile.email)
            .eq('institution_roles.role', 'admin-institucion')
            .order('created_at', { ascending: false })
        
        if (error) throw error
        return { success: true, data }
        
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getInstitutions() {
  try {
    const supabase = await checkPlatformAdmin()
    // Obtenemos instituciones y sus roles asociados (admins)
    const { data, error } = await supabase
      .from('instituciones')
      .select(`
        *,
        institution_roles (
            email,
            role
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

export async function addInstitution(formData: FormData) {
  const nombre = formData.get('nombre') as string

  if (!nombre || nombre.trim() === '') {
    return { success: false, error: 'El nombre es requerido' }
  }

  try {
    const supabase = await checkPlatformAdmin()
    const { error } = await supabase
      .from('instituciones')
      .insert({ nombre: nombre.trim() })

    if (error) throw error
    revalidatePath('/')
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

export async function deleteInstitution(id: string) {
  try {
    const supabase = await checkPlatformAdmin()
    const { error } = await supabase
      .from('instituciones')
      .delete()
      .eq('id', id)

    if (error) throw error
    revalidatePath('/')
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

export async function updateInstitution(id: string, nombre: string) {
    if (!nombre || nombre.trim() === '') {
        return { success: false, error: 'El nombre es requerido' }
    }

    try {
      const supabase = await checkPlatformAdmin()
      const { error } = await supabase
        .from('instituciones')
        .update({ nombre: nombre.trim() })
        .eq('id', id)
  
      if (error) throw error
      revalidatePath('/')
      return { success: true }
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message }
    }
  }

export async function assignAdminToInstitution(institutionId: string, email: string) {
    if (!email || !institutionId) {
        return { success: false, error: 'Email e Institución son requeridos' }
    }

    try {
        const supabase = await checkPlatformAdmin()
        
        // 1. Asegurar que el usuario esté en la whitelist (si no está, agregarlo)
        const { data: whitelistUser, error: whitelistError } = await supabase
            .from('whitelist')
            .select('roles')
            .eq('email', email)
            .single()
        
        if (whitelistError || !whitelistUser) {
             // Agregar a whitelist con rol 'admin-institucion' por defecto
             // NOTA: 'admin-institucion' en whitelist es opcional si solo dependemos de institution_roles,
             // pero útil para lógica global.
             const { error: insertError } = await supabase
                .from('whitelist')
                .insert({ email, roles: ['admin-institucion'] })
             
             if (insertError) throw insertError
        } else {
             // Si ya existe, asegurar que tenga el rol 'admin-institucion' en su array global (opcional)
             if (!whitelistUser.roles?.includes('admin-institucion')) {
                 const newRoles = [...(whitelistUser.roles || []), 'admin-institucion']
                 await supabase
                    .from('whitelist')
                    .update({ roles: newRoles })
                    .eq('email', email)
                 
                 // También actualizar profiles si existe
                 await supabase
                    .from('profiles')
                    .update({ roles: newRoles })
                    .eq('email', email)
             }
        }

        // 2. Crear la relación en institution_roles
        const { error: relationError } = await supabase
            .from('institution_roles')
            .insert({
                institution_id: institutionId,
                email: email,
                role: 'admin-institucion'
            })
            // Si ya existe, no hacer nada (ignorar error de duplicado sería ideal, pero insert fallará)

        if (relationError) {
             // Si el error es violación de unique constraint (ya asignado), lo tratamos como éxito
             if (relationError.code === '23505') { // unique_violation
                 return { success: true, message: 'Usuario ya asignado' }
             }
             throw relationError
        }

        revalidatePath('/')
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function removeAdminFromInstitution(institutionId: string, email: string) {
    try {
        const supabase = await checkPlatformAdmin()
        
        // 1. Eliminar la relación específica
        const { error } = await supabase
            .from('institution_roles')
            .delete()
            .match({ institution_id: institutionId, email: email, role: 'admin-institucion' })

        if (error) throw error

        // 2. Verificar si le quedan otras instituciones administradas
        const { count, error: countError } = await supabase
            .from('institution_roles')
            .select('*', { count: 'exact', head: true })
            .eq('email', email)
            .eq('role', 'admin-institucion')
        
        if (countError) throw countError

        // 3. Si ya no administra ninguna (count === 0), quitar el rol global
        if (count === 0) {
            // Actualizar whitelist
            const { data: whitelistUser } = await supabase
                .from('whitelist')
                .select('roles')
                .eq('email', email)
                .single()
            
            if (whitelistUser && whitelistUser.roles?.includes('admin-institucion')) {
                const newRoles = whitelistUser.roles.filter((r: string) => r !== 'admin-institucion')
                await supabase
                    .from('whitelist')
                    .update({ roles: newRoles })
                    .eq('email', email)
            }

            // Actualizar profiles (si existe perfil activo)
            const { data: profileUser } = await supabase
                .from('profiles')
                .select('roles')
                .eq('email', email)
                .single()
            
            if (profileUser && profileUser.roles?.includes('admin-institucion')) {
                const newRoles = profileUser.roles.filter((r: string) => r !== 'admin-institucion')
                await supabase
                    .from('profiles')
                    .update({ roles: newRoles })
                    .eq('email', email)
            }
        }

        revalidatePath('/')
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}
