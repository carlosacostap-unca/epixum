-- Make student_email nullable to support open slots
ALTER TABLE sprint_reviews ALTER COLUMN student_email DROP NOT NULL;

-- Drop existing policies to recreate them with better logic
DROP POLICY IF EXISTS "Allow read access to related users" ON sprint_reviews;
DROP POLICY IF EXISTS "Allow write access to teachers and admins" ON sprint_reviews;

-- Create new read policy that allows students to see all slots (including empty ones)
CREATE POLICY "Allow read access to related users" ON sprint_reviews
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM sprints s
            JOIN course_enrollments ce ON ce.course_id = s.course_id
            WHERE s.id = sprint_reviews.sprint_id
            AND ce.email = auth.jwt() ->> 'email'
            -- Allow any enrolled user (teacher or student) to see all slots
            AND ce.role IN ('docente', 'estudiante', 'alumno')
        )
        OR
        EXISTS (
             SELECT 1 FROM sprints s
             JOIN courses c ON c.id = s.course_id
             JOIN institution_roles ir ON ir.institution_id = c.institution_id
             WHERE s.id = sprint_reviews.sprint_id
             AND ir.email = auth.jwt() ->> 'email'
             AND ir.role = 'admin-institucion'
        )
    );

-- Teacher/Admin write policy (Create, Update, Delete)
CREATE POLICY "Allow write access to teachers and admins" ON sprint_reviews
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM sprints s
            JOIN course_enrollments ce ON ce.course_id = s.course_id
            WHERE s.id = sprint_reviews.sprint_id
            AND ce.email = auth.jwt() ->> 'email'
            AND ce.role = 'docente'
        )
        OR
        EXISTS (
             SELECT 1 FROM sprints s
             JOIN courses c ON c.id = s.course_id
             JOIN institution_roles ir ON ir.institution_id = c.institution_id
             WHERE s.id = sprint_reviews.sprint_id
             AND ir.email = auth.jwt() ->> 'email'
             AND ir.role = 'admin-institucion'
        )
    );

-- Student write policy (UPDATE only - for booking/cancelling)
CREATE POLICY "Allow students to book/cancel slots" ON sprint_reviews
    FOR UPDATE
    USING (
        -- Can only update if enrolled in the course
        EXISTS (
            SELECT 1 FROM sprints s
            JOIN course_enrollments ce ON ce.course_id = s.course_id
            WHERE s.id = sprint_reviews.sprint_id
            AND ce.email = auth.jwt() ->> 'email'
            AND ce.role IN ('estudiante', 'alumno')
        )
    )
    WITH CHECK (
        -- Can only update if enrolled (redundant but safe)
        EXISTS (
            SELECT 1 FROM sprints s
            JOIN course_enrollments ce ON ce.course_id = s.course_id
            WHERE s.id = sprint_reviews.sprint_id
            AND ce.email = auth.jwt() ->> 'email'
            AND ce.role IN ('estudiante', 'alumno')
        )
        -- AND logic to ensure they are only changing student_email
        -- (This is hard to enforce strictly in RLS without triggers, but we'll rely on server actions for business logic)
    );
