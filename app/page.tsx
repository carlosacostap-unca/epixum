import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import InstitutionAdminDashboard from '@/components/InstitutionAdminDashboard'
import RoleSelectionScreen from '@/components/RoleSelectionScreen'
import NonTeachingStaffDashboard from '@/components/NonTeachingStaffDashboard'
import ProfileManager from '@/components/ProfileManager'
import { getInstitutionsForUser } from '@/app/actions/institutions'
import { getTeacherCourses, getStudentCourses, getNodocenteCourses, getGuestCourses } from '@/app/actions/courses'
import TeacherDashboard from '@/components/TeacherDashboard'
import StudentDashboard from '@/components/StudentDashboard'

export default async function Home(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams
  const selectedRoleParam = typeof searchParams.role === 'string' ? searchParams.role : undefined

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('roles, first_name, last_name, dni, birth_date, phone, avatar_url')
    .eq('id', user.id)
    .single()
  
  if (profileError) {
      console.error('[PAGE] Error fetching profile:', profileError)
  }

  // Filter out empty roles just in case
  const roles = (profile?.roles || []).filter((r: string) => r && r.trim() !== '')

  if (roles.length === 0) {
     return redirect('/login?error=unauthorized_role')
  }

  // Logic for Role Selection
  const hasMultipleRoles = roles.length > 1
  const isValidParamRole = selectedRoleParam && roles.includes(selectedRoleParam)

  // If user has multiple roles and hasn't selected a valid one yet, show selection screen
  if (hasMultipleRoles && !isValidParamRole) {
    return <RoleSelectionScreen roles={roles} userEmail={user.email || ''} />
  }

  // Determine the effective role to show
  // If valid param is provided, use it. Otherwise (single role), use the first role.
  const effectiveRole = isValidParamRole ? selectedRoleParam : roles[0]

  // Render Dashboard based on effectiveRole
  if (effectiveRole === 'admin-plataforma') {
      return (
        <div className="flex min-h-screen flex-col items-center p-8 font-[family-name:var(--font-geist-sans)] bg-black">
          <main className="w-full max-w-4xl flex flex-col gap-8 items-start">
            <div className="flex justify-between w-full items-center bg-neutral-900 p-6 rounded-lg shadow-sm border border-neutral-800">
                 <div>
                    <h1 className="text-3xl font-bold text-gray-100">Panel de Administración</h1>
                    <p className="text-gray-400 mt-1">
                        Usuario: <span className="font-medium text-gray-200">{user.email}</span>
                        <span className="mx-2 text-gray-600">|</span>
                        Rol: <span className="text-green-400 font-semibold">Administrador de Plataforma</span>
                    </p>
                 </div>
                 <div className="flex gap-4 items-center">
                    <ProfileManager 
                        initialProfile={{
                            id: user.id,
                            email: user.email || '',
                            first_name: profile?.first_name,
                            last_name: profile?.last_name,
                            dni: profile?.dni,
                            birth_date: profile?.birth_date,
                            phone: profile?.phone,
                            roles: profile?.roles,
                            avatar_url: profile?.avatar_url
                        }} 
                        hasMultipleRoles={hasMultipleRoles}
                    />
                 </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                {/* Card Gestionar Instituciones */}
                <a href="/admin/institutions" className="block group">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 hover:bg-neutral-800 transition-all h-full flex flex-col justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-100 group-hover:text-indigo-400 transition-colors mb-2">
                                Gestionar Instituciones
                            </h2>
                            <p className="text-gray-400">
                                Crear, editar y eliminar instituciones educativas. Asignar administradores a las instituciones.
                            </p>
                        </div>
                        <div className="mt-4 text-indigo-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
                            Ir a Instituciones →
                        </div>
                    </div>
                </a>

                {/* Card Gestionar Usuarios */}
                <a href="/admin/users" className="block group">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 hover:bg-neutral-800 transition-all h-full flex flex-col justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-100 group-hover:text-indigo-400 transition-colors mb-2">
                                Gestionar Usuarios
                            </h2>
                            <p className="text-gray-400">
                                Administrar la lista blanca de usuarios, asignar roles globales y gestionar accesos.
                            </p>
                        </div>
                        <div className="mt-4 text-indigo-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
                            Ir a Usuarios →
                        </div>
                    </div>
                </a>

                {/* Card Gestionar Datos */}
                <a href="/admin/data" className="block group">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 hover:bg-neutral-800 transition-all h-full flex flex-col justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-100 group-hover:text-indigo-400 transition-colors mb-2">
                                Gestionar Datos
                            </h2>
                            <p className="text-gray-400">
                                Gestión manual de Clases y otros recursos del sistema.
                            </p>
                        </div>
                        <div className="mt-4 text-indigo-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
                            Ir a Gestionar →
                        </div>
                    </div>
                </a>
            </div>
          </main>
        </div>
      )
  }

  if (effectiveRole === 'admin-institucion') {
      const institutionsResult = await getInstitutionsForUser()
      const institutions = institutionsResult.success && institutionsResult.data ? institutionsResult.data : []
      
      return (
             <InstitutionAdminDashboard 
                institutions={institutions}
                userEmail={user.email || ''}
                profile={{
                    id: user.id,
                    email: user.email || '',
                    first_name: profile?.first_name,
                    last_name: profile?.last_name,
                    dni: profile?.dni,
                    birth_date: profile?.birth_date,
                    phone: profile?.phone,
                    roles: profile?.roles,
                    avatar_url: profile?.avatar_url
                }}
                hasMultipleRoles={hasMultipleRoles}
             />
      )
  }

  if (effectiveRole === 'nodocente') {
      const coursesResult = await getNodocenteCourses()
      const courses = coursesResult.success && coursesResult.data ? coursesResult.data : []

      return (
             /* @ts-ignore */
             <NonTeachingStaffDashboard 
                courses={courses} 
                userEmail={user.email || ''} 
                profile={{
                    id: user.id,
                    email: user.email || '',
                    first_name: profile?.first_name,
                    last_name: profile?.last_name,
                    dni: profile?.dni,
                    birth_date: profile?.birth_date,
                    phone: profile?.phone,
                    roles: profile?.roles,
                    avatar_url: profile?.avatar_url
                }}
                hasMultipleRoles={hasMultipleRoles}
             />
      )
  }
  
  if (effectiveRole === 'docente') {
      const coursesResult = await getTeacherCourses()
      const courses = coursesResult.success && coursesResult.data ? coursesResult.data : []
      
      return (
             <TeacherDashboard 
                courses={courses} 
                userEmail={user.email || ''}
                profile={{
                    id: user.id,
                    email: user.email || '',
                    first_name: profile?.first_name,
                    last_name: profile?.last_name,
                    dni: profile?.dni,
                    birth_date: profile?.birth_date,
                    phone: profile?.phone,
                    roles: profile?.roles,
                    avatar_url: profile?.avatar_url
                }}
                hasMultipleRoles={hasMultipleRoles}
             />
      )
  }

  if (effectiveRole === 'estudiante') {
      const coursesResult = await getStudentCourses()
      const courses = coursesResult.success && coursesResult.data ? coursesResult.data : []
      
      return (
             <StudentDashboard 
                courses={courses} 
                userEmail={user.email || ''} 
                profile={{
                    id: user.id,
                    email: user.email || '',
                    first_name: profile?.first_name,
                    last_name: profile?.last_name,
                    dni: profile?.dni,
                    birth_date: profile?.birth_date,
                    phone: profile?.phone,
                    roles: profile?.roles,
                    avatar_url: profile?.avatar_url
                }}
                hasMultipleRoles={hasMultipleRoles}
             />
      )
  }

  if (effectiveRole === 'invitado') {
      const coursesResult = await getGuestCourses()
      const courses = coursesResult.success && coursesResult.data ? coursesResult.data : []
      
      return (
             <StudentDashboard 
                courses={courses} 
                userEmail={user.email || ''} 
                profile={{
                    id: user.id,
                    email: user.email || '',
                    first_name: profile?.first_name,
                    last_name: profile?.last_name,
                    dni: profile?.dni,
                    birth_date: profile?.birth_date,
                    phone: profile?.phone,
                    roles: profile?.roles,
                    avatar_url: profile?.avatar_url
                }}
                hasMultipleRoles={hasMultipleRoles}
             />
      )
  }
  
  // Fallback for roles that don't have a specific dashboard yet
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-black font-[family-name:var(--font-geist-sans)]">
        <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800 text-center max-w-md">
            <h1 className="text-2xl font-bold text-gray-100 mb-4">Bienvenido</h1>
            <p className="text-gray-400 mb-6">
                Has ingresado con el rol: <span className="text-indigo-400 font-semibold">{effectiveRole}</span>
            </p>
            <p className="text-gray-500 text-sm mb-6">
                Aún no hay un panel específico configurado para este rol.
            </p>
            
            <div className="flex flex-col gap-3">
                {hasMultipleRoles && (
                    <a href="/" className="text-indigo-400 hover:text-indigo-300 hover:underline">
                        Cambiar de Rol
                    </a>
                )}
                <form action="/auth/signout" method="post">
                    <button className="text-gray-400 hover:text-gray-200 text-sm">
                        Cerrar Sesión
                    </button>
                </form>
            </div>
        </div>
    </div>
  )
}
