'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

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

    // Check if user is enrolled as docente in this course using Admin Client
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

export async function createSprintReview(formData: FormData) {
    const courseId = formData.get('courseId') as string
    const sprintId = formData.get('sprintId') as string
    const studentEmail = formData.get('studentEmail') as string
    const startDate = formData.get('startDate') as string
    const endDate = formData.get('endDate') as string

    if (!courseId || !sprintId || !studentEmail || !startDate || !endDate) {
        return { success: false, error: 'Faltan campos requeridos' }
    }

    try {
        const { supabase } = await checkTeacherAccess(courseId)
        
        const { error } = await supabase
            .from('sprint_reviews')
            .insert({
                sprint_id: sprintId,
                student_email: studentEmail,
                start_date: startDate,
                end_date: endDate
            })

        if (error) throw error
        
        revalidatePath(`/teacher/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getSprintReviews(courseId: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user || !user.email) throw new Error('No autenticado')

        // Use admin client for teacher check
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
             // Get all reviews for sprints in this course
             const { data, error } = await adminClient
                .from('sprint_reviews')
                .select(`
                    *,
                    sprints!inner(course_id, title)
                `)
                .eq('sprints.course_id', courseId)
                .order('start_date', { ascending: true })

             if (error) throw error
             return { success: true, data }
        }
        
        return { success: false, error: 'No autorizado' }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function deleteSprintReview(reviewId: string, courseId: string) {
    try {
        const { supabase } = await checkTeacherAccess(courseId)
        
        const { error } = await supabase
            .from('sprint_reviews')
            .delete()
            .eq('id', reviewId)

        if (error) throw error
        
        revalidatePath(`/teacher/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}
