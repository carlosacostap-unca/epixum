'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function getTeamMessages(teamId: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user || !user.email) throw new Error('No autenticado')
        
        // Check permissions
        // 1. Check if user is in the team (Student)
        // We use course_enrollments because there is no team_members table
        const { data: studentEnrollment } = await supabase
            .from('course_enrollments')
            .select('id')
            .eq('team_id', teamId)
            .ilike('email', user.email)
            .single()

        let hasAccess = !!studentEnrollment

        if (!hasAccess) {
            // 2. Check if user is docente/nodocente in the course
            const { data: team } = await supabase
                .from('teams')
                .select('course_id')
                .eq('id', teamId)
                .single()
            
            if (team) {
                const { data: enrollment } = await supabase
                    .from('course_enrollments')
                    .select('role')
                    .eq('course_id', team.course_id)
                    .ilike('email', user.email)
                    .in('role', ['docente', 'nodocente', 'admin-institucion'])
                    .single()
                
                if (enrollment) {
                    hasAccess = true
                }
            }
        }

        if (!hasAccess) {
             throw new Error('No tienes permisos para ver este chat')
        }

        // Use Admin Client to fetch messages (bypassing RLS if needed for docentes)
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

        const { data, error } = await adminClient
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

        // Check permissions
        // 1. Check if user is in the team (Student)
        // We use course_enrollments because there is no team_members table
        const { data: studentEnrollment } = await supabase
            .from('course_enrollments')
            .select('id')
            .eq('team_id', teamId)
            .ilike('email', user.email)
            .single()

        let hasAccess = !!studentEnrollment

        if (!hasAccess) {
            // 2. Check if user is docente/nodocente in the course
            const { data: team } = await supabase
                .from('teams')
                .select('course_id')
                .eq('id', teamId)
                .single()
            
            if (team) {
                const { data: enrollment } = await supabase
                    .from('course_enrollments')
                    .select('role')
                    .eq('course_id', team.course_id)
                    .ilike('email', user.email)
                    .in('role', ['docente', 'nodocente', 'admin-institucion'])
                    .single()
                
                if (enrollment) {
                    hasAccess = true
                }
            }
        }

        if (!hasAccess) {
             throw new Error('No tienes permisos para enviar mensajes a este equipo')
        }

        // Use Admin Client to send message
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

        const { data, error } = await adminClient
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
