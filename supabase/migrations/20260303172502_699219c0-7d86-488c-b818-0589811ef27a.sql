
-- Create security definer function to get current user's email
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email::text FROM auth.users WHERE id = auth.uid()
$$;

-- Recreate client policy using the function
DROP POLICY IF EXISTS "Clients can view assigned projects" ON public.projects;
CREATE POLICY "Clients can view assigned projects" ON public.projects
  FOR SELECT USING (
    has_role(auth.uid(), 'client') AND client_email = public.get_current_user_email()
  );
