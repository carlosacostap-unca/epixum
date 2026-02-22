'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

async function checkStudentAccess(courseId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !user.email) throw new Error('No autenticado')

    // Check if user is enrolled as student in this course
    const { data: enrollments, error } = await supabase
        .from('course_enrollments')
        .select('role, team_id')
        .eq('course_id', courseId)
        .ilike('email', user.email)
        .in('role', ['estudiante', 'alumno'])
    
    // Pick the one with a team_id if available, or just the first one
    const enrollment = enrollments?.find(e => e.team_id) || enrollments?.[0]

    if (error || !enrollment) {
        throw new Error('No autorizado: No es estudiante de este curso')
    }
    
    return { supabase, user, enrollment }
}

async function checkTeamManagementAccess(courseId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !user.email) throw new Error('No autenticado')

    // Check if user is enrolled as docente or nodocente in this course
    // We need to check both because this might be used by either
    const { data: enrollments, error } = await supabase
        .from('course_enrollments')
        .select('role')
        .eq('course_id', courseId)
        .ilike('email', user.email)
        .in('role', ['docente', 'nodocente', 'admin-institucion'])

    if (error || !enrollments || enrollments.length === 0) {
        throw new Error('No autorizado: No tienes permisos para gestionar equipos en este curso')
    }

    // Use Admin Client for operations to ensure we can modify teams and enrollments freely
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

