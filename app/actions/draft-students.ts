'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { checkInstitutionAdmin } from './institutions'

const cleanEmail = (email: string) => {
    return email
        .replace(/[^\x20-\x7E]/g, '') // Remove non-printable ASCII
        .replace(/\s+/g, '') // Remove all whitespace
        .toLowerCase();
}

export async function saveDraftStudents(courseId: string, students: any[]) {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('No autenticado')

        // Validar datos básicos
        const validStudents = students.map(s => ({
            course_id: courseId,
            email: s.email,
            first_name: s.first_name,
            last_name: s.last_name,
            dni: s.dni,
            phone: s.phone,
            birth_date: s.birth_date,
            address: s.address,
            city: s.city,
            country: s.country,
            file_number: s.file_number,
            career: s.career,
            year: s.year,
            shift: s.shift,
            commission: s.commission,
            status: s.status,
            observations: s.observations,
            updated_at: new Date().toISOString()
        }))

        // Use Admin Client to ensure we can save drafts even if RLS is tricky for some roles
        // (assuming the user has permission to manage the course)
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
        
        // Verify permissions (Admin, Supervisor, or Teacher)
        // Check Profile for Supervisor/Admin roles
        const { data: profile } = await adminClient
            .from('profiles')
            .select('roles')
            .eq('email', user.email!)
            .single()
        
        const isGlobalAdmin = profile?.roles?.includes('admin-plataforma')
        const isSupervisor = profile?.roles?.includes('supervisor')

        // Check teacher enrollment
        const { data: teacherEnrollment } = await adminClient
            .from('course_enrollments')
            .select('id')
            .eq('course_id', courseId)
            .ilike('email', user.email!)
            .in('role', ['docente', 'admin-institucion'])
            .maybeSingle()
            
        // Check institution admin
        let isInstitutionAdmin = false
        if (!isGlobalAdmin && !isSupervisor && !teacherEnrollment) {
            const { data: course } = await adminClient.from('courses').select('institution_id').eq('id', courseId).single()
            if (course) {
                 const { data: instRole } = await adminClient
                    .from('institution_roles')
                    .select('id')
                    .eq('institution_id', course.institution_id)
                    .eq('email', user.email!)
                    .eq('role', 'admin-institucion')
                    .maybeSingle()
                 if (instRole) isInstitutionAdmin = true
            }
        }

        if (!isGlobalAdmin && !isSupervisor && !teacherEnrollment && !isInstitutionAdmin) {
            return { success: false, error: 'No autorizado para guardar borradores en este curso' }
        }

        const { error } = await adminClient
            .from('draft_students')
            .upsert(validStudents, { onConflict: 'course_id, email' }) 

        if (error) throw error

        revalidatePath(`/admin/data`)
        return { success: true }
    } catch (error: any) {
        console.error('Error saving draft students:', error)
        return { success: false, error: error.message }
    }
}

