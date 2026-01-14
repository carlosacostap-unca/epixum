'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// Helper for Teacher access
async function checkTeacherAccess(courseId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !user.email) throw new Error('No autenticado')

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

    // Check if user is enrolled as docente in this course
    const { data: enrollment, error } = await adminClient
        .from('course_enrollments')
        .select('role')
        .eq('course_id', courseId)
        .eq('email', user.email)
        .eq('role', 'docente')
        .single()

    if (error || !enrollment) {
        throw new Error('No autorizado: No es docente de este curso')
    }
    
    return { supabase: adminClient, user }
}

export async function getTeams(courseId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user && user.email) {
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

        // Check if teacher
        const { data: teacherEnrollment } = await adminClient
            .from('course_enrollments')
            .select('id')
            .eq('course_id', courseId)
            .eq('email', user.email)
            .eq('role', 'docente')
            .single()

        if (teacherEnrollment) {
             const { data, error } = await adminClient
                .from('teams')
                .select('*')
                .eq('course_id', courseId)
                .order('name')
             if (error) {
                console.error('Error fetching teams:', error)
                return { success: false, error: error.message }
             }
             return { success: true, data }
        }
    }

    const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('course_id', courseId)
        .order('name')

    if (error) {
        console.error('Error fetching teams:', error)
        return { success: false, error: error.message }
    }

    return { success: true, data }
}

export async function createTeam(formData: FormData) {
    const courseId = formData.get('courseId') as string
    const name = formData.get('name') as string

    if (!courseId || !name) {
        return { success: false, error: 'Faltan campos requeridos' }
    }

    try {
        const { supabase } = await checkTeacherAccess(courseId)

        const { error } = await supabase
            .from('teams')
            .insert({
                course_id: courseId,
                name
            })

        if (error) throw error

        revalidatePath(`/teacher/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function deleteTeam(teamId: string, courseId: string) {
    try {
        const { supabase } = await checkTeacherAccess(courseId)

        const { error } = await supabase
            .from('teams')
            .delete()
            .eq('id', teamId)
            .eq('course_id', courseId)

        if (error) throw error

        revalidatePath(`/teacher/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function assignStudentToTeam(courseId: string, email: string, teamId: string) {
    try {
        const { supabase } = await checkTeacherAccess(courseId)

        // Ensure student is in the course
        // (This check is implicitly done by the update, but good to be explicit or handle error)
        
        // Update enrollment
        const { error } = await supabase
            .from('course_enrollments')
            .update({ team_id: teamId })
            .eq('course_id', courseId)
            .eq('email', email)
            .in('role', ['estudiante', 'alumno']) // Handle legacy role name if any

        if (error) throw error

        revalidatePath(`/teacher/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function removeStudentFromTeam(courseId: string, email: string) {
    try {
        const { supabase } = await checkTeacherAccess(courseId)

        const { error } = await supabase
            .from('course_enrollments')
            .update({ team_id: null })
            .eq('course_id', courseId)
            .eq('email', email)
            .in('role', ['estudiante', 'alumno'])

        if (error) throw error

        revalidatePath(`/teacher/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getTeamMembers(courseId: string) {
    try {
        const { supabase } = await checkTeacherAccess(courseId)
        
        // Fetch students with their team_id
        const { data, error } = await supabase
            .from('course_enrollments')
            .select('email, team_id')
            .eq('course_id', courseId)
            .in('role', ['estudiante', 'alumno'])

        if (error) throw error
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

// Helper for Student access
async function checkStudentAccess(courseId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !user.email) throw new Error('No autenticado')

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

    // Check if supervisor
    const { data: profile } = await supabase
        .from('profiles')
        .select('roles')
        .eq('email', user.email)
        .single()

    if (profile?.roles?.includes('supervisor')) {
        // Return dummy enrollment for supervisor (no team)
        return { 
            supabase: adminClient, 
            user, 
            enrollment: { id: 'supervisor-bypass', team_id: null } 
        }
    }

    // Check if user is enrolled as student in this course
    const { data: enrollment, error } = await adminClient
        .from('course_enrollments')
        .select('id, team_id')
        .eq('course_id', courseId)
        .eq('email', user.email)
        .in('role', ['estudiante', 'alumno'])
        .single()

    if (error || !enrollment) {
        throw new Error('No autorizado: No es estudiante de este curso')
    }
    
    return { supabase: adminClient, user, enrollment }
}

export async function getStudentTeam(courseId: string) {
    try {
        const { supabase, enrollment } = await checkStudentAccess(courseId)
        
        if (!enrollment.team_id) {
            return { success: true, data: null }
        }

        // Fetch team details
        const { data: team, error: teamError } = await supabase
            .from('teams')
            .select('*')
            .eq('id', enrollment.team_id)
            .single()

        if (teamError) throw teamError

        // Fetch team members
        const { data: members, error: membersError } = await supabase
            .from('course_enrollments')
            .select('email')
            .eq('team_id', enrollment.team_id)
            .in('role', ['estudiante', 'alumno'])

        if (membersError) throw membersError

        // Fetch profiles for members
        const emails = members.map(m => m.email)
        const { data: profiles } = await supabase
            .from('profiles')
            .select('email, first_name, last_name')
            .in('email', emails)

        // 1. Fetch assignments for the course (to calculate progress)
        const { data: assignments, error: assignmentsError } = await supabase
            .from('assignments')
            .select('id, title, due_date')
            .eq('course_id', courseId)
            .order('due_date', { ascending: true })
            
        if (assignmentsError) throw assignmentsError

        // 2. Fetch submissions for all team members
        const { data: submissions, error: submissionsError } = await supabase
            .from('assignment_submissions')
            .select('assignment_id, student_email, grade, submitted_at')
            .in('student_email', emails)
            .in('assignment_id', assignments.map(a => a.id))

        if (submissionsError) throw submissionsError

        // Merge profiles with members and progress
        const membersWithProfiles = members.map(m => {
            const profile = profiles?.find(p => p.email === m.email)
            const memberSubmissions = submissions?.filter(s => s.student_email === m.email) || []
            
            // Map submissions to assignments to show status
            const progress = assignments.map(assignment => {
                const sub = memberSubmissions.find(s => s.assignment_id === assignment.id)
                return {
                    assignment_id: assignment.id,
                    assignment_title: assignment.title,
                    status: sub ? (sub.grade ? 'Calificado' : 'Entregado') : 'Pendiente',
                    grade: sub?.grade,
                    submitted_at: sub?.submitted_at
                }
            })

            return {
                email: m.email,
                first_name: profile?.first_name,
                last_name: profile?.last_name,
                progress // New field
            }
        })

        return { 
            success: true, 
            data: {
                ...team,
                members: membersWithProfiles
            } 
        }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}
