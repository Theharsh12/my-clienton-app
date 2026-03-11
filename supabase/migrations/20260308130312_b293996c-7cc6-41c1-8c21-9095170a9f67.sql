
-- Drop all existing RESTRICTIVE policies and recreate as PERMISSIVE

-- checklist_templates
DROP POLICY IF EXISTS "Owner full access" ON public.checklist_templates;
DROP POLICY IF EXISTS "Anon read templates" ON public.checklist_templates;

CREATE POLICY "Owner full access" ON public.checklist_templates FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anon read templates" ON public.checklist_templates FOR SELECT TO anon USING (true);

-- checklist_items
DROP POLICY IF EXISTS "Owner full access" ON public.checklist_items;
DROP POLICY IF EXISTS "Anon read items" ON public.checklist_items;

CREATE POLICY "Owner full access" ON public.checklist_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM checklist_templates t WHERE t.id = checklist_items.template_id AND t.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM checklist_templates t WHERE t.id = checklist_items.template_id AND t.user_id = auth.uid()));
CREATE POLICY "Anon read items" ON public.checklist_items FOR SELECT TO anon USING (true);

-- clients
DROP POLICY IF EXISTS "Owner full access" ON public.clients;
DROP POLICY IF EXISTS "Anon read clients" ON public.clients;

CREATE POLICY "Owner full access" ON public.clients FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anon read clients" ON public.clients FOR SELECT TO anon USING (true);

-- client_responses
DROP POLICY IF EXISTS "Owner read responses" ON public.client_responses;
DROP POLICY IF EXISTS "Anon manage responses" ON public.client_responses;

CREATE POLICY "Owner read responses" ON public.client_responses FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM clients c WHERE c.id = client_responses.client_id AND c.user_id = auth.uid()));
CREATE POLICY "Anon manage responses" ON public.client_responses FOR ALL TO anon USING (true) WITH CHECK (true);

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