export async function checkDraftStudentsByEmail(courseId: string, emails: string[]) {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('No autenticado')

        const uniqueEmails = Array.from(new Set(emails.map(e => e.trim().toLowerCase()).filter(e => e)))

        if (uniqueEmails.length === 0) {
            return { success: true, data: { found: [], notFound: [] } }
        }

        // Use Admin Client to bypass RLS
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

        // Verify permissions
        const { data: profile } = await adminClient
            .from('profiles')
            .select('roles')
            .eq('email', user.email!)
            .single()
        
        const isGlobalAdmin = profile?.roles?.includes('admin-plataforma')
        const isSupervisor = profile?.roles?.includes('supervisor')

        const { data: teacherEnrollment } = await adminClient
            .from('course_enrollments')
            .select('id')
            .eq('course_id', courseId)
            .ilike('email', user.email!)
            .in('role', ['docente', 'admin-institucion'])
            .maybeSingle()

        let isInstitutionAdmin = false
        if (!isGlobalAdmin && !isSupervisor && !teacherEnrollment) {
            const { data: course } = await adminClient.from('courses').select('institution_id').eq('id', courseId).single()
            if (course) {
                 const { data: instRole } = await adminClient
                    .from('institution_roles')
                    .select('id')
                    .eq('institution_id', course.institution_id)
                    .eq('email', user.email!)
                    .eq('role', 'admin-institucion')
                    .maybeSingle()
                 if (instRole) isInstitutionAdmin = true
            }
        }

        if (!isGlobalAdmin && !isSupervisor && !teacherEnrollment && !isInstitutionAdmin) {
             return { success: false, error: 'No autorizado para ver borradores de este curso' }
        }

        const { data: foundStudents, error } = await adminClient
            .from('draft_students')
            .select('*')
            .in('email', uniqueEmails)
            // .eq('course_id', courseId) // Removed to allow finding drafts from other courses

        if (error) throw error

        // Filter: If multiple drafts exist for same email, prioritize the one matching courseId, then latest
        const bestDraftsMap = new Map();
        
        foundStudents?.forEach(draft => {
            const email = cleanEmail(draft.email);
            const existing = bestDraftsMap.get(email);
            
            if (!existing) {
                bestDraftsMap.set(email, draft);
            } else {
                // If current matches course and existing doesn't, swap
                if (draft.course_id === courseId && existing.course_id !== courseId) {
                    bestDraftsMap.set(email, draft);
                }
                // If neither matches course (or both do), pick latest
                else if ((draft.course_id === courseId) === (existing.course_id === courseId)) {
                    if (new Date(draft.created_at) > new Date(existing.created_at)) {
                        bestDraftsMap.set(email, draft);
                    }
                }
            }
        });

        const distinctFoundStudents = Array.from(bestDraftsMap.values());
        const foundEmails = new Set(distinctFoundStudents.map((s: any) => cleanEmail(s.email)))
        const notFoundEmails = uniqueEmails.filter(email => !foundEmails.has(email))

        // Check if already enrolled
        const foundEmailsList = distinctFoundStudents.map((s: any) => cleanEmail(s.email))
        
        let enrolledSet = new Set()
        if (foundEmailsList.length > 0) {
            const { data: enrolledData } = await adminClient
                .from('course_enrollments')
                .select('email')
                .eq('course_id', courseId)
                .in('email', foundEmailsList)
            
            enrolledSet = new Set(enrolledData?.map(e => cleanEmail(e.email)))
        }

        const foundWithStatus = distinctFoundStudents.map((s: any) => ({
            ...s,
            email: cleanEmail(s.email),
            is_enrolled: enrolledSet.has(cleanEmail(s.email))
        }))

        return {
            success: true,
            data: {
                found: foundWithStatus,
                notFound: notFoundEmails
            }
        }
    } catch (error: any) {
        console.error('Error checking draft students:', error)
        return { success: false, error: error.message }
    }
}

