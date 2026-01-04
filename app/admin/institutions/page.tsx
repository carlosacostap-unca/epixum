import { getInstitutions, checkPlatformAdmin } from '@/app/actions/institutions'
import InstitutionManagement from '@/components/InstitutionManagement'
import { redirect } from 'next/navigation'

export default async function InstitutionsPage() {
    try {
        await checkPlatformAdmin()
    } catch {
        redirect('/unauthorized')
    }

    const institutionsResult = await getInstitutions()
    const institutions = institutionsResult.success && institutionsResult.data ? institutionsResult.data : []

    return (
        <div className="flex min-h-screen flex-col items-center p-8 font-[family-name:var(--font-geist-sans)] bg-black text-gray-200">
            <div className="w-full max-w-4xl">
                <div className="mb-6 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-100">Gestión de Instituciones</h1>
                    <a href="/?role=admin-plataforma" className="text-indigo-400 hover:text-indigo-300 hover:underline">
                        ← Volver al Panel
                    </a>
                </div>
                <InstitutionManagement initialInstitutions={institutions} />
            </div>
        </div>
    )
}
