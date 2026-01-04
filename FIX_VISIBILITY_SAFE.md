# Restaurar Visibilidad de Usuarios (Modo Seguro)

El script anterior (`FIX_RLS_SIMPLE.md`) te permitió entrar, pero ahora tienes un "efecto secundario": **solo puedes ver tu propio usuario**. Esto hará que las listas de usuarios (ej. para asignar cursos) aparezcan vacías.

Para arreglar esto **sin volver a causar el error de recursión**, debemos usar funciones de seguridad especiales (`SECURITY DEFINER`) que comprueban permisos saltándose las restricciones cíclicas.

Ejecuta este script en el **SQL Editor** para restaurar la visibilidad completa de forma segura:

```sql
-- 1. Función Segura para Admin de Plataforma
-- Verifica permisos directamente en la whitelist sin activar RLS
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.whitelist
    WHERE email = (select auth.jwt() ->> 'email')
    AND 'admin-plataforma' = ANY(roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Función Segura para Admin de Institución
-- Verifica permisos en institution_roles sin activar RLS
CREATE OR REPLACE FUNCTION public.is_institution_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.institution_roles
    WHERE email = (select auth.jwt() ->> 'email')
    AND role = 'admin-institucion'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear Políticas de Visibilidad Seguras
-- Eliminamos primero las políticas si ya existen para evitar errores
DROP POLICY IF EXISTS "Platform Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Institution Admins can view profiles" ON public.profiles;

-- Permitimos ver TODOS los perfiles si la función devuelve true
CREATE POLICY "Platform Admins can view all profiles" ON public.profiles
FOR SELECT
USING ( public.is_platform_admin() );

CREATE POLICY "Institution Admins can view profiles" ON public.profiles
FOR SELECT
USING ( public.is_institution_admin() );

-- Nota: La política "Users can view own profile" del script anterior SE MANTIENE y convive con estas.
```
