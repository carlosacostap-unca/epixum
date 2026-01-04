'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { checkInstitutionAdmin } from './institutions'

// Helper for Nodocente access
async function checkNodocenteCourseAccess(courseId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !user.email) throw new Error('No autenticado')

    // Check if user is enrolled as nodocente in this course
    const { data: enrollment, error } = await supabase
        .from('course_enrollments')
        .select('role')
        .eq('course_id', courseId)
        .eq('email', user.email)
        .eq('role', 'nodocente')
        .single()

    if (error || !enrollment) {
        throw new Error('No autorizado: No es no-docente de este curso')
    }

    // Use Admin Client for operations
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

export async function getCourses(institutionId: string) {
    try {
        const { supabase } = await checkInstitutionAdmin()
        
        // RLS will handle the permission check for the specific institution
        const { data, error } = await supabase
            .from('courses')
            .select('*')
            .eq('institution_id', institutionId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

// Teacher specific actions
async function checkTeacherCourseAccess(courseId: string) {
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

export async function getCourseStudentsForTeacher(courseId: string) {
    try {
        const { supabase } = await checkTeacherCourseAccess(courseId)
        
        const { data, error } = await supabase
            .from('course_enrollments')
            .select('*')
            .eq('course_id', courseId)
            .in('role', ['estudiante', 'alumno'])
            
        if (error) throw error
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function enrollStudentByTeacher(courseId: string, email: string) {
    try {
        const { supabase } = await checkTeacherCourseAccess(courseId)
        
        // 1. Check if user exists in the platform (using profiles as proxy)
        const { data: profile } = await supabase
            .from('profiles')
            .select('roles')
            .eq('email', email)
            .single()

        if (profile) {
            // CASE 1 & 2: User exists in platform
            const currentRoles = profile.roles || []
            if (!currentRoles.includes('estudiante')) {
                // CASE 2: Add 'estudiante' role
                const newRoles = [...currentRoles, 'estudiante']
                
                // Update Profile
                await supabase.from('profiles').update({ roles: newRoles }).eq('email', email)
                
                // Sync Whitelist
                const { error: whitelistError } = await supabase
                    .from('whitelist')
                    .update({ roles: newRoles })
                    .eq('email', email)

                // If not in whitelist (edge case), insert
                if (whitelistError) {
                     await supabase.from('whitelist').insert({ email, roles: newRoles })
                }
            }
            // CASE 1: User exists and has role, proceed to enrollment
        } else {
            // CASE 3: User does not exist
            // Add to whitelist with 'estudiante' role
            const { error: whitelistError } = await supabase
                .from('whitelist')
                .insert({ email, roles: ['estudiante'] })
            
            if (whitelistError) {
                 // Ignore if already exists (race condition)
                 if (whitelistError.code !== '23505') throw whitelistError
            }
        }

        // 2. Create enrollment
        const { error } = await supabase
            .from('course_enrollments')
            .insert({
                course_id: courseId,
                email,
                role: 'estudiante'
            })

        if (error) {
             // Ignore duplicate error
             if (error.code !== '23505') throw error
        }
        
        revalidatePath(`/teacher/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function removeStudentByTeacher(courseId: string, email: string) {
    try {
        const { supabase } = await checkTeacherCourseAccess(courseId)
        
        const { error } = await supabase
            .from('course_enrollments')
            .delete()
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

export async function getCourseStudentStats(courseId: string) {
    try {
        const { supabase } = await checkTeacherCourseAccess(courseId)
        
        // 1. Get Students
        const { data: students, error: studentsError } = await supabase
            .from('course_enrollments')
            .select('email, created_at')
            .eq('course_id', courseId)
            .in('role', ['estudiante', 'alumno'])
            .order('email')

        if (studentsError) throw studentsError

        // 2. Get Assignments IDs
        const { data: assignments, error: assignmentsError } = await supabase
            .from('assignments')
            .select('id')
            .eq('course_id', courseId)

        if (assignmentsError) throw assignmentsError
        
        const assignmentIds = assignments.map(a => a.id)
        const totalAssignments = assignmentIds.length

        // 3. Get Submissions
        let submissions: any[] = []
        if (assignmentIds.length > 0) {
            const { data: subs, error: subsError } = await supabase
                .from('assignment_submissions')
                .select('student_email, grade, assignment_id')
                .in('assignment_id', assignmentIds)
            
            if (subsError) throw subsError
            submissions = subs
        }

        // 4. Aggregate
        const stats = students.map(student => {
            const studentSubmissions = submissions.filter(s => s.student_email === student.email)
            const submittedCount = studentSubmissions.length
            
            // Logic for "Approved"
            const approvedCount = studentSubmissions.filter(s => {
                if (!s.grade) return false
                
                const gradeStr = String(s.grade).trim().toLowerCase()
                const gradeNum = parseFloat(gradeStr)
                
                // If numeric, assume >= 6 is passing (standard 1-10 scale)
                if (!isNaN(gradeNum)) {
                    return gradeNum >= 6
                }
                
                // Text matching
                if (gradeStr.includes('aprob') || 
                    gradeStr.includes('excelente') || 
                    gradeStr.includes('muy bien') || 
                    gradeStr === 'bien' ||
                    gradeStr === 'a' ||
                    gradeStr === 'b') {
                    return true
                }
                
                return false
            }).length

            return {
                email: student.email,
                joined_at: student.created_at,
                totalAssignments,
                submitted: submittedCount,
                approved: approvedCount
            }
        })

        return { success: true, data: stats }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getCourse(courseId: string) {
    try {
        const { supabase } = await checkInstitutionAdmin()
        
        const { data, error } = await supabase
            .from('courses')
            .select('*')
            .eq('id', courseId)
            .single()

        if (error) throw error
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function updateCourseSettings(courseId: string, hasClasses: boolean, hasSprints: boolean, hasTeams: boolean) {
    try {
        const { supabase } = await checkInstitutionAdmin()
        
        const { error } = await supabase
            .from('courses')
            .update({
                has_classes: hasClasses,
                has_sprints: hasSprints,
                has_teams: hasTeams
            })
            .eq('id', courseId)

        if (error) throw error
        
        revalidatePath(`/institution/[id]/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getTeacherCourses() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user || !user.email) throw new Error('No autenticado')

        // Use Admin Client to bypass RLS for reading courses
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

        const { data, error } = await adminClient
            .from('course_enrollments')
            .select(`
                course_id,
                courses (
                    id,
                    name,
                    description,
                    institution_id,
                    instituciones (
                        nombre
                    )
                )
            `)
            .eq('email', user.email)
            .eq('role', 'docente')

        if (error) throw error
        
        // Flatten the data structure
        const courses = data.map(item => {
            // @ts-ignore
            const rawCourse = item.courses
            const course: any = Array.isArray(rawCourse) ? rawCourse[0] : rawCourse
            
            if (!course) return null

            return {
                id: course.id,
                name: course.name,
                description: course.description,
                institution_id: course.institution_id,
                // @ts-ignore
                institution_name: course.instituciones?.nombre
            }
        }).filter(Boolean)

        return { success: true, data: courses }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getNodocenteCourses() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user || !user.email) throw new Error('No autenticado')

        // Use Admin Client to bypass RLS for reading courses
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

        const { data, error } = await adminClient
            .from('course_enrollments')
            .select(`
                course_id,
                courses (
                    id,
                    name,
                    description,
                    institution_id,
                    instituciones (
                        nombre
                    )
                )
            `)
            .eq('email', user.email)
            .eq('role', 'nodocente')

        if (error) throw error
        
        // Flatten the data structure
        const courses = data.map(item => {
            // @ts-ignore
            const rawCourse = item.courses
            const course: any = Array.isArray(rawCourse) ? rawCourse[0] : rawCourse
            
            if (!course) return null

            return {
                id: course.id,
                name: course.name,
                description: course.description,
                institution_id: course.institution_id,
                // @ts-ignore
                institution_name: course.instituciones?.nombre
            }
        }).filter(Boolean)

        return { success: true, data: courses }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function createCourse(formData: FormData) {
    const institutionId = formData.get('institutionId') as string
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const structureType = formData.get('structure_type') as string
    const hasTeams = formData.get('has_teams') === 'on'
    
    if (!institutionId || !name) {
        return { success: false, error: 'Faltan campos requeridos' }
    }

    // Determine flags based on structure type
    const has_classes = structureType === 'classes'
    const has_sprints = structureType === 'sprints'

    try {
        const { supabase } = await checkInstitutionAdmin()
        
        const { error } = await supabase
            .from('courses')
            .insert({
                institution_id: institutionId,
                name,
                description,
                has_classes,
                has_sprints,
                has_teams: hasTeams
            })

        if (error) throw error
        
        revalidatePath('/')
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getNodocenteUsers() {
    try {
        const { supabase } = await checkInstitutionAdmin()
        
        const { data, error } = await supabase
            .from('profiles')
            .select('id, email, first_name, last_name, roles')
            .contains('roles', ['nodocente'])
            
        if (error) throw error
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getCourseEnrollments(courseId: string) {
    try {
        const { supabase } = await checkInstitutionAdmin()
        
        const { data, error } = await supabase
            .from('course_enrollments')
            .select('*')
            .eq('course_id', courseId)
            
        if (error) throw error
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function enrollNodocente(courseId: string, email: string) {
    try {
        const { supabase } = await checkInstitutionAdmin()
        
        // 1. Asegurar que el usuario esté en la whitelist (si no está, agregarlo)
        const { data: whitelistUser, error: whitelistError } = await supabase
            .from('whitelist')
            .select('roles')
            .eq('email', email)
            .single()
        
        if (whitelistError || !whitelistUser) {
             // Crear usuario con rol 'nodocente'
             const { error: insertError } = await supabase
                .from('whitelist')
                .insert({ email, roles: ['nodocente'] })
             
             if (insertError) throw insertError
        } else {
             // Si ya existe, asegurar que tenga el rol 'nodocente'
             if (!whitelistUser.roles?.includes('nodocente')) {
                 const newRoles = [...(whitelistUser.roles || []), 'nodocente']
                 await supabase
                    .from('whitelist')
                    .update({ roles: newRoles })
                    .eq('email', email)
                 
                 // También actualizar profiles si existe
                 await supabase
                    .from('profiles')
                    .update({ roles: newRoles })
                    .eq('email', email)
             }
        }

        // 2. Crear la inscripción en el curso
        const { error } = await supabase
            .from('course_enrollments')
            .insert({
                course_id: courseId,
                email,
                role: 'nodocente'
            })

        if (error) {
             // Ignorar error de duplicado si ya está inscrito
             if (error.code !== '23505') throw error
        }
        
        revalidatePath(`/institution/[id]/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getStudentCourses() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user || !user.email) throw new Error('No autenticado')

        // Use Admin Client to bypass RLS for reading courses
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

        const { data, error } = await adminClient
            .from('course_enrollments')
            .select(`
                course_id,
                courses (
                    id,
                    name,
                    description,
                    institution_id,
                    instituciones (
                        nombre
                    )
                )
            `)
            .ilike('email', user.email)
            .in('role', ['estudiante', 'alumno', 'Estudiante', 'Alumno'])

        if (error) throw error
        
        // Flatten the data structure
        const courses = data.map(item => {
            // @ts-ignore
            const rawCourse = item.courses
            const course: any = Array.isArray(rawCourse) ? rawCourse[0] : rawCourse
            
            if (!course) return null

            return {
                id: course.id,
                name: course.name,
                description: course.description,
                institution_id: course.institution_id,
                // @ts-ignore
                institution_name: course.instituciones?.nombre
            }
        }).filter(Boolean)

        return { success: true, data: courses }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getCourseNodocentes(courseId: string) {
    try {
        const { supabase } = await checkInstitutionAdmin()
        
        const { data, error } = await supabase
            .from('course_enrollments')
            .select('*')
            .eq('course_id', courseId)
            .eq('role', 'nodocente')
            
        if (error) throw error
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function removeNodocenteFromCourse(courseId: string, email: string) {
    try {
        const { supabase } = await checkInstitutionAdmin()
        
        const { error } = await supabase
            .from('course_enrollments')
            .delete()
            .match({ course_id: courseId, email, role: 'nodocente' })

        if (error) throw error
        
        revalidatePath(`/institution/[id]/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function enrollTeacher(courseId: string, email: string) {
    try {
        const { supabase } = await checkInstitutionAdmin()
        
        // 1. Asegurar que el usuario esté en la whitelist
        const { data: whitelistUser, error: whitelistError } = await supabase
            .from('whitelist')
            .select('roles')
            .eq('email', email)
            .single()
        
        if (whitelistError || !whitelistUser) {
             // Crear usuario con rol 'docente'
             const { error: insertError } = await supabase
                .from('whitelist')
                .insert({ email, roles: ['docente'] })
             
             if (insertError) throw insertError
        } else {
             // Si ya existe, asegurar que tenga el rol 'docente'
             if (!whitelistUser.roles?.includes('docente')) {
                 const newRoles = [...(whitelistUser.roles || []), 'docente']
                 await supabase
                    .from('whitelist')
                    .update({ roles: newRoles })
                    .eq('email', email)
                 
                 // También actualizar profiles si existe
                 await supabase
                    .from('profiles')
                    .update({ roles: newRoles })
                    .eq('email', email)
             }
        }

        // 2. Crear la inscripción en el curso
        const { error } = await supabase
            .from('course_enrollments')
            .insert({
                course_id: courseId,
                email,
                role: 'docente'
            })

        if (error) {
             if (error.code !== '23505') throw error
        }
        
        revalidatePath(`/institution/[id]/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getCourseTeachers(courseId: string) {
    try {
        const { supabase } = await checkInstitutionAdmin()
        
        const { data, error } = await supabase
            .from('course_enrollments')
            .select('*')
            .eq('course_id', courseId)
            .eq('role', 'docente')
            
        if (error) throw error
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function removeTeacherFromCourse(courseId: string, email: string) {
    try {
        const { supabase } = await checkInstitutionAdmin()
        
        const { error } = await supabase
            .from('course_enrollments')
            .delete()
            .match({ course_id: courseId, email, role: 'docente' })

        if (error) throw error
        
        revalidatePath(`/institution/[id]/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function enrollStudent(courseId: string, email: string) {
    try {
        const { supabase } = await checkInstitutionAdmin()
        
        // 1. Asegurar que el usuario esté en la whitelist
        const { data: whitelistUser, error: whitelistError } = await supabase
            .from('whitelist')
            .select('roles')
            .eq('email', email)
            .single()
        
        if (whitelistError || !whitelistUser) {
             // Crear usuario con rol 'estudiante'
             const { error: insertError } = await supabase
                .from('whitelist')
                .insert({ email, roles: ['estudiante'] })
             
             if (insertError) throw insertError
        } else {
             // Si ya existe, asegurar que tenga el rol 'estudiante'
             if (!whitelistUser.roles?.includes('estudiante')) {
                 const newRoles = [...(whitelistUser.roles || []), 'estudiante']
                 await supabase
                    .from('whitelist')
                    .update({ roles: newRoles })
                    .eq('email', email)
                 
                 // También actualizar profiles si existe
                 await supabase
                    .from('profiles')
                    .update({ roles: newRoles })
                    .eq('email', email)
             }
        }

        // 2. Crear la inscripción en el curso
        const { error } = await supabase
            .from('course_enrollments')
            .insert({
                course_id: courseId,
                email,
                role: 'estudiante'
            })

        if (error) {
             if (error.code !== '23505') throw error
        }
        
        revalidatePath(`/institution/[id]/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getCourseStudents(courseId: string) {
    try {
        const { supabase } = await checkInstitutionAdmin()
        
        const { data, error } = await supabase
            .from('course_enrollments')
            .select('*')
            .eq('course_id', courseId)
            .eq('role', 'estudiante')
            
        if (error) throw error
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function removeStudentFromCourse(courseId: string, email: string) {
    try {
        const { supabase } = await checkInstitutionAdmin()
        
        const { error } = await supabase
            .from('course_enrollments')
            .delete()
            .match({ course_id: courseId, email, role: 'estudiante' })

        if (error) throw error
        
        revalidatePath(`/institution/[id]/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

// Nodocente specific actions
export async function getCourseStudentsForNodocente(courseId: string) {
    try {
        const { supabase } = await checkNodocenteCourseAccess(courseId)
        
        const { data, error } = await supabase
            .from('course_enrollments')
            .select('*')
            .eq('course_id', courseId)
            .eq('role', 'estudiante')
            
        if (error) throw error
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function enrollStudentByNodocente(courseId: string, email: string) {
    try {
        const { supabase } = await checkNodocenteCourseAccess(courseId)
        
        // 1. Check if user exists in the platform (using profiles as proxy)
        const { data: profile } = await supabase
            .from('profiles')
            .select('roles')
            .eq('email', email)
            .single()

        if (profile) {
            // CASE 1 & 2: User exists in platform
            const currentRoles = profile.roles || []
            if (!currentRoles.includes('estudiante')) {
                // CASE 2: Add 'estudiante' role
                const newRoles = [...currentRoles, 'estudiante']
                
                // Update Profile
                await supabase.from('profiles').update({ roles: newRoles }).eq('email', email)
                
                // Sync Whitelist
                const { error: whitelistError } = await supabase
                    .from('whitelist')
                    .update({ roles: newRoles })
                    .eq('email', email)

                // If not in whitelist (edge case), insert
                if (whitelistError) {
                     await supabase.from('whitelist').insert({ email, roles: newRoles })
                }
            }
            // CASE 1: Role exists, just enroll (logic below)
        } else {
            // CASE 3: User does not exist in platform
            // "Regístralo en la plataforma, asígnale rol estudiante, y matricúlalo"
            
            // A. Update/Insert Whitelist first (Permissions)
            const { data: whitelistUser } = await supabase
                .from('whitelist')
                .select('roles')
                .eq('email', email)
                .single()
            
            let finalRoles = ['estudiante']
            if (whitelistUser) {
                if (!whitelistUser.roles?.includes('estudiante')) {
                    finalRoles = [...(whitelistUser.roles || []), 'estudiante']
                    await supabase.from('whitelist').update({ roles: finalRoles }).eq('email', email)
                } else {
                    finalRoles = whitelistUser.roles
                }
            } else {
                await supabase.from('whitelist').insert({ email, roles: ['estudiante'] })
            }

            // B. Register User (Invite)
            const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email)
            
            if (inviteError) {
                console.error('Error inviting user:', inviteError)
                // If user is already registered (but no profile?), ignore.
                // Otherwise, we proceed with enrollment as they are whitelisted.
            }
        }

        // 2. Enroll in Course
        const { error } = await supabase
            .from('course_enrollments')
            .insert({
                course_id: courseId,
                email,
                role: 'estudiante'
            })

        if (error) {
             if (error.code !== '23505') throw error
        }
        
        revalidatePath(`/nodocente/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function removeStudentByNodocente(courseId: string, email: string) {
    try {
        const { supabase } = await checkNodocenteCourseAccess(courseId)
        
        const { error } = await supabase
            .from('course_enrollments')
            .delete()
            .match({ course_id: courseId, email, role: 'estudiante' })

        if (error) throw error
        
        revalidatePath(`/nodocente/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getCourseForNodocente(courseId: string) {
    try {
        const { supabase } = await checkNodocenteCourseAccess(courseId)
        
        const { data, error } = await supabase
            .from('courses')
            .select(`
                *,
                instituciones (
                    nombre
                )
            `)
            .eq('id', courseId)
            .single()

        if (error) throw error
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}
