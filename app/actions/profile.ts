'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getMyProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function updateMyProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  const first_name = formData.get('first_name') as string
  const last_name = formData.get('last_name') as string
  const dni = formData.get('dni') as string
  const birth_date = formData.get('birth_date') as string
  const phone = formData.get('phone') as string
  const profile_completed = formData.get('profile_completed') === 'true'

  // Validate required fields if completing profile
  if (profile_completed) {
    if (!first_name || !last_name || !dni || !birth_date || !phone) {
      return { success: false, error: 'Todos los campos son obligatorios para completar el perfil.' }
    }
  }

  const updateData: any = {}
  if (first_name !== null) updateData.first_name = first_name || null
  if (last_name !== null) updateData.last_name = last_name || null
  if (dni !== null) updateData.dni = dni || null
  if (birth_date !== null) updateData.birth_date = birth_date || null
  if (phone !== null) updateData.phone = phone || null
  if (profile_completed) updateData.profile_completed = true

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, ...updateData })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  return { success: true }
}
