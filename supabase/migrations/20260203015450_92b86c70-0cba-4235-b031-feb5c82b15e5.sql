-- Create function to update timestamps (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create family groups table
CREATE TABLE public.family_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE DEFAULT substring(md5(random()::text) from 1 for 8),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create family members table
CREATE TABLE public.family_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (family_group_id, user_id)
);

-- Create family updates table for sharing notes/updates
CREATE TABLE public.family_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  update_type TEXT NOT NULL DEFAULT 'general' CHECK (update_type IN ('general', 'expense', 'care', 'medical', 'urgent')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create shared expenses table (for expenses shared with family)
CREATE TABLE public.shared_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  family_group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (expense_id, family_group_id)
);

-- Enable RLS on all tables
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_expenses ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is in a family group
CREATE OR REPLACE FUNCTION public.is_family_member(_user_id UUID, _family_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_members
    WHERE user_id = _user_id
      AND family_group_id = _family_group_id
  )
$$;

-- Helper function to get user's family role
CREATE OR REPLACE FUNCTION public.get_family_role(_user_id UUID, _family_group_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.family_members
  WHERE user_id = _user_id
    AND family_group_id = _family_group_id
$$;

-- RLS Policies for family_groups
CREATE POLICY "Users can view their family groups"
ON public.family_groups
FOR SELECT
USING (public.is_family_member(auth.uid(), id) OR created_by = auth.uid());

CREATE POLICY "Users can create family groups"
ON public.family_groups
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners can update their family groups"
ON public.family_groups
FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Owners can delete their family groups"
ON public.family_groups
FOR DELETE
USING (created_by = auth.uid());

-- RLS Policies for family_members
CREATE POLICY "Family members can view members"
ON public.family_members
FOR SELECT
USING (public.is_family_member(auth.uid(), family_group_id) OR user_id = auth.uid());

CREATE POLICY "Users can join family groups"
ON public.family_members
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update members"
ON public.family_members
FOR UPDATE
USING (public.get_family_role(auth.uid(), family_group_id) IN ('owner', 'admin'));

CREATE POLICY "Users can leave or admins can remove"
ON public.family_members
FOR DELETE
USING (user_id = auth.uid() OR public.get_family_role(auth.uid(), family_group_id) IN ('owner', 'admin'));

-- RLS Policies for family_updates
CREATE POLICY "Family members can view updates"
ON public.family_updates
FOR SELECT
USING (public.is_family_member(auth.uid(), family_group_id));

CREATE POLICY "Family members can create updates"
ON public.family_updates
FOR INSERT
WITH CHECK (public.is_family_member(auth.uid(), family_group_id) AND auth.uid() = user_id);

CREATE POLICY "Authors can update their updates"
ON public.family_updates
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Authors or admins can delete updates"
ON public.family_updates
FOR DELETE
USING (user_id = auth.uid() OR public.get_family_role(auth.uid(), family_group_id) IN ('owner', 'admin'));

-- RLS Policies for shared_expenses
CREATE POLICY "Family members can view shared expenses"
ON public.shared_expenses
FOR SELECT
USING (public.is_family_member(auth.uid(), family_group_id));

CREATE POLICY "Members can share their expenses"
ON public.shared_expenses
FOR INSERT
WITH CHECK (public.is_family_member(auth.uid(), family_group_id) AND auth.uid() = shared_by);

CREATE POLICY "Sharers can unshare their expenses"
ON public.shared_expenses
FOR DELETE
USING (shared_by = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_family_groups_updated_at
BEFORE UPDATE ON public.family_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_family_updates_updated_at
BEFORE UPDATE ON public.family_updates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();