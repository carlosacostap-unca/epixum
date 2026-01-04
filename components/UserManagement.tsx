'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addUser, deleteUser, updateUser } from '@/app/actions/users'

type User = {
  email: string
  roles: string[] | null
  created_at: string
  first_name?: string
  last_name?: string
  dni?: string
  birth_date?: string
  phone?: string
}

const AVAILABLE_ROLES = [
  'estudiante',
  'docente',
  'nodocente',
  'admin-institucion',
  'admin-plataforma'
]

const ROLE_LABELS: Record<string, string> = {
  'estudiante': 'Estudiante',
  'docente': 'Docente',
  'nodocente': 'Nodocente',
  'admin-institucion': 'Admin Institución',
  'admin-plataforma': 'Admin Plataforma'
}

export default function UserManagement({ initialUsers }: { initialUsers: any[] }) {
  const router = useRouter()
  // Ensure roles is always an array and filter out empty strings
  const users: User[] = initialUsers.map(u => {
    let roles = Array.isArray(u.roles) ? u.roles : (u.role ? [u.role] : [])
    // Filter empty strings
    roles = roles.filter((r: string) => r && r.trim() !== '')
    return {
      ...u,
      roles
    }
  })
  
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Add Form states
  const [newEmail, setNewEmail] = useState('')
  const [newRoles, setNewRoles] = useState<string[]>(['estudiante'])
  const [newUserData, setNewUserData] = useState({
      first_name: '',
      last_name: '',
      dni: '',
      birth_date: '',
      phone: ''
  })

  // Edit State
  const [editingUser, setEditingUser] = useState<User | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    
    const formData = new FormData()
    formData.append('email', newEmail)
    formData.append('roles', JSON.stringify(newRoles))
    formData.append('first_name', newUserData.first_name)
    formData.append('last_name', newUserData.last_name)
    formData.append('dni', newUserData.dni)
    formData.append('birth_date', newUserData.birth_date)
    formData.append('phone', newUserData.phone)

    startTransition(async () => {
      const result = await addUser(formData)
      if (!result.success) {
        setError(result.error || 'Error al agregar usuario')
      } else {
        setNewEmail('')
        setNewRoles(['estudiante'])
        setNewUserData({ first_name: '', last_name: '', dni: '', birth_date: '', phone: '' })
        router.refresh()
      }
    })
  }

  async function handleDelete(email: string) {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return
    
    setError(null)
    startTransition(async () => {
      const result = await deleteUser(email)
      if (!result.success) {
        setError(result.error || 'Error al eliminar usuario')
      } else {
        router.refresh()
      }
    })
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault()
    if (!editingUser) return

    setError(null)
    startTransition(async () => {
        const result = await updateUser(editingUser.email, {
            roles: editingUser.roles || [],
            first_name: editingUser.first_name,
            last_name: editingUser.last_name,
            dni: editingUser.dni,
            birth_date: editingUser.birth_date,
            phone: editingUser.phone
        })
        if (!result.success) {
            setError(result.error || 'Error al actualizar usuario')
        } else {
            setEditingUser(null)
            router.refresh()
        }
    })
  }

  // Quick toggle (still supported but now calls updateUser)
  async function handleRoleToggle(email: string, currentRoles: string[], roleToToggle: string, user: User) {
      setError(null)
      let updatedRoles: string[]
      
      if (currentRoles.includes(roleToToggle)) {
          updatedRoles = currentRoles.filter(r => r !== roleToToggle)
      } else {
          updatedRoles = [...currentRoles, roleToToggle]
      }

      startTransition(async () => {
          const result = await updateUser(email, {
              ...user,
              roles: updatedRoles
          })
          if (!result.success) {
              setError(result.error || 'Error al actualizar roles')
          } else {
              router.refresh()
          }
      })
  }

  const toggleNewRole = (role: string) => {
      setNewRoles(prev => 
        prev.includes(role) 
          ? prev.filter(r => r !== role)
          : [...prev, role]
      )
  }

  const toggleEditRole = (role: string) => {
    if (!editingUser) return
    const currentRoles = editingUser.roles || []
    const updatedRoles = currentRoles.includes(role)
        ? currentRoles.filter(r => r !== role)
        : [...currentRoles, role]
    setEditingUser({ ...editingUser, roles: updatedRoles })
  }

  return (
    <div className="w-full max-w-6xl mt-8 bg-neutral-900 p-6 rounded-lg shadow-md border border-neutral-800">
      <h2 className="text-2xl font-bold mb-6 text-white">Gestión de Usuarios (Whitelist)</h2>

      {error && (
        <div className="bg-red-900/20 text-red-400 p-3 rounded-md mb-4 border border-red-900/50">
          {error}
        </div>
      )}

      {/* Add User Form */}
      <form onSubmit={handleAdd} className="flex flex-col gap-4 mb-8 border-b border-neutral-800 pb-8">
        <h3 className="text-lg font-medium text-gray-200">Agregar Nuevo Usuario</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Email *</label>
                <input
                    name="email"
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-gray-500"
                    placeholder="usuario@ejemplo.com"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Nombres</label>
                <input
                    value={newUserData.first_name}
                    onChange={(e) => setNewUserData({...newUserData, first_name: e.target.value})}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Apellidos</label>
                <input
                    value={newUserData.last_name}
                    onChange={(e) => setNewUserData({...newUserData, last_name: e.target.value})}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">DNI</label>
                <input
                    value={newUserData.dni}
                    onChange={(e) => setNewUserData({...newUserData, dni: e.target.value})}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Fecha Nacimiento</label>
                <input
                    type="date"
                    value={newUserData.birth_date}
                    onChange={(e) => setNewUserData({...newUserData, birth_date: e.target.value})}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Teléfono</label>
                <input
                    value={newUserData.phone}
                    onChange={(e) => setNewUserData({...newUserData, phone: e.target.value})}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                />
            </div>
        </div>
        
        {/* Roles Checkboxes for New User */}
        <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Roles Iniciales:</label>
            <div className="flex flex-wrap gap-3">
                {AVAILABLE_ROLES.map(role => (
                    <label key={role} className="inline-flex items-center space-x-2 cursor-pointer bg-neutral-800 px-3 py-1 rounded-full border border-neutral-700 hover:bg-neutral-700 transition-colors">
                        <input
                            type="checkbox"
                            checked={newRoles.includes(role)}
                            onChange={() => toggleNewRole(role)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 bg-neutral-900 border-neutral-600"
                        />
                        <span className="text-sm text-gray-300 capitalize">{ROLE_LABELS[role] || role}</span>
                    </label>
                ))}
            </div>
        </div>

        <button
            type="submit"
            disabled={isPending}
            className="w-full sm:w-auto self-end bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
            {isPending ? 'Agregando...' : 'Agregar Usuario'}
        </button>
      </form>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold text-white mb-4">Editar Usuario: {editingUser.email}</h3>
                <form onSubmit={handleUpdateUser} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Nombres</label>
                            <input
                                value={editingUser.first_name || ''}
                                onChange={(e) => setEditingUser({...editingUser, first_name: e.target.value})}
                                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Apellidos</label>
                            <input
                                value={editingUser.last_name || ''}
                                onChange={(e) => setEditingUser({...editingUser, last_name: e.target.value})}
                                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">DNI</label>
                            <input
                                value={editingUser.dni || ''}
                                onChange={(e) => setEditingUser({...editingUser, dni: e.target.value})}
                                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Fecha Nacimiento</label>
                            <input
                                type="date"
                                value={editingUser.birth_date || ''}
                                onChange={(e) => setEditingUser({...editingUser, birth_date: e.target.value})}
                                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Teléfono</label>
                            <input
                                value={editingUser.phone || ''}
                                onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})}
                                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-white"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Roles:</label>
                        <div className="flex flex-wrap gap-3">
                            {AVAILABLE_ROLES.map(role => (
                                <label key={role} className="inline-flex items-center space-x-2 cursor-pointer bg-neutral-800 px-3 py-1 rounded-full border border-neutral-700 hover:bg-neutral-700 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={editingUser.roles?.includes(role) || false}
                                        onChange={() => toggleEditRole(role)}
                                        className="rounded text-indigo-600 focus:ring-indigo-500 bg-neutral-900 border-neutral-600"
                                    />
                                    <span className="text-sm text-gray-300 capitalize">{ROLE_LABELS[role] || role}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={() => setEditingUser(null)}
                            className="px-4 py-2 bg-neutral-800 text-gray-300 rounded-md hover:bg-neutral-700"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        >
                            {isPending ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Users List */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-800">
          <thead className="bg-neutral-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Usuario</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Roles</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Fecha Registro</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-neutral-900 divide-y divide-neutral-800">
            {users.map((user) => (
              <tr key={user.email}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-200 align-top">
                  <div>{user.email}</div>
                  <div className="text-xs text-gray-500">
                    {[user.first_name, user.last_name].filter(Boolean).join(' ') || '-'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {user.dni ? `DNI: ${user.dni}` : ''}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-400">
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_ROLES.map(role => {
                        const isActive = user.roles?.includes(role);
                        return (
                            <button
                                key={role}
                                onClick={() => handleRoleToggle(user.email, user.roles || [], role, user)}
                                disabled={isPending}
                                className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                                    isActive 
                                    ? 'bg-indigo-900/50 text-indigo-300 border-indigo-700 hover:bg-indigo-900/70' 
                                    : 'bg-neutral-800 text-gray-400 border-neutral-700 hover:bg-neutral-700'
                                }`}
                            >
                                {ROLE_LABELS[role] || role}
                            </button>
                        )
                    })}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 align-top">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium align-top">
                  <div className="flex flex-col gap-2 items-end">
                    <button
                        onClick={() => setEditingUser(user)}
                        disabled={isPending}
                        className="text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
                    >
                        Editar
                    </button>
                    <button
                        onClick={() => handleDelete(user.email)}
                        disabled={isPending}
                        className="text-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                        Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
                <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                        No hay usuarios registrados en la whitelist.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
