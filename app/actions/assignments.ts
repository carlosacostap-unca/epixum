'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function getAdminClient() {
    return createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
}

async function checkAuth() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.email) throw new Error('No autenticado')
    return { supabase, user }
}

export async function getAssignments(courseId: string) {
    try {
        const { supabase } = await checkAuth()

        const { data, error } = await supabase
            .from('assignments')
            .select('*')
            .eq('course_id', courseId)
            .order('due_date', { ascending: true })

        if (error) throw error
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getStudentAssignments(courseId: string) {
    try {
        const { user } = await checkAuth()
        const adminClient = getAdminClient()

        // Verify enrollment (check for both 'estudiante' and 'alumno' to support migration states)
        const { data: enrollment, error: enrollmentError } = await adminClient
            .from('course_enrollments')
            .select('id')
            .eq('course_id', courseId)
            .ilike('email', user.email!)
            .in('role', ['estudiante', 'alumno', 'Estudiante', 'Alumno'])
            .single()

        if (enrollmentError || !enrollment) {
            throw new Error('No estás matriculado en este curso')
        }

        const { data, error } = await adminClient
            .from('assignments')
            .select('*')
            .eq('course_id', courseId)
            .order('due_date', { ascending: true })

        if (error) throw error
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function createAssignment(courseId: string, title: string, description: string, dueDate: string) {
    try {
        const { supabase } = await checkAuth()

        const { error } = await supabase
            .from('assignments')
            .insert({
                course_id: courseId,
                title,
                description,
                due_date: dueDate
            })

        if (error) throw error
        
        revalidatePath(`/teacher/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function deleteAssignment(assignmentId: string, courseId: string) {
    try {
        const { supabase } = await checkAuth()

        const { error } = await supabase
            .from('assignments')
            .delete()
            .eq('id', assignmentId)

        if (error) throw error
        
        revalidatePath(`/teacher/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getAssignmentSubmissions(assignmentId: string) {
    try {
        const { supabase } = await checkAuth()

        const { data, error } = await supabase
            .from('assignment_submissions')
            .select('*')
            .eq('assignment_id', assignmentId)
            .order('submitted_at', { ascending: false })

        if (error) throw error
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function updateSubmissionGrade(submissionId: string, grade: string) {
    try {
        const { supabase } = await checkAuth()

        const { error } = await supabase
            .from('assignment_submissions')
            .update({ grade })
            .eq('id', submissionId)

        if (error) throw error
        
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getMyCourseSubmissions(courseId: string) {
    try {
        const { supabase, user } = await checkAuth()

        const { data, error } = await supabase
            .from('assignment_submissions')
            .select('*, assignments!inner(course_id)')
            .eq('assignments.course_id', courseId)
            .eq('student_email', user.email)

        if (error) throw error
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function submitAssignment(assignmentId: string, content: string, fileUrl: string) {
    try {
        const { supabase, user } = await checkAuth()

        // Check if exists to update or insert
        const { data: existing } = await supabase
            .from('assignment_submissions')
            .select('id')
            .eq('assignment_id', assignmentId)
            .eq('student_email', user.email)
            .single()

        let error
        if (existing) {
             const result = await supabase
                .from('assignment_submissions')
                .update({
                    content,
                    file_url: fileUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
             error = result.error
        } else {
             const result = await supabase
                .from('assignment_submissions')
                .insert({
                    assignment_id: assignmentId,
                    student_email: user.email,
                    content,
                    file_url: fileUrl
                })
             error = result.error
        }

        if (error) throw error
        
        revalidatePath(`/student/courses`) // Revalidate broadly or specific course
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

// Assignment Resources Actions

export async function getAssignmentResources(assignmentId: string) {
    try {
        const { supabase } = await checkAuth()

        const { data, error } = await supabase
            .from('assignment_resources')
            .select('*')
            .eq('assignment_id', assignmentId)
            .order('created_at', { ascending: true })

        if (error) throw error
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function createAssignmentResource(assignmentId: string, title: string, url: string, type: string) {
    try {
        const { supabase } = await checkAuth()

        const { error } = await supabase
            .from('assignment_resources')
            .insert({
                assignment_id: assignmentId,
                title,
                url,
                type
            })

        if (error) throw error
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function deleteAssignmentResource(resourceId: string) {
    try {
        const { supabase } = await checkAuth()

        const { error } = await supabase
            .from('assignment_resources')
            .delete()
            .eq('id', resourceId)

        if (error) throw error
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}