export async function getStudentTeam(courseId: string) {
    try {
        const { supabase, enrollment } = await checkStudentAccess(courseId)
        
        if (!enrollment.team_id) {
            return { success: true, data: null }
        }

        // Initialize admin client to bypass RLS for team members fetching
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

        // Fetch team details and course settings
        const { data: teamData, error: teamError } = await adminClient
            .from('teams')
            .select('id, name, courses(has_sprints)')
            .eq('id', enrollment.team_id)
            .single()

        if (teamError) throw teamError
        
        const team = {
            id: teamData.id,
            name: teamData.name
        }
        // @ts-ignore
        const hasSprints = teamData.courses?.has_sprints || false

        // Fetch members enrollments to get emails (using admin client to see all members)
        const { data: membersEnrollments, error: membersError } = await adminClient
            .from('course_enrollments')
            .select('email')
            .eq('team_id', team.id)

        if (membersError) throw membersError

        const memberEmails = membersEnrollments.map(m => m.email)

        // Fetch profiles for these emails
        const { data: profiles, error: profilesError } = await adminClient
            .from('profiles')
            .select('id, email, first_name, last_name, avatar_url')
            .in('email', memberEmails)

        if (profilesError) throw profilesError

        // Fetch assignments for the course (needed for progress)
        const { data: assignments } = await supabase
            .from('assignments')
            .select('id, title, due_date')
            .eq('course_id', courseId)
            .order('due_date', { ascending: true })
        
        // Fetch submissions for all members
        const { data: submissions } = await adminClient
            .from('assignment_submissions')
            .select('assignment_id, student_email, grade, submitted_at, file_url')
            .in('student_email', memberEmails)
            .in('assignment_id', assignments?.map(a => a.id) || [])

        // Map members
        const members = profiles.map(profile => {
            // Calculate progress
            const memberSubmissions = submissions?.filter(s => s.student_email === profile.email) || []
            const progress = assignments?.map(assignment => {
                const sub = memberSubmissions.find(s => s.assignment_id === assignment.id)
                let status = 'Pendiente'
                
                if (sub) {
                    // Si tiene entrega, es Entregado (o Calificado si no es sprint)
                    status = hasSprints ? 'Entregado' : (sub.grade ? 'Calificado' : 'Entregado')
                } else {
                    // Si no tiene entrega, verificar vencimiento solo para cursos normales
                    if (!hasSprints && new Date() > new Date(assignment.due_date)) {
                        status = 'Vencido'
                    }
                }

                return {
                    assignment_id: assignment.id,
                    assignment_title: assignment.title,
                    status,
                    grade: sub?.grade,
                    submitted_at: sub?.submitted_at
                }
            }) || []

            return {
                id: profile.id,
                email: profile.email,
                first_name: profile.first_name,
                last_name: profile.last_name,
                avatar_url: profile.avatar_url,
                progress
            }
        })

        return {
            success: true,
            data: {
                id: team.id,
                name: team.name,
                members
            }
        }

    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getTeamMemberDetails(courseId: string, memberId: string) {
    try {
        const { supabase, enrollment } = await checkStudentAccess(courseId)
        
        if (!enrollment.team_id) {
            throw new Error('No tienes equipo asignado')
        }

        // Use Admin Client to bypass RLS when checking other students' data
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

        // 1. Verify the target member is in the same team
        const { data: targetProfile, error: profileError } = await adminClient
            .from('profiles')
            .select('id, email, first_name, last_name, avatar_url, phone')
            .eq('id', memberId)
            .single()

        if (profileError || !targetProfile) throw new Error('Compañero no encontrado')

        // Verify target is in the team
        // We fetch ALL enrollments for the target user in this course and check if ANY matches the team_id
        const { data: targetEnrollments, error: enrollmentError } = await adminClient
            .from('course_enrollments')
            .select('team_id')
            .eq('course_id', courseId)
            .ilike('email', targetProfile.email)

        if (enrollmentError || !targetEnrollments) {
             throw new Error('Error al verificar equipo del compañero')
        }

        const isTeammate = targetEnrollments.some(e => e.team_id === enrollment.team_id)

        if (!isTeammate) {
             throw new Error(`Este estudiante no pertenece a tu equipo`)
        }

        // 2. Fetch assignments (using normal client is fine, public course data)
        const { data: assignments, error: assignmentsError } = await supabase
            .from('assignments')
            .select('id, title, description, due_date')
            .eq('course_id', courseId)
            .order('due_date', { ascending: true })
            
        if (assignmentsError) throw assignmentsError

        // Fetch course details for sprint check
        const { data: courseData } = await adminClient
            .from('courses')
            .select('has_sprints')
            .eq('id', courseId)
            .single()
        
        const hasSprints = courseData?.has_sprints || false

        // 3. Fetch submissions for this student (using admin client to bypass RLS)
        const { data: submissions, error: submissionsError } = await adminClient
            .from('assignment_submissions')
            .select('assignment_id, grade, submitted_at, file_url, content')
            .eq('student_email', targetProfile.email)
            .in('assignment_id', assignments.map(a => a.id))

        if (submissionsError) throw submissionsError

        // 4. Combine data
        const progress = assignments.map(assignment => {
            const sub = submissions?.find(s => s.assignment_id === assignment.id)
            let status = 'Pendiente'
            
            if (sub) {
                status = hasSprints ? 'Entregado' : (sub.grade ? 'Calificado' : 'Entregado')
            } else {
                if (!hasSprints && new Date() > new Date(assignment.due_date)) {
                    status = 'Vencido'
                }
            }

            return {
                assignment_id: assignment.id,
                assignment_title: assignment.title,
                assignment_description: assignment.description,
                due_date: assignment.due_date,
                status,
                grade: sub?.grade,
                submitted_at: sub?.submitted_at,
                file_url: sub?.file_url,
                content: sub?.content
            }
        })

        return {
            success: true,
            data: {
                profile: targetProfile,
                progress,
                has_sprints: hasSprints
            }
        }

    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

// --- Team Management Actions ---

export async function getTeams(courseId: string) {
    try {
        const { supabase } = await checkTeamManagementAccess(courseId)

        const { data: teams, error } = await supabase
            .from('teams')
            .select('*')
            .eq('course_id', courseId)
            .order('created_at', { ascending: true })

        if (error) throw error

        return { success: true, data: teams }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function createTeam(formData: FormData) {
    try {
        const courseId = formData.get('courseId') as string
        const name = formData.get('name') as string

        if (!courseId || !name) throw new Error('Datos incompletos')

        const { supabase } = await checkTeamManagementAccess(courseId)

        const { data, error } = await supabase
            .from('teams')
            .insert({
                course_id: courseId,
                name: name
            })
            .select()
            .single()

        if (error) throw error

        revalidatePath(`/nodocente/courses/${courseId}`)
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function deleteTeam(teamId: string, courseId: string) {
    try {
        const { supabase } = await checkTeamManagementAccess(courseId)

        // First, unassign all students from this team
        const { error: unassignError } = await supabase
            .from('course_enrollments')
            .update({ team_id: null })
            .eq('team_id', teamId)
            .eq('course_id', courseId) // Safety check

        if (unassignError) throw unassignError

        // Then delete the team
        const { error } = await supabase
            .from('teams')
            .delete()
            .eq('id', teamId)

        if (error) throw error

        revalidatePath(`/nodocente/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function assignStudentToTeam(studentEmail: string, teamId: string, courseId: string) {
    try {
        const { supabase } = await checkTeamManagementAccess(courseId)

        const { error } = await supabase
            .from('course_enrollments')
            .update({ team_id: teamId })
            .eq('course_id', courseId)
            .ilike('email', studentEmail)

        if (error) throw error

        revalidatePath(`/nodocente/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function removeStudentFromTeam(studentEmail: string, courseId: string) {
    try {
        const { supabase } = await checkTeamManagementAccess(courseId)

        const { error } = await supabase
            .from('course_enrollments')
            .update({ team_id: null })
            .eq('course_id', courseId)
            .ilike('email', studentEmail)

        if (error) throw error

        revalidatePath(`/nodocente/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}
