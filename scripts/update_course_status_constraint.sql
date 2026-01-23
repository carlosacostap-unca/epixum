-- Update the check constraint for course status to include 'En Prueba'
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_status_check;

ALTER TABLE public.courses 
ADD CONSTRAINT courses_status_check 
CHECK (status IN ('Borrador', 'En Prueba', 'Activo', 'Finalizado'));
