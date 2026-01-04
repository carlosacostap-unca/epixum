'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// Helper to check if user is a teacher for the course (or at least authenticated, relying on RLS)
// But for good UX/Server Action pattern, we should verify basic auth.
async function checkAuth() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.email) throw new Error('No autenticado')
    return { supabase, user }
}

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

export async function getClasses(courseId: string) {
    try {
        const { supabase } = await checkAuth()

        const { data, error } = await supabase
            .from('classes')
            .select('*')
            .eq('course_id', courseId)
            .order('date', { ascending: true })

        if (error) throw error
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function createClass(courseId: string, title: string, description: string, date: string) {
    try {
        const { supabase } = await checkAuth()

        const { error } = await supabase
            .from('classes')
            .insert({
                course_id: courseId,
                title,
                description,
                date
            })

        if (error) throw error
        
        revalidatePath(`/teacher/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function deleteClass(classId: string, courseId: string) {
    try {
        const { supabase } = await checkAuth()

        const { error } = await supabase
            .from('classes')
            .delete()
            .eq('id', classId)

        if (error) throw error
        
        revalidatePath(`/teacher/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getCourseDetails(courseId: string) {
    try {
        const { supabase } = await checkAuth()

        const { data, error } = await supabase
            .from('courses')
            .select(`
                id, 
                name, 
                description, 
                institution_id,
                has_classes,
                has_sprints,
                has_teams,
                instituciones (nombre)
            `)
            .eq('id', courseId)
            .single()

        if (error) throw error
        
        const course = {
            id: data.id,
            name: data.name,
            description: data.description,
            institution_id: data.institution_id,
            has_classes: data.has_classes,
            has_sprints: data.has_sprints,
            has_teams: data.has_teams,
            // @ts-ignore
            institution_name: data.instituciones?.nombre
        }

        return { success: true, data: course }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getStudentCourseDetails(courseId: string) {
    try {
        const { user } = await checkAuth()
        const adminClient = getAdminClient()

        // Verify enrollment
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
            .from('courses')
            .select(`
                id, 
                name, 
                description, 
                institution_id,
                has_classes,
                has_sprints,
                has_teams,
                instituciones (nombre)
            `)
            .eq('id', courseId)
            .single()

        if (error) throw error
        
        const course = {
            id: data.id,
            name: data.name,
            description: data.description,
            institution_id: data.institution_id,
            has_classes: data.has_classes,
            has_sprints: data.has_sprints,
            has_teams: data.has_teams,
            // @ts-ignore
            institution_name: data.instituciones?.nombre
        }

        return { success: true, data: course }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getStudentClasses(courseId: string) {
    try {
        const { user } = await checkAuth()
        const adminClient = getAdminClient()

        // Verify enrollment
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
            .from('classes')
            .select('*')
            .eq('course_id', courseId)
            .order('date', { ascending: true })

        if (error) throw error
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}
