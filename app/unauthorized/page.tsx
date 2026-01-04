import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4">
      <div className="w-full max-w-md text-center space-y-6 bg-neutral-900 p-8 rounded-2xl shadow-xl border border-neutral-800">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-900/20">
          <svg
            className="h-8 w-8 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-white">Acceso Restringido</h1>
        
        <p className="text-gray-400">
          Tu cuenta de Google no está registrada en nuestra base de datos de usuarios autorizados.
        </p>

        <div className="rounded-md bg-yellow-900/20 p-4 text-sm text-yellow-400 text-left border border-yellow-900/30">
          <p>
            <strong>Nota:</strong> Esta plataforma es de uso exclusivo para usuarios pre-aprobados. 
            Si crees que deberías tener acceso, por favor contacta al administrador del sistema para que agregue tu correo electrónico a la lista blanca.
          </p>
        </div>

        <div className="pt-4">
          <Link
            href="/login"
            className="text-indigo-400 hover:text-indigo-300 font-medium"
          >
            &larr; Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  )
}
