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

        // Upsert permite actualizar si ya existe (basado en unique constraint, 
        // pero draft_students no tiene unique en email+course_id por defecto a menos que lo hayamos creado así.
        // Asumimos que queremos insertar nuevos. Si queremos upsert, necesitamos constraint.
        // Por ahora haremos insert y si falla por duplicado lo manejamos o usamos upsert con conflict on ID si tuviéramos IDs.
        // Mejor usar upsert con onConflict: 'course_id, email' si existe esa constraint.
        
        // Verificamos si existe la tabla y sus constraints. 
        // Para simplificar, primero borramos los que coincidan (si se quiere reemplazar) o simplemente insertamos.
        // El usuario pidió "guardar", usualmente es agregar.
        
        const { error } = await supabase
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

        const { data: foundStudents, error } = await supabase
            .from('draft_students')
            .select('*')
            .eq('course_id', courseId)
            .in('email', uniqueEmails)

        if (error) throw error

        const foundEmails = new Set(foundStudents?.map(s => cleanEmail(s.email)))
        const notFoundEmails = uniqueEmails.filter(email => !foundEmails.has(email))

        // Check if already enrolled
        const foundEmailsList = foundStudents?.map(s => cleanEmail(s.email)) || []
        const { data: enrolledData } = await supabase
            .from('course_enrollments')
            .select('email')
            .eq('course_id', courseId)
            .in('email', foundEmailsList)
        
        const enrolledSet = new Set(enrolledData?.map(e => cleanEmail(e.email)))

        const foundWithStatus = foundStudents?.map(s => ({
            ...s,
            email: cleanEmail(s.email),
            is_enrolled: enrolledSet.has(cleanEmail(s.email))
        })) || []

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
        // 1. Check permissions
        await checkInstitutionAdmin()

        // 2. Create Admin Client for privileged operations
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
