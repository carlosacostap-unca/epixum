import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ImportDashboard from '@/components/ImportDashboard'

export default async function ImportPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('roles')
        .eq('id', user.id)
        .single()
    
    // Check if user has admin-plataforma role
    if (!profile?.roles?.includes('admin-plataforma')) {
        redirect('/')
    }

    return (
        <div className="flex min-h-screen flex-col items-center p-8 bg-black font-[family-name:var(--font-geist-sans)]">
            <div className="w-full max-w-6xl flex flex-col gap-8 items-start">
                 <div className="flex justify-between w-full items-center bg-neutral-900 p-6 rounded-lg shadow-sm border border-neutral-800">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-100">Gestión de Datos</h1>
                        <p className="text-gray-400 mt-1">
                            Administración y gestión de datos del sistema.
                        </p>
                    </div>
                    <Link 
                        href="/?role=admin-plataforma" 
                        className="text-indigo-400 hover:text-indigo-300 hover:underline"
                    >
                        ← Volver al Panel
                    </Link>
                </div>
                
                <ImportDashboard />
            </div>
        </div>
    )
}
