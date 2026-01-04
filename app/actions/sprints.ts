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

export async function createSprint(formData: FormData) {
    const courseId = formData.get('courseId') as string
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const startDate = formData.get('startDate') as string
    const endDate = formData.get('endDate') as string

    if (!courseId || !title || !startDate || !endDate) {
        return { success: false, error: 'Faltan campos requeridos' }
    }

    try {
        const { supabase } = await checkTeacherAccess(courseId)
        
        const { error } = await supabase
            .from('sprints')
            .insert({
                course_id: courseId,
                title,
                description,
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

export async function getSprints(courseId: string) {
    try {
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
                    .from('sprints')
                    .select('*')
                    .eq('course_id', courseId)
                    .order('start_date', { ascending: true })
                 if (error) throw error
                 return { success: true, data }
            }
        }
        
        const { data, error } = await supabase
            .from('sprints')
            .select('*')
            .eq('course_id', courseId)
            .order('start_date', { ascending: true })

        if (error) throw error
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function deleteSprint(sprintId: string, courseId: string) {
    try {
        const { supabase } = await checkTeacherAccess(courseId)
        
        const { error } = await supabase
            .from('sprints')
            .delete()
            .eq('id', sprintId)

        if (error) throw error
        
        revalidatePath(`/teacher/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}
