# Configuración de Storage para Recursos

Ejecuta este script en el **SQL Editor** de Supabase para crear el bucket de almacenamiento y configurar las políticas de seguridad.

```sql
-- 1. Crear el bucket 'class-resources'
-- Nota: En Supabase self-hosted a veces es necesario crear el bucket desde la UI o mediante API.
-- Intentamos insertarlo directamente en storage.buckets si no existe.
INSERT INTO storage.buckets (id, name, public)
VALUES ('class-resources', 'class-resources', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Habilitar RLS en objetos de storage (por si no está habilitado)
-- Normalmente ya está habilitado, pero aseguramos.
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Seguridad para Storage

-- POLICY: Teachers can upload files (Subir archivos a sus clases)
-- Asumimos estructura de carpetas: class_id/filename
DROP POLICY IF EXISTS "Teachers can upload class resources" ON storage.objects;
CREATE POLICY "Teachers can upload class resources" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'class-resources' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.classes c
    JOIN public.course_enrollments ce ON c.course_id = ce.course_id
    WHERE c.id::text = (storage.foldername(name))[1]
    AND ce.email = (auth.jwt() ->> 'email')
    AND ce.role = 'docente'
  )
);

-- POLICY: Teachers can delete files
DROP POLICY IF EXISTS "Teachers can delete class resources" ON storage.objects;
CREATE POLICY "Teachers can delete class resources" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'class-resources' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.classes c
    JOIN public.course_enrollments ce ON c.course_id = ce.course_id
    WHERE c.id::text = (storage.foldername(name))[1]
    AND ce.email = (auth.jwt() ->> 'email')
    AND ce.role = 'docente'
  )
);

-- POLICY: Public/Students can view files
-- Como el bucket es público, esto facilita el acceso directo por URL.
-- Pero para navegar/listar objetos, necesitamos política SELECT.
DROP POLICY IF EXISTS "Anyone can view class resources" ON storage.objects;
CREATE POLICY "Anyone can view class resources" ON storage.objects
FOR SELECT
USING ( bucket_id = 'class-resources' );
```
