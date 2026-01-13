-- Add status column to courses table
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Borrador' CHECK (status IN ('Borrador', 'Activo', 'Finalizado'));

-- Update existing courses to have 'Borrador' status if null (though default handles new ones)
UPDATE public.courses SET status = 'Borrador' WHERE status IS NULL;
