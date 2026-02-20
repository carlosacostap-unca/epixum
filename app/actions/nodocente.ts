'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// Helper to check if current user is nodocente
async function checkNodocenteAccess() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('No autenticado')

    const { data: profile } = await supabase
        .from('profiles')
        .select('roles')
        .eq('id', user.id)
        .single()

    if (!profile || !profile.roles || !profile.roles.includes('nodocente')) {
        throw new Error('No autorizado: Requiere rol nodocente')
    }

    // Use Admin Client for user management operations
    const adminClient = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
    
    return { supabase: adminClient, user }
}

export async function getAdmissionsRequests() {
    try {
        const { supabase } = await checkNodocenteAccess()

        // Fetch profiles that have completed their profile but haven't been processed
        // We assume 'request_processed' is false or null
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('profile_completed', true)
            .is('request_processed', false) 
            .order('created_at', { ascending: false })
        
        // Also fetch those where request_processed is null (for backward compatibility if needed, though default is false)
        const { data: dataNull, error: errorNull } = await supabase
            .from('profiles')
            .select('*')
            .eq('profile_completed', true)
            .is('request_processed', null)
            .order('created_at', { ascending: false })

        if (error) throw error
        
        const combinedData = [...(data || []), ...(dataNull || [])]
        
        // Remove duplicates if any (though logic above shouldn't produce overlap)
        const uniqueData = Array.from(new Map(combinedData.map(item => [item.id, item])).values())

        return { success: true, data: uniqueData }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function processAdmissionRequest(userId: string) {
    try {
        const { supabase } = await checkNodocenteAccess()

        const { error } = await supabase
            .from('profiles')
            .update({ request_processed: true })
            .eq('id', userId)

        if (error) throw error

        revalidatePath('/nodocente/admissions')
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}
