# Solución: Recursión Infinita en RLS

El error `infinite recursion detected` indica que una de las políticas de seguridad (RLS) se está llamando a sí misma en un bucle sin fin. Esto suele ocurrir cuando una política intenta consultar la misma tabla que está protegiendo para verificar permisos (ej. "Admin puede ver perfiles" -> consulta `profiles` para ver si es admin -> verifica permisos en `profiles` -> repite).

Para romper este ciclo, debemos simplificar las políticas o usar una función de seguridad que evite la recursión (`security definer`).

### Instrucciones

Ejecuta este script en el **SQL Editor** de Supabase. Este script **borra las políticas problemáticas** y las reemplaza por versiones seguras que evitan la recursión.

```sql
-- 1. Eliminar políticas conflictivas en 'profiles'
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Institution Admins can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- 2. Crear Política Básica (Usuario ve su propio perfil)
-- Esta es segura y no causa recursión porque usa auth.uid() directamente
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT
USING ( auth.uid() = id );

-- 3. Crear Función Segura para chequear Admin (Rompe la recursión)
-- Usamos SECURITY DEFINER para que la función se ejecute con permisos de sistema
-- y no dispare las políticas RLS nuevamente.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.whitelist
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND 'admin-plataforma' = ANY(roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Crear Política de Admin usando la función segura
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT
USING ( public.is_admin() );

-- 5. Crear Política para Admin Institución (Sin recursión)
-- Consultamos 'institution_roles' en lugar de volver a consultar 'profiles'
CREATE POLICY "Institution Admins can view profiles" ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.institution_roles
    WHERE institution_roles.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND institution_roles.role = 'admin-institucion'
  )
);
```
