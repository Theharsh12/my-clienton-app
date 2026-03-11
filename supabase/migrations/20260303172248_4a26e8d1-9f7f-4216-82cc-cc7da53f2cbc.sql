
-- Drop all existing restrictive policies and recreate as permissive

-- profiles
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- projects
DROP POLICY IF EXISTS "Agencies can delete own projects" ON public.projects;
DROP POLICY IF EXISTS "Agencies can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Agencies can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Agencies can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Clients can view assigned projects" ON public.projects;

CREATE POLICY "Agencies can view own projects" ON public.projects FOR SELECT USING (has_role(auth.uid(), 'agency') AND agency_id = auth.uid());
CREATE POLICY "Agencies can insert projects" ON public.projects FOR INSERT WITH CHECK (has_role(auth.uid(), 'agency') AND agency_id = auth.uid());
CREATE POLICY "Agencies can update own projects" ON public.projects FOR UPDATE USING (has_role(auth.uid(), 'agency') AND agency_id = auth.uid());
CREATE POLICY "Agencies can delete own projects" ON public.projects FOR DELETE USING (has_role(auth.uid(), 'agency') AND agency_id = auth.uid());
CREATE POLICY "Clients can view assigned projects" ON public.projects FOR SELECT USING (has_role(auth.uid(), 'client') AND client_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text);

-- user_roles
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;

CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);
