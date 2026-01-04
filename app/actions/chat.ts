'use server'

import { createClient } from '@/utils/supabase/server'

export async function getTeamMessages(teamId: string) {
    try {
        const supabase = await createClient()
        
        const { data, error } = await supabase
            .from('team_messages')
            .select('*')
            .eq('team_id', teamId)
            .order('created_at', { ascending: true })
        
        if (error) {
            console.error("Error in getTeamMessages:", error)
            throw error
        }
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function sendMessage(teamId: string, content: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user || !user.email) throw new Error('No autenticado')

        const { data, error } = await supabase
            .from('team_messages')
            .insert({
                team_id: teamId,
                content,
                user_email: user.email
            })
            .select()
            .single()

        if (error) throw error
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}
