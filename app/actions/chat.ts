'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function getTeamMessages(teamId: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user || !user.email) throw new Error('No autenticado')
        
        // Use Admin Client for permission checks to avoid RLS issues (especially with case sensitivity)
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

        // Check permissions
        // 1. Check if user is in the team (Student)
        // We use course_enrollments because there is no team_members table
        const { data: studentEnrollment } = await adminClient
            .from('course_enrollments')
            .select('id')
            .eq('team_id', teamId)
            .ilike('email', user.email)
            .single()

        let hasAccess = !!studentEnrollment

        if (!hasAccess) {
            // 2. Check if user is docente/nodocente in the course
            const { data: team } = await adminClient
                .from('teams')
                .select('course_id')
                .eq('id', teamId)
                .single()
            
            if (team) {
                // Check course enrollment roles
                const { data: enrollment } = await adminClient
                    .from('course_enrollments')
                    .select('role')
                    .eq('course_id', team.course_id)
                    .ilike('email', user.email)
                    .in('role', ['docente', 'nodocente', 'admin-institucion'])
                    .single()
                
                if (enrollment) {
                    hasAccess = true
                } else {
                    // Also check global roles (admin-plataforma, admin-institucion)
                    // This is important because admins might not be enrolled in the course
                     const { data: profile } = await adminClient
                        .from('profiles')
                        .select('roles')
                        .eq('email', user.email)
                        .single()
                    
                    const isAdmin = profile?.roles?.some((r: string) => ['admin-plataforma', 'admin-institucion'].includes(r))
                    if (isAdmin) {
                        hasAccess = true
                    }
                }
            }
        }

        if (!hasAccess) {
             throw new Error('No tienes permisos para ver este chat')
        }

        // Fetch messages
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

        // Use Admin Client for permission checks
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

        // Check permissions
        // 1. Check if user is in the team (Student)
        const { data: studentEnrollment } = await adminClient
            .from('course_enrollments')
            .select('id')
            .eq('team_id', teamId)
            .ilike('email', user.email)
            .single()

        let hasAccess = !!studentEnrollment

        if (!hasAccess) {
            // 2. Check if user is docente/nodocente in the course
            const { data: team } = await adminClient
                .from('teams')
                .select('course_id')
                .eq('id', teamId)
                .single()
            
            if (team) {
                const { data: enrollment } = await adminClient
                    .from('course_enrollments')
                    .select('role')
                    .eq('course_id', team.course_id)
                    .ilike('email', user.email)
                    .in('role', ['docente', 'nodocente', 'admin-institucion'])
                    .single()
                
                if (enrollment) {
                    hasAccess = true
                } else {
                    // Check for admin/guest roles
                    const { data: profile } = await adminClient
                        .from('profiles')
                        .select('roles')
                        .eq('email', user.email)
                        .single()
                    
                    const isAdmin = profile?.roles?.some((r: string) => ['admin-plataforma', 'admin-institucion'].includes(r))
                    if (isAdmin) {
                        hasAccess = true
                    }
                }
            }
        }

        if (!hasAccess) {
             throw new Error('No tienes permisos para enviar mensajes a este equipo')
        }

        // Send message
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
