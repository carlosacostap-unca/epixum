'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getMyProfile, updateMyProfile } from '@/app/actions/profile'

export default function EditProfile() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    dni: '',
    birth_date: '',
    phone: ''
  })
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      const result = await getMyProfile()
      if (result.success && result.data) {
        setFormData({
          first_name: result.data.first_name || '',
          last_name: result.data.last_name || '',
          dni: result.data.dni || '',
          birth_date: result.data.birth_date ? result.data.birth_date.split('T')[0] : '',
          phone: result.data.phone || ''
        })
        if (result.data.avatar_url) {
            setAvatarUrl(result.data.avatar_url)
        }
      }
      setLoading(false)
    }
    loadProfile()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const data = new FormData()
    data.append('first_name', formData.first_name)
    data.append('last_name', formData.last_name)
    data.append('dni', formData.dni)
    data.append('birth_date', formData.birth_date)
    data.append('phone', formData.phone)
    data.append('profile_completed', 'true')

    const result = await updateMyProfile(data)

    if (result.success) {
      router.push('/') // Redirect to home/dashboard
      router.refresh()
    } else {
      setError(result.error || 'Error al actualizar el perfil')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            {avatarUrl && !imageError ? (
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-indigo-500/30">
                    <Image 
                        src={avatarUrl} 
                        alt="Foto de perfil" 
                        fill
                        className="object-cover"
                        priority
                        onError={() => setImageError(true)}
                    />
                </div>
            ) : (
                <Image 
                    src="/epixum-logo.png" 
                    alt="Epixum Logo" 
                    width={80} 
                    height={80}
                    className="object-contain"
                    priority
                />
            )}
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-white">
            Editar Perfil
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Actualiza tus datos personales.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-300">
                Nombres
              </label>
              <input
                id="first_name"
                name="first_name"
                type="text"
                required
                className="mt-1 block w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-300">
                Apellidos
              </label>
              <input
                id="last_name"
                name="last_name"
                type="text"
                required
                className="mt-1 block w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="dni" className="block text-sm font-medium text-gray-300">
                DNI
              </label>
              <input
                id="dni"
                name="dni"
                type="text"
                required
                className="mt-1 block w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                value={formData.dni}
                onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="birth_date" className="block text-sm font-medium text-gray-300">
                Fecha de Nacimiento
              </label>
              <input
                id="birth_date"
                name="birth_date"
                type="date"
                required
                className="mt-1 block w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm [color-scheme:dark]"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-300">
                Teléfono
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                className="mt-1 block w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Link
              href="/"
              className="flex-1 flex justify-center rounded-md border border-neutral-700 bg-transparent px-4 py-2 text-sm font-medium text-gray-300 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}