# Solución Definitiva de Permisos (RLS)

El error `Error fetching profile` confirma que la base de datos está ocultando tu propio perfil debido a políticas de seguridad (RLS) incorrectas o restrictivas. Aunque el perfil existe (el login lo ve), la página principal no tiene permiso para leerlo.

Ejecuta este script completo en el **SQL Editor** de Supabase para reiniciar y corregir los permisos de la tabla `profiles`.

```sql
-- 1. Asegurar que RLS está habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas antiguas (para limpiar conflictos)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;

-- 3. Crear Políticas Correctas

-- Lectura: Ver tu propio perfil
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT
USING ( auth.uid() = id );

-- Actualización: Editar tu propio perfil
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE
USING ( auth.uid() = id );

-- Inserción: Crear tu propio perfil (necesario para el primer login si falla el trigger)
CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT
WITH CHECK ( auth.uid() = id );

-- 4. Permisos Generales (Grants)
-- Asegura que los roles de Supabase tengan acceso básico a la tabla
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO postgres, anon, authenticated, service_role;

-- 5. Verificación (Opcional)
-- Si ejecutas esto, deberías ver tu usuario si estás logueado en el editor SQL con tu cuenta,
-- pero el editor SQL usa rol postgres/service_role por defecto, así que siempre verá todo.
```
