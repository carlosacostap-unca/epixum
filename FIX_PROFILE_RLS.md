# Corregir Políticas de Acceso a Perfiles (RLS)

Es probable que el usuario no pueda leer sus propios roles debido a una configuración faltante en las políticas de seguridad de la base de datos.

Ejecuta el siguiente script en el **SQL Editor** de Supabase para asegurarte de que los usuarios puedan ver su propia información.

```sql
-- 1. Asegurar que RLS está activo
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Política de Lectura (Permitir ver su propio perfil)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT
USING ( auth.uid() = id );

-- 3. Política de Actualización (Permitir editar su propio perfil)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE
USING ( auth.uid() = id );

-- 4. Política de Inserción (Permitir crear su propio perfil - por si acaso)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT
WITH CHECK ( auth.uid() = id );

-- 5. Política para Service Role (Admin) - Implícito, pero bueno verificar
-- (El Service Role siempre tiene acceso total, no requiere política)
```
