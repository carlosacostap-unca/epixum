-- Create sprint_reviews table
CREATE TABLE IF NOT EXISTS sprint_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sprint_id UUID REFERENCES sprints(id) ON DELETE CASCADE NOT NULL,
    student_email TEXT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies
ALTER TABLE sprint_reviews ENABLE ROW LEVEL SECURITY;

-- Allow read access to course participants (Teachers, Admins, and the specific Student)
CREATE POLICY "Allow read access to related users" ON sprint_reviews
    FOR SELECT
    USING (
        -- Is teacher of the course
        EXISTS (
            SELECT 1 FROM sprints s
            JOIN course_enrollments ce ON ce.course_id = s.course_id
            WHERE s.id = sprint_reviews.sprint_id
            AND ce.email = auth.jwt() ->> 'email'
            AND ce.role = 'docente'
        )
        OR
        -- Is admin of the institution
        EXISTS (
             SELECT 1 FROM sprints s
             JOIN courses c ON c.id = s.course_id
             JOIN institution_roles ir ON ir.institution_id = c.institution_id
             WHERE s.id = sprint_reviews.sprint_id
             AND ir.email = auth.jwt() ->> 'email'
             AND ir.role = 'admin-institucion'
        )
        OR
        -- Is the assigned student
        student_email = auth.jwt() ->> 'email'
    );

-- Allow write access to teachers and institution admins
CREATE POLICY "Allow write access to teachers and admins" ON sprint_reviews
    FOR ALL
    USING (
        -- Is teacher of the course
        EXISTS (
            SELECT 1 FROM sprints s
            JOIN course_enrollments ce ON ce.course_id = s.course_id
            WHERE s.id = sprint_reviews.sprint_id
            AND ce.email = auth.jwt() ->> 'email'
            AND ce.role = 'docente'
        )
        OR
        -- Is admin of the institution
        EXISTS (
             SELECT 1 FROM sprints s
             JOIN courses c ON c.id = s.course_id
             JOIN institution_roles ir ON ir.institution_id = c.institution_id
             WHERE s.id = sprint_reviews.sprint_id
             AND ir.email = auth.jwt() ->> 'email'
             AND ir.role = 'admin-institucion'
        )
    );
