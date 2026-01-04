'use client'

import { useState, useTransition, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { addInstitution, deleteInstitution, updateInstitution, assignAdminToInstitution, removeAdminFromInstitution } from '@/app/actions/institutions'

type InstitutionRole = {
    email: string
    role: string
}

type Institution = {
  id: string
  nombre: string
  created_at: string
  institution_roles?: InstitutionRole[]
}

export default function InstitutionManagement({ initialInstitutions }: { initialInstitutions: Institution[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  
  // Form states
  const [newNombre, setNewNombre] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')

  // Admin Management State
  const [managingAdminsId, setManagingAdminsId] = useState<string | null>(null)
  const [newAdminEmail, setNewAdminEmail] = useState('')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    
    const formData = new FormData()
    formData.append('nombre', newNombre)

    startTransition(async () => {
      const result = await addInstitution(formData)
      if (!result.success) {
        setError(result.error || 'Error al agregar institución')
      } else {
        setNewNombre('')
        router.refresh()
      }
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar esta institución?')) return
    
    setError(null)
    startTransition(async () => {
      const result = await deleteInstitution(id)
      if (!result.success) {
        setError(result.error || 'Error al eliminar institución')
      } else {
        router.refresh()
      }
    })
  }

  function startEdit(inst: Institution) {
      setEditingId(inst.id)
      setEditNombre(inst.nombre)
      setManagingAdminsId(null) // Close admin panel if open
  }

  function cancelEdit() {
      setEditingId(null)
      setEditNombre('')
  }

  async function handleUpdate(id: string) {
      setError(null)
      startTransition(async () => {
          const result = await updateInstitution(id, editNombre)
          if (!result.success) {
              setError(result.error || 'Error al actualizar institución')
          } else {
              setEditingId(null)
              setEditNombre('')
              router.refresh()
          }
      })
  }

  // Admin Management Handlers
  function toggleAdminManagement(id: string) {
      if (managingAdminsId === id) {
          setManagingAdminsId(null)
          setNewAdminEmail('')
      } else {
          setManagingAdminsId(id)
          setEditingId(null) // Close edit if open
          setNewAdminEmail('')
      }
  }

  async function handleAddAdmin(institutionId: string) {
      if (!newAdminEmail.trim()) return
      setError(null)
      startTransition(async () => {
          const result = await assignAdminToInstitution(institutionId, newAdminEmail.trim())
          if (!result.success) {
              setError(result.error || 'Error al asignar admin')
          } else {
              setNewAdminEmail('')
              router.refresh()
          }
      })
  }

  async function handleRemoveAdmin(institutionId: string, email: string) {
      if (!confirm(`¿Quitar rol de admin a ${email}?`)) return
      setError(null)
      startTransition(async () => {
          const result = await removeAdminFromInstitution(institutionId, email)
          if (!result.success) {
              setError(result.error || 'Error al quitar admin')
          } else {
              router.refresh()
          }
      })
  }

  return (
    <div className="w-full max-w-4xl mt-8 bg-neutral-900 p-6 rounded-lg shadow-md border border-neutral-800">
      <h2 className="text-2xl font-bold mb-6 text-white">Gestión de Instituciones</h2>

      {error && (
        <div className="bg-red-900/20 text-red-400 p-3 rounded-md mb-4 border border-red-900/50">
          {error}
        </div>
      )}

      {/* Add Institution Form */}
      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4 items-end mb-8 border-b border-neutral-800 pb-8">
        <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-300 mb-1">Nombre de la Institución</label>
            <input
                type="text"
                required
                value={newNombre}
                onChange={(e) => setNewNombre(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-gray-500"
                placeholder="Ej: Universidad Nacional..."
            />
        </div>
        <div className="w-full sm:w-auto">
            <button
                type="submit"
                disabled={isPending}
                className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors h-10"
            >
                {isPending ? 'Agregando...' : 'Agregar Institución'}
            </button>
        </div>
      </form>

      {/* Institutions List */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-800">
          <thead className="bg-neutral-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Admins</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-neutral-900 divide-y divide-neutral-800">
            {initialInstitutions.map((inst) => (
              <Fragment key={inst.id}>
                <tr className={managingAdminsId === inst.id ? "bg-neutral-800/30" : ""}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-200 align-middle">
                        {editingId === inst.id ? (
                            <input 
                                type="text" 
                                value={editNombre}
                                onChange={(e) => setEditNombre(e.target.value)}
                                className="w-full px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-white focus:outline-none focus:border-indigo-500"
                            />
                        ) : (
                            <div>
                                <div>{inst.nombre}</div>
                                <div className="text-xs text-gray-500 mt-1 font-mono">{inst.id}</div>
                            </div>
                        )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 align-middle">
                        <div className="flex flex-wrap gap-1">
                            {inst.institution_roles && inst.institution_roles.length > 0 ? (
                                inst.institution_roles
                                    .filter(r => r.role === 'admin-institucion')
                                    .map(r => (
                                        <span key={r.email} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-900/30 text-purple-300 border border-purple-800">
                                            {r.email}
                                        </span>
                                    ))
                            ) : (
                                <span className="text-gray-600 text-xs italic">Sin administradores</span>
                            )}
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium align-middle">
                    <div className="flex justify-end gap-3 items-center">
                        {editingId === inst.id ? (
                            <>
                                <button
                                    onClick={() => handleUpdate(inst.id)}
                                    disabled={isPending}
                                    className="text-green-400 hover:text-green-300 disabled:opacity-50"
                                >
                                    Guardar
                                </button>
                                <button
                                    onClick={cancelEdit}
                                    disabled={isPending}
                                    className="text-gray-400 hover:text-gray-300 disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => toggleAdminManagement(inst.id)}
                                    disabled={isPending}
                                    className={`${managingAdminsId === inst.id ? 'text-purple-300' : 'text-purple-400 hover:text-purple-300'} disabled:opacity-50 transition-colors`}
                                >
                                    {managingAdminsId === inst.id ? 'Cerrar Admins' : 'Gestionar Admins'}
                                </button>
                                <span className="text-neutral-700">|</span>
                                <button
                                    onClick={() => startEdit(inst)}
                                    disabled={isPending}
                                    className="text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
                                >
                                    Editar
                                </button>
                                <button
                                    onClick={() => handleDelete(inst.id)}
                                    disabled={isPending}
                                    className="text-red-400 hover:text-red-300 disabled:opacity-50"
                                >
                                    Eliminar
                                </button>
                            </>
                        )}
                    </div>
                    </td>
                </tr>
                
                {/* Admin Management Panel */}
                {managingAdminsId === inst.id && (
                    <tr className="bg-neutral-800/30">
                        <td colSpan={3} className="px-6 py-4">
                            <div className="bg-neutral-900 rounded border border-neutral-700 p-4">
                                <h4 className="text-sm font-semibold text-gray-300 mb-3">Administradores de {inst.nombre}</h4>
                                
                                <div className="space-y-3">
                                    {/* Add New Admin */}
                                    <div className="flex gap-2">
                                        <input
                                            type="email"
                                            placeholder="Email del nuevo admin..."
                                            value={newAdminEmail}
                                            onChange={(e) => setNewAdminEmail(e.target.value)}
                                            className="flex-1 px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded text-sm text-white focus:outline-none focus:border-purple-500"
                                        />
                                        <button
                                            onClick={() => handleAddAdmin(inst.id)}
                                            disabled={isPending || !newAdminEmail.trim()}
                                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Asignar
                                        </button>
                                    </div>

                                    {/* List Admins */}
                                    <div className="mt-4">
                                        {inst.institution_roles?.filter(r => r.role === 'admin-institucion').length === 0 && (
                                            <p className="text-sm text-gray-500 italic">No hay administradores asignados aún.</p>
                                        )}
                                        <ul className="space-y-2">
                                            {inst.institution_roles
                                                ?.filter(r => r.role === 'admin-institucion')
                                                .map(r => (
                                                <li key={r.email} className="flex justify-between items-center bg-neutral-800 px-3 py-2 rounded border border-neutral-700">
                                                    <span className="text-sm text-gray-200">{r.email}</span>
                                                    <button
                                                        onClick={() => handleRemoveAdmin(inst.id, r.email)}
                                                        disabled={isPending}
                                                        className="text-red-400 hover:text-red-300 text-xs font-medium"
                                                    >
                                                        Quitar
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </td>
                    </tr>
                )}
              </Fragment>
            ))}
            {initialInstitutions.length === 0 && (
                <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                        No hay instituciones registradas.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
