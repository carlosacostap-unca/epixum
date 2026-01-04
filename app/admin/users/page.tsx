import { getUsers } from '@/app/actions/users'
import UserManagement from '@/components/UserManagement'
import { checkPlatformAdmin } from '@/app/actions/institutions'
import { redirect } from 'next/navigation'

export default async function UsersPage() {
    try {
        await checkPlatformAdmin()
    } catch {
        redirect('/unauthorized')
    }

    const usersResult = await getUsers()
    const whitelistUsers = usersResult.success && usersResult.data ? usersResult.data : []

    return (
        <div className="flex min-h-screen flex-col items-center p-8 font-[family-name:var(--font-geist-sans)] bg-black text-gray-200">
            <div className="w-full max-w-4xl">
                <div className="mb-6 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-100">Gestión de Usuarios</h1>
                    <a href="/?role=admin-plataforma" className="text-indigo-400 hover:text-indigo-300 hover:underline">
                        ← Volver al Panel
                    </a>
                </div>
                <UserManagement initialUsers={whitelistUsers} />
            </div>
        </div>
    )
}
