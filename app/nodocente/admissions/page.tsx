import { getAdmissionsRequests } from '@/app/actions/nodocente'
import NodocenteAdmissionsView from '@/components/NodocenteAdmissionsView'

export default async function NodocenteAdmissionsPage() {
    const result = await getAdmissionsRequests()
    
    // In a real app we might handle error better, but for now simple fallback
    const requests = result.success && result.data ? result.data : []

    return <NodocenteAdmissionsView requests={requests} />
}