export async function batchEnrollStudents(courseId: string, students: any[]) {
    try {
        // 1. Check permissions (We should allow teachers too if they have access)
        // Previously: await checkInstitutionAdmin()
        
        // We will do a custom check similar to above to allow teachers
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('No autenticado')
            
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

        // Verify permissions
        const { data: profile } = await adminClient
            .from('profiles')
            .select('roles')
            .eq('email', user.email!)
            .single()
        
        const isGlobalAdmin = profile?.roles?.includes('admin-plataforma')
        const isSupervisor = profile?.roles?.includes('supervisor')

        const { data: teacherEnrollment } = await adminClient
            .from('course_enrollments')
            .select('id')
            .eq('course_id', courseId)
            .ilike('email', user.email!)
            .in('role', ['docente', 'admin-institucion'])
            .maybeSingle()

        let isInstitutionAdmin = false
        if (!isGlobalAdmin && !isSupervisor && !teacherEnrollment) {
            const { data: course } = await adminClient.from('courses').select('institution_id').eq('id', courseId).single()
            if (course) {
                 const { data: instRole } = await adminClient
                    .from('institution_roles')
                    .select('id')
                    .eq('institution_id', course.institution_id)
                    .eq('email', user.email!)
                    .eq('role', 'admin-institucion')
                    .maybeSingle()
                 if (instRole) isInstitutionAdmin = true
            }
        }

        if (!isGlobalAdmin && !isSupervisor && !teacherEnrollment && !isInstitutionAdmin) {
             throw new Error('No autorizado para matricular estudiantes en este curso')
        }

        const results = {
            success: [] as string[],
            failed: [] as { email: string, error: string }[]
        }

        let allAuthUsers: any[] = []
        try {
            const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers({
                perPage: 1000
            })
            if (!listError) {
                allAuthUsers = users
            }
        } catch (e) { console.error(e) }

        // 3. Process each student
        for (const student of students) {
            try {
                const email = cleanEmail(student.email)
                const sanitizedBirthDate = (student.birth_date === '' || !student.birth_date) ? null : student.birth_date

                // A. Check Auth User
                const existingAuthUser = allAuthUsers.find(u => u.email?.toLowerCase() === email)

                // B. Whitelist Logic
                let finalRoles = ['estudiante']
                const whitelistData: any = { 
                    roles: finalRoles,
                    first_name: student.first_name,
                    last_name: student.last_name,
                    dni: student.dni,
                    phone: student.phone,
                    birth_date: sanitizedBirthDate
                }

                const { data: whitelistUser } = await adminClient
                    .from('whitelist')
                    .select('roles')
                    .eq('email', email)
                    .single()

                if (whitelistUser) {
                    if (!whitelistUser.roles?.includes('estudiante')) {
                        finalRoles = [...(whitelistUser.roles || []), 'estudiante']
                        whitelistData.roles = finalRoles
                    } else {
                        delete whitelistData.roles
                        finalRoles = whitelistUser.roles
                    }
                    await adminClient.from('whitelist').update(whitelistData).eq('email', email)
                } else {
                    whitelistData.email = email
                    whitelistData.roles = ['estudiante']
                    await adminClient.from('whitelist').insert(whitelistData)
                }

                // C. Profile Logic
                if (existingAuthUser) {
                    // Update existing profile
                    const profileUpdate: any = { roles: finalRoles }
                    if (student.first_name) profileUpdate.first_name = student.first_name
                    if (student.last_name) profileUpdate.last_name = student.last_name
                    if (student.dni) profileUpdate.dni = student.dni
                    if (student.phone) profileUpdate.phone = student.phone
                    if (sanitizedBirthDate) profileUpdate.birth_date = sanitizedBirthDate

                    await adminClient.from('profiles').upsert({
                        id: existingAuthUser.id,
                        email: email,
                        ...profileUpdate
                    })
                } else {
                    // Create new auth user
                    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
                        email: email,
                        email_confirm: true,
                        user_metadata: {
                            first_name: student.first_name,
                            last_name: student.last_name,
                            full_name: `${student.first_name} ${student.last_name}`
                        }
                    })

                    if (createError) throw createError

                    if (newUser.user) {
                        const newProfileData: any = {
                            id: newUser.user.id,
                            email: email,
                            roles: finalRoles,
                            first_name: student.first_name,
                            last_name: student.last_name,
                            dni: student.dni,
                            phone: student.phone,
                            birth_date: sanitizedBirthDate
                        }
                        
                        await adminClient.from('profiles').upsert(newProfileData)
                        
                        // Add to local list to prevent re-creation attempts if duplicates exist in input
                        allAuthUsers.push(newUser.user)
                    }
                }

                // D. Enroll
                const { error: enrollError } = await adminClient
                    .from('course_enrollments')
                    .insert({
                        course_id: courseId,
                        email,
                        role: 'estudiante'
                    })
                
                if (enrollError && enrollError.code !== '23505') throw enrollError

                results.success.push(email)

            } catch (err: any) {
                console.error(`Error enrolling ${student.email}:`, err)
                results.failed.push({ email: student.email, error: err.message })
            }
        }

        revalidatePath(`/admin/data`)
        return { success: true, data: results }

    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
