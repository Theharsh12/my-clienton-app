
-- Drop old structures
DROP POLICY IF EXISTS "Agencies can delete own projects" ON public.projects;
DROP POLICY IF EXISTS "Agencies can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Agencies can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Agencies can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Clients can view assigned projects" ON public.projects;
DROP TABLE IF EXISTS public.projects CASCADE;

DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP TABLE IF EXISTS public.user_roles CASCADE;

DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
DROP FUNCTION IF EXISTS public.get_user_role(uuid);
DROP FUNCTION IF EXISTS public.get_current_user_email();
DROP TYPE IF EXISTS public.app_role;

-- Simplify profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS agency_name;

-- Fix profile policies to be permissive
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Checklist templates
CREATE TABLE public.checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner full access" ON public.checklist_templates FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anon read templates" ON public.checklist_templates FOR SELECT TO anon USING (true);

-- Checklist items
CREATE TABLE public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  position INTEGER NOT NULL DEFAULT 0,
  required BOOLEAN NOT NULL DEFAULT false
);
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner full access" ON public.checklist_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.checklist_templates t WHERE t.id = template_id AND t.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.checklist_templates t WHERE t.id = template_id AND t.user_id = auth.uid()));
CREATE POLICY "Anon read items" ON public.checklist_items FOR SELECT TO anon USING (true);

-- Clients
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  template_id UUID REFERENCES public.checklist_templates(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner full access" ON public.clients FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anon read clients" ON public.clients FOR SELECT TO anon USING (true);

-- Client responses
CREATE TABLE public.client_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.checklist_items(id) ON DELETE CASCADE,
  value TEXT,
  file_url TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, item_id)
);
ALTER TABLE public.client_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner read responses" ON public.client_responses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.user_id = auth.uid()));
CREATE POLICY "Anon manage responses" ON public.client_responses FOR ALL TO anon USING (true) WITH CHECK (true);

-- Triggers
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_responses_updated_at BEFORE UPDATE ON public.client_responses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for client file uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('client-uploads', 'client-uploads', true);
CREATE POLICY "Anon can upload files" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'client-uploads');
CREATE POLICY "Anyone can read files" ON storage.objects FOR SELECT USING (bucket_id = 'client-uploads');
CREATE POLICY "Auth can manage files" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'client-uploads') WITH CHECK (bucket_id = 'client-uploads');
