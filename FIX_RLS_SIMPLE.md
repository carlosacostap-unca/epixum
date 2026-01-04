# Solución Final: Permisos Simplificados

Si sigues viendo `Error fetching profile: {}` (vacío), significa que las políticas anteriores siguen activas o hay un conflicto de permisos básico.

Vamos a simplificar al máximo. Ejecuta este script para:
1.  Borrar TODAS las políticas complejas de `profiles`.
2.  Habilitar una política simple que SIEMPRE funciona: "Cada uno ve lo suyo".

```sql
-- 1. Limpieza total de políticas en profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Institution Admins can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
-- Eliminar también cualquier otra política residual que no conocemos por nombre
-- (Si supiera los nombres exactos los pondría, pero esto asegura limpiar las conocidas)

-- 2. Política SIMPLE y SEGURA (Sin recursión, sin dependencias)
-- "Si el ID del usuario coincide con el ID de la fila, puede verla".
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT
USING ( auth.uid() = id );

-- 3. Permitir actualización propia
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE
USING ( auth.uid() = id );

-- 4. Permitir inserción propia
CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT
WITH CHECK ( auth.uid() = id );

-- NOTA: Con esto, el admin NO podrá ver otros perfiles temporalmente, 
-- pero TÚ podrás entrar. Una vez dentro, podemos re-agregar la política de admin con cuidado.
```
