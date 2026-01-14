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

        // 2. Verify admin or teacher enrollment
        const { data: profile } = await adminClient
            .from('profiles')
            .select('roles')
            .eq('email', user.email!)
            .single()
            
        const isAdmin = profile?.roles?.includes('admin-plataforma') || profile?.roles?.includes('admin-institucion')

        if (!isAdmin) {
            const { data: teacherEnrollment, error: authError } = await adminClient
                .from('course_enrollments')
                .select('id')
                .eq('course_id', classData.course_id)
                .ilike('email', user.email!)
                .eq('role', 'docente')
                .single()

            if (authError || !teacherEnrollment) {
                throw new Error('No tienes permiso para agregar recursos en este curso')
            }
        }

        const { error } = await adminClient
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
        revalidatePath(`/teacher/courses/${classData.course_id}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function updateResource(resourceId: string, title: string, url: string, type: string) {
    try {
        const { user } = await checkAuth()
        const adminClient = getAdminClient()

        // 1. Get resource details to find course info
        const { data: resource, error: resError } = await adminClient
            .from('class_resources')
            .select('class_id')
            .eq('id', resourceId)
            .single()

        if (resError || !resource) {
            throw new Error('Recurso no encontrado')
        }

        const { data: classData, error: classError } = await adminClient
            .from('classes')
            .select('course_id')
            .eq('id', resource.class_id)
            .single()

        if (classError || !classData) {
            throw new Error('Clase asociada no encontrada')
        }

        // 2. Verify admin or teacher enrollment
        const { data: profile } = await adminClient
            .from('profiles')
            .select('roles')
            .eq('email', user.email!)
            .single()
            
        const isAdmin = profile?.roles?.includes('admin-plataforma') || profile?.roles?.includes('admin-institucion')

        if (!isAdmin) {
            const { data: teacherEnrollment, error: authError } = await adminClient
                .from('course_enrollments')
                .select('id')
                .eq('course_id', classData.course_id)
                .ilike('email', user.email!)
                .eq('role', 'docente')
                .single()

            if (authError || !teacherEnrollment) {
                throw new Error('No tienes permiso para editar recursos en este curso')
            }
        }

        const { error } = await adminClient
            .from('class_resources')
            .update({
                title,
                url,
                type
            })
            .eq('id', resourceId)

        if (error) throw error
        
        revalidatePath(`/teacher/courses/${classData.course_id}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function deleteResource(resourceId: string) {
    try {
        const { user } = await checkAuth()
        const adminClient = getAdminClient()

        // 1. Get resource details to find course info
        const { data: resource, error: resError } = await adminClient
            .from('class_resources')
            .select('class_id, url')
            .eq('id', resourceId)
            .single()

        if (resError || !resource) {
            throw new Error('Recurso no encontrado')
        }

        const { data: classData, error: classError } = await adminClient
            .from('classes')
            .select('course_id')
            .eq('id', resource.class_id)
            .single()

        if (classError || !classData) {
            throw new Error('Clase asociada no encontrada')
        }

        // 2. Verify admin or teacher enrollment
        const { data: profile } = await adminClient
            .from('profiles')
            .select('roles')
            .eq('email', user.email!)
            .single()
            
        const isAdmin = profile?.roles?.includes('admin-plataforma') || profile?.roles?.includes('admin-institucion')

        if (!isAdmin) {
            const { data: teacherEnrollment, error: authError } = await adminClient
                .from('course_enrollments')
                .select('id')
                .eq('course_id', classData.course_id)
                .ilike('email', user.email!)
                .eq('role', 'docente')
                .single()

            if (authError || !teacherEnrollment) {
                throw new Error('No tienes permiso para eliminar recursos en este curso')
            }
        }

        // 3. Delete file from storage if it exists and is hosted in our bucket
        if (resource.url && resource.url.includes('/class-resources/')) {
            try {
                // Extract path from URL
                // URL format: .../storage/v1/object/public/class-resources/path/to/file
                const urlParts = resource.url.split('/class-resources/')
                if (urlParts.length > 1) {
                    const filePath = urlParts[1]
                    // Decode URI component in case filename has spaces or special chars
                    const decodedPath = decodeURIComponent(filePath)
                    
                    const { error: storageError } = await adminClient
                        .storage
                        .from('class-resources')
                        .remove([decodedPath])
                        
                    if (storageError) {
                        console.error('Error deleting file from storage:', storageError)
                    }
                }
            } catch (err) {
                console.error('Error parsing/deleting file:', err)
            }
        }

        const { error } = await adminClient
            .from('class_resources')
            .delete()
            .eq('id', resourceId)

        if (error) throw error
        
        revalidatePath(`/teacher/courses/${classData.course_id}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getSignedUploadUrl(classId: string, fileName: string) {
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

        // 2. Verify admin or teacher enrollment
        const { data: profile } = await adminClient
            .from('profiles')
            .select('roles')
            .eq('email', user.email!)
            .single()
            
        const isAdmin = profile?.roles?.includes('admin-plataforma') || profile?.roles?.includes('admin-institucion')

        if (!isAdmin) {
            const { data: teacherEnrollment, error: authError } = await adminClient
                .from('course_enrollments')
                .select('id')
                .eq('course_id', classData.course_id)
                .ilike('email', user.email!)
                .eq('role', 'docente')
                .single()

            if (authError || !teacherEnrollment) {
                throw new Error('No tienes permiso para subir archivos en este curso')
            }
        }

        // 3. Create signed upload URL
        const filePath = `${classId}/${fileName}`
        const { data, error } = await adminClient
            .storage
            .from('class-resources')
            .createSignedUploadUrl(filePath)

        if (error) throw error

        const { data: { publicUrl } } = adminClient
            .storage
            .from('class-resources')
            .getPublicUrl(filePath)

        return { success: true, data: { ...data, path: filePath, publicUrl } }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}
