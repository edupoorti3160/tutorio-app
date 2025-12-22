-- 1. Allow NULL teacher_id in class_requests to support "Broadcast" model
ALTER TABLE class_requests ALTER COLUMN teacher_id DROP NOT NULL;

-- 2. Drop existing restrictive policies (adjust names if they differ, these are best guesses based on standard practices or previous context)
DROP POLICY IF EXISTS "Enable read access for all users" ON class_requests;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON class_requests;
DROP POLICY IF EXISTS "Enable update for users based on email" ON class_requests;
-- Specific policies if they exist from previous attempts
DROP POLICY IF EXISTS "view_waiting_requests" ON class_requests;
DROP POLICY IF EXISTS "insert_request" ON class_requests;
DROP POLICY IF EXISTS "accept_request" ON class_requests;

-- 3. Create Robust Policies

-- A) INSERT: Allow any authenticated user (Student) to create a request
-- We allow them to insert ANY row, or we can restrict it to their own user_id.
CREATE POLICY "insert_request"
ON class_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = student_id);

-- B) SELECT (Student): Students can see their own requests
CREATE POLICY "view_own_requests"
ON class_requests
FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

-- C) SELECT (Teacher): Teachers can see ALL "waiting" requests (Broadcast)
-- OR requests where they are already assigned.
-- We assume 'teacher' role check might be needed if you have robust RBAC, 
-- but for now allow authenticated users to see waiting requests to ensure Realtime works.
-- If you have a 'profiles' table with roles, you could do specific joins, but keeping it simple for stability:
CREATE POLICY "view_waiting_requests_as_teacher"
ON class_requests
FOR SELECT
TO authenticated
USING (
  status = 'waiting' 
  OR teacher_id = auth.uid()
);

-- D) UPDATE (Teacher): Teachers can "Accept" a call
-- They can update a row if it is currently 'waiting' AND they are assigning themselves.
CREATE POLICY "accept_request"
ON class_requests
FOR UPDATE
TO authenticated
USING (status = 'waiting')
WITH CHECK (
  teacher_id = auth.uid() 
  AND status = 'accepted'
);

-- 4. Enable Realtime for this table (if not already enabled)
alter publication supabase_realtime add table class_requests;
