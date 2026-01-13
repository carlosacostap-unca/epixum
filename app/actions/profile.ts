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

  const updateData: any = {}
  if (first_name !== null) updateData.first_name = first_name || null
  if (last_name !== null) updateData.last_name = last_name || null
  if (dni !== null) updateData.dni = dni || null
  if (birth_date !== null) updateData.birth_date = birth_date || null
  if (phone !== null) updateData.phone = phone || null

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, ...updateData })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  return { success: true }
}
