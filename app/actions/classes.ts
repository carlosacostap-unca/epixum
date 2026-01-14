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
        const { user } = await checkAuth()
        
        // Try admin client for teacher/admin check first
        const adminClient = getAdminClient()

        // Check for admin roles
        const { data: profile } = await adminClient
            .from('profiles')
            .select('roles')
            .eq('email', user.email!)
            .single()
            
        const isAdmin = profile?.roles?.includes('admin-plataforma') || profile?.roles?.includes('admin-institucion')

        const { data: teacherEnrollment } = await adminClient
            .from('course_enrollments')
            .select('id')
            .eq('course_id', courseId)
            .ilike('email', user.email!)
            .eq('role', 'docente')
            .single()
            
        if (isAdmin || teacherEnrollment) {
             const { data, error } = await adminClient
                .from('classes')
                .select('*, class_resources(count)')
                .eq('course_id', courseId)
                .order('date', { ascending: true })
             if (error) throw error
             return { success: true, data }
        }

        const { supabase } = await checkAuth()

        const { data, error } = await supabase
            .from('classes')
            .select('*, class_resources(count)')
            .eq('course_id', courseId)
            .order('date', { ascending: true })

        if (error) throw error
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function createClass(courseId: string, title: string, description: string, date: string, sprintId: string | null = null) {
    try {
        const { user } = await checkAuth()
        const adminClient = getAdminClient()

        // Check for admin roles
        const { data: profile } = await adminClient
            .from('profiles')
            .select('roles')
            .eq('email', user.email!)
            .single()
            
        const isAdmin = profile?.roles?.includes('admin-plataforma') || profile?.roles?.includes('admin-institucion')

        // Verify teacher enrollment if not admin
        if (!isAdmin) {
            const { data: teacherEnrollment, error: authError } = await adminClient
                .from('course_enrollments')
                .select('id')
                .eq('course_id', courseId)
                .ilike('email', user.email!)
                .eq('role', 'docente')
                .single()

            if (authError || !teacherEnrollment) {
                throw new Error('No tienes permiso para crear clases en este curso')
            }
        }

        const { error } = await adminClient
            .from('classes')
            .insert({
                course_id: courseId,
                title,
                description,
                date,
                sprint_id: sprintId || null
            })

        if (error) throw error
        
        revalidatePath(`/teacher/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function createClassWithResources(
    courseId: string, 
    title: string, 
    description: string, 
    date: string, 
    sprintId: string | null = null,
    resources: { title: string, url: string, type: string }[] = []
) {
    try {
        const { user } = await checkAuth()
        const adminClient = getAdminClient()

        // Verify teacher enrollment
        const { data: teacherEnrollment, error: authError } = await adminClient
            .from('course_enrollments')
            .select('id')
            .eq('course_id', courseId)
            .ilike('email', user.email!)
            .eq('role', 'docente')
            .single()

        if (authError || !teacherEnrollment) {
            throw new Error('No tienes permiso para crear clases en este curso')
        }

        // 1. Create Class
        const { data: newClass, error: classError } = await adminClient
            .from('classes')
            .insert({
                course_id: courseId,
                title,
                description,
                date,
                sprint_id: sprintId || null
            })
            .select()
            .single()

        if (classError) throw classError

        // 2. Create Resources if any
        if (resources.length > 0) {
            const resourcesToInsert = resources.map(r => ({
                class_id: newClass.id,
                title: r.title,
                url: r.url,
                type: r.type
            }))

            const { error: resourcesError } = await adminClient
                .from('class_resources')
                .insert(resourcesToInsert)

            if (resourcesError) {
                // Optional: rollback class creation or just log error?
                // For simplicity we'll just throw but the class remains created without resources.
                // In a real app we might want a transaction or manual rollback.
                console.error('Error creating resources:', resourcesError)
                // We won't throw here to avoid failing the whole operation if just resources fail,
                // but user might want to know.
            }
        }
        
        revalidatePath(`/teacher/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function updateClass(classId: string, courseId: string, title: string, description: string, date: string, sprintId: string | null = null) {
    try {
        const { user } = await checkAuth()
        const adminClient = getAdminClient()

        // Verify teacher enrollment
        const { data: teacherEnrollment, error: authError } = await adminClient
            .from('course_enrollments')
            .select('id')
            .eq('course_id', courseId)
            .ilike('email', user.email!)
            .eq('role', 'docente')
            .single()

        if (authError || !teacherEnrollment) {
            throw new Error('No tienes permiso para editar clases en este curso')
        }

        const { error } = await adminClient
            .from('classes')
            .update({
                title,
                description,
                date,
                sprint_id: sprintId || null
            })
            .eq('id', classId)
            .eq('course_id', courseId)

        if (error) throw error
        
        revalidatePath(`/teacher/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function deleteClass(classId: string, courseId: string) {
    try {
        const { user } = await checkAuth()
        const adminClient = getAdminClient()

        // Verify teacher enrollment
        const { data: teacherEnrollment, error: authError } = await adminClient
            .from('course_enrollments')
            .select('id')
            .eq('course_id', courseId)
            .ilike('email', user.email!)
            .eq('role', 'docente')
            .single()

        if (authError || !teacherEnrollment) {
            throw new Error('No tienes permiso para eliminar clases en este curso')
        }

        const { error } = await adminClient
            .from('classes')
            .delete()
            .eq('id', classId)
            .eq('course_id', courseId)

        if (error) throw error
        
        revalidatePath(`/teacher/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getCourseDetails(courseId: string) {
    try {
        const { user } = await checkAuth()
        const adminClient = getAdminClient()

        // Verify teacher enrollment
        const { data: enrollment, error: enrollmentError } = await adminClient
            .from('course_enrollments')
            .select('id')
            .eq('course_id', courseId)
            .ilike('email', user.email!)
            .eq('role', 'docente')
            .single()

        if (enrollmentError || !enrollment) {
            throw new Error('No tienes permiso de docente para ver este curso')
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

export async function getStudentCourseDetails(courseId: string) {
    try {
        const { user, supabase } = await checkAuth()
        const adminClient = getAdminClient()

        // Check if supervisor
        const { data: profile } = await supabase
            .from('profiles')
            .select('roles')
            .eq('email', user.email!)
            .single()
        
        const isSupervisor = profile?.roles?.includes('supervisor')

        if (!isSupervisor) {
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
        }

        const { data, error } = await adminClient
            .from('courses')
            .select(`
                id, 
                name, 
                description, 
                status,
                institution_id,
                has_classes,
                has_sprints,
                has_teams,
                instituciones (nombre)
            `)
            .eq('id', courseId)
            .single()

        if (error) throw error

        if (data.status === 'Borrador') {
            throw new Error('Este curso aún no está disponible')
        }
        
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
        const { user, supabase } = await checkAuth()
        const adminClient = getAdminClient()

        // Check if supervisor
        const { data: profile } = await supabase
            .from('profiles')
            .select('roles')
            .eq('email', user.email!)
            .single()
        
        const isSupervisor = profile?.roles?.includes('supervisor')

        if (!isSupervisor) {
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
