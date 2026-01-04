-- Create sprints table
CREATE TABLE IF NOT EXISTS sprints (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone enrolled in the course
CREATE POLICY "Allow read access to course participants" ON sprints
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM course_enrollments
            WHERE course_enrollments.course_id = sprints.course_id
            AND course_enrollments.email = auth.jwt() ->> 'email'
        )
        OR
        EXISTS (
            SELECT 1 FROM courses
            WHERE courses.id = sprints.course_id
            AND courses.institution_id IN (
                SELECT institution_id FROM institution_roles
                WHERE email = auth.jwt() ->> 'email'
                AND role = 'admin-institucion'
            )
        )
    );

-- Allow write access to teachers and institution admins
CREATE POLICY "Allow write access to teachers and admins" ON sprints
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM course_enrollments
            WHERE course_enrollments.course_id = sprints.course_id
            AND course_enrollments.email = auth.jwt() ->> 'email'
            AND course_enrollments.role = 'docente'
        )
        OR
        EXISTS (
            SELECT 1 FROM courses
            WHERE courses.id = sprints.course_id
            AND courses.institution_id IN (
                SELECT institution_id FROM institution_roles
                WHERE email = auth.jwt() ->> 'email'
                AND role = 'admin-institucion'
            )
        )
    );
