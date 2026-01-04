# Checklist de Resolución de Problemas (Login)

Si ves el spinner cargando infinitamente o el login no completa, verifica estos puntos uno por uno.

## 1. Consola del Navegador (Frontend)

Abre las Herramientas de Desarrollador (F12) -> Consola.

*   **Error: "Google Sign-In mismatch" o "Origin mismatch"**:
    *   Significa que la URL donde estás probando (`http://localhost:3000`) no está en "Authorized JavaScript origins" en Google Cloud Console.
    *   **Solución**: Ve a Google Cloud -> Credentials -> Tu OAuth Client -> Agrega `http://localhost:3000` en Origins.

*   **Error: "Cross-Origin-Opener-Policy policy would be ignored..."**:
    *   Generalmente es una advertencia, pero si el popup se cierra inmediatamente sin hacer nada, puede ser un bloqueo de cookies de terceros.
    *   **Solución**: Prueba en modo incógnito o en otro navegador (Chrome/Firefox).

*   **Error: 401 / 403 / 500 en la llamada a `/auth/google`**:
    *   Mira la pestaña "Network" (Red) -> Filtra por "google" -> Haz click en la petición fallida -> Mira la respuesta ("Response").
    *   Si dice `unauthorized_whitelist`: Tu email no está en la base de datos.
    *   Si dice `unauthorized_role`: Tu email está, pero no tienes el rol `admin-plataforma`.
    *   Si dice `invalid_grant` o similar: Supabase rechazó el token. Ver punto 2.

## 2. Servidor de Supabase (Backend)

Si la petición llega al servidor pero falla al validar con Supabase:

*   **¿Configuraste `SKIP_NONCE_CHECK`?**
    *   Es la causa #1 de fallos en este flujo. Si Supabase espera un "nonce" y Google no lo envía (porque es flujo implícito), falla.
    *   **Verificación**: Asegúrate de que en Coolify tienes `GOTRUE_EXTERNAL_GOOGLE_SKIP_NONCE_CHECK=true`.

*   **¿Client ID Coincide?**
    *   El `NEXT_PUBLIC_GOOGLE_CLIENT_ID` de tu `.env` (Frontend) **DEBE SER IDÉNTICO** al `GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID` en Coolify (Backend).
    *   Si son diferentes, Google emitirá el token para uno, y Supabase lo rechazará porque espera el otro.

## 3. Base de Datos

*   **Tabla Whitelist**:
    *   ¿Insertaste tu correo?
    *   `select * from public.whitelist;`

*   **Políticas RLS**:
    *   ¿Ejecutaste el script de RLS? Si la tabla `whitelist` no tiene permisos de lectura (`select using (true)`), el servidor no podrá consultarla si intenta hacerlo con el usuario anon (aunque en nuestro código usamos el cliente servidor, verificar esto no está de más).

## 4. Prueba de Diagnóstico Rápido

Crea un archivo `app/test-env/page.tsx` temporalmente para ver qué está viendo tu servidor:

```tsx
export default function TestPage() {
  return (
    <div>
      <h1>Check Variables</h1>
      <p>Client ID: {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}</p>
      <p>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
    </div>
  )
}
```

(No olvides borrarlo después).
