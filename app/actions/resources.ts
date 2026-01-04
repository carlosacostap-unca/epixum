'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

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

export async function getClassResources(classId: string) {
    try {
        const { supabase } = await checkAuth()

        const { data, error } = await supabase
            .from('class_resources')
            .select('*')
            .eq('class_id', classId)
            .order('created_at', { ascending: true })

        if (error) throw error
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getStudentClassResources(classId: string) {
    try {
        const { user } = await checkAuth()
        const adminClient = getAdminClient()

        // 1. Get course_id from class
        const { data: classData, error: classError } = await adminClient
            .from('classes')
            .select('course_id')
            .eq('id', classId)
            .single()

        if (classError || !classData) {
            throw new Error('Clase no encontrada')
        }

        // 2. Verify enrollment
        const { data: enrollment, error: enrollmentError } = await adminClient
            .from('course_enrollments')
            .select('id')
            .eq('course_id', classData.course_id)
            .eq('email', user.email!)
            .eq('role', 'estudiante')
            .single()

        if (enrollmentError || !enrollment) {
            throw new Error('No estás matriculado en este curso')
        }

        // 3. Get resources
        const { data, error } = await adminClient
            .from('class_resources')
            .select('*')
            .eq('class_id', classId)
            .order('created_at', { ascending: true })

        if (error) throw error
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function createResource(classId: string, title: string, url: string, type: string = 'link') {
    try {
        const { supabase } = await checkAuth()

        const { error } = await supabase
            .from('class_resources')
            .insert({
                class_id: classId,
                title,
                url,
                type
            })

        if (error) throw error
        
        // We don't know the courseId here easily without fetching, so we might need to rely on client refresh 
        // or just revalidate a general path if possible, but path revalidation requires courseId.
        // We will return success and let client handle UI update.
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function deleteResource(resourceId: string) {
    try {
        const { supabase } = await checkAuth()

        const { error } = await supabase
            .from('class_resources')
            .delete()
            .eq('id', resourceId)

        if (error) throw error
        
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}
