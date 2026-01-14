-- Change start_date and end_date to TIMESTAMPTZ
ALTER TABLE public.courses 
ALTER COLUMN start_date TYPE TIMESTAMPTZ USING start_date::TIMESTAMPTZ,
ALTER COLUMN end_date TYPE TIMESTAMPTZ USING end_date::TIMESTAMPTZ;
