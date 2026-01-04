# Configuración de Supabase

Para que el sistema de login funcione correctamente, necesitas configurar tu proyecto de Supabase (self-hosted o cloud) con las siguientes tablas y proveedores.

## 1. Base de Datos (SQL Editor)

Ejecuta el siguiente script SQL en el editor de Supabase para crear las tablas necesarias (Profiles y Whitelist).

```sql
-- 1. Tabla de Perfiles (Extiende auth.users)
create table if not exists public.profiles (
  id uuid not null references auth.users on delete cascade,
  email text,
  role text default 'user',
  created_at timestamptz default now(),
  primary key (id)
);

-- RLS para Profiles
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using ( auth.uid() = id );
create policy "Users can update own profile" on public.profiles for update using ( auth.uid() = id );

-- 2. Tabla Whitelist (Lista blanca de correos permitidos)
create table if not exists public.whitelist (
  email text primary key,
  role text default 'user',
  created_at timestamptz default now()
);

-- RLS para Whitelist (Solo lectura para autenticados o service_role)
alter table public.whitelist enable row level security;
-- Permitir lectura a todos (para que el callback pueda consultar) o restringir a service_role si usas supabase-admin.
-- Dado que consultamos desde el servidor (Next.js server-side), usamos la Service Key o el cliente autenticado. 
-- Para simplificar, permitimos lectura pública o authenticated.
create policy "Enable read access for all users" on public.whitelist for select using ( true );

-- 3. Trigger para crear perfil (Opcional si usas el callback para crear perfiles)
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user');
  return new;
end;
$$ language plpgsql security definer;

-- Nota: Si usas la lógica de whitelist estricta, podrías QUERER deshabilitar este trigger
-- y dejar que el código de la aplicación cree el perfil solo si está en la whitelist.
-- Pero dejarlo no hace daño, ya que borraremos la sesión si no está en whitelist.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

## 2. Configurar Usuarios Permitidos (Pre-registro)

Para que un usuario pueda entrar, **debes agregarlo manualmente a la tabla `whitelist`**.

Ejemplo SQL para agregar un admin:

```sql
insert into public.whitelist (email, role)
values ('tu-email@gmail.com', 'admin-plataforma');
```

Si un usuario intenta entrar con Google y su correo NO está en esta tabla, será redirigido a una pantalla de advertencia.

## 3. Configuración de Google Auth (Flujo Cliente / ID Token)

Este proyecto usa el **Flujo de ID Token (Client-Side)**. Esto significa que la aplicación se comunica directamente con Google y luego envía el token a Supabase. Esto evita problemas de redirección con el servidor de Supabase.

### A. Configuración en Google Cloud Console

1. Crea o selecciona tu proyecto.
2. Ve a **APIs & Services** -> **Credentials**.
3. Crea una credencial **OAuth 2.0 Client ID**.
4. Tipo de aplicación: **Web application**.
5. **Authorized JavaScript origins**:
   *   Agrega: `http://localhost:3000` (para desarrollo).
   *   Agrega: `https://tu-dominio-produccion.com` (cuando despliegues).
   *   **NO** necesitas poner la URL de Supabase aquí.
6. **Authorized redirect URIs**:
   *   Puedes dejarlo vacío o poner lo mismo que arriba. En este flujo, Google no hace una redirección de servidor, usa un popup.
7. **Copia tu Client ID**.

### B. Configuración en Supabase (Coolify / Docker)

Para que Supabase acepte el token que le envía tu aplicación, debe conocer las credenciales de Google.

En **Coolify**, ve a tu servicio de Supabase (sección `auth` o `gotrue`) y configura estas Variables de Entorno:

```env
# Habilita el proveedor de Google
GOTRUE_EXTERNAL_GOOGLE_ENABLED=true

# Credenciales (Las mismas de Google Cloud Console)
GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID=tu_client_id_de_google
GOTRUE_EXTERNAL_GOOGLE_SECRET=tu_client_secret_de_google

# Importante para el flujo de ID Token (evita errores de nonce)
GOTRUE_EXTERNAL_GOOGLE_SKIP_NONCE_CHECK=true

# URL base de tu sitio (opcional en este flujo, pero buena práctica)
GOTRUE_SITE_URL=http://localhost:3000
```

> **Nota:** Ya NO necesitas configurar `GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI` ni `GOTRUE_URI_ALLOW_LIST` para que funcione el login, porque en este flujo **Supabase ya no hace redirecciones**, solo valida el token.

### C. Variables de Entorno (.env local)

Agrega tu Client ID al archivo `.env` de tu proyecto Next.js:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-dominio.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
NEXT_PUBLIC_GOOGLE_CLIENT_ID=pegatu-client-id-de-google-aqui.apps.googleusercontent.com
```

### D. Whitelist (Usuarios Permitidos)

Recuerda que para entrar, tu email debe estar en la tabla `whitelist` en Supabase:

```sql
insert into public.whitelist (email, role)
values ('tu-email@gmail.com', 'admin-plataforma');
```
