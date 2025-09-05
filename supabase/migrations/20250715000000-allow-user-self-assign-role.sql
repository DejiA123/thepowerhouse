-- Allow users to assign a role to themselves (self-assign with PIN)
CREATE POLICY "Users can assign their own role with PIN"
ON public.user_roles
FOR INSERT
WITH CHECK (auth.uid() = user_id); 