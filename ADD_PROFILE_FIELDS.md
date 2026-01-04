# Agregar columna Nombre Completo a Perfiles

Para permitir que los usuarios administren su perfil con más detalle, agregaremos la columna `full_name` a la tabla `profiles`.

Ejecuta este script en el **SQL Editor** de Supabase:

```sql
-- 1. Agregar columna full_name
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name text;

-- 2. Asegurar que los usuarios puedan actualizar su propio perfil
-- (Ya debería existir la política "Users can update own profile", pero la reforzamos/verificamos)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE
USING ( auth.uid() = id )
WITH CHECK ( auth.uid() = id );
```
