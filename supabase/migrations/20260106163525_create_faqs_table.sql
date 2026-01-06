-- FAQ table for common questions

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE TABLE public.faqs (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_faqs_is_published ON public.faqs(is_published);
CREATE INDEX idx_faqs_sort_order ON public.faqs(sort_order);
CREATE INDEX idx_faqs_question_trgm ON public.faqs USING GIN (question gin_trgm_ops);

-- RLS
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published faqs"
  ON public.faqs
  FOR SELECT
  USING (is_published = TRUE);

CREATE POLICY "Admins can view all faqs"
  ON public.faqs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert faqs"
  ON public.faqs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update faqs"
  ON public.faqs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete faqs"
  ON public.faqs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Triggers
CREATE OR REPLACE FUNCTION public.set_faqs_updated_fields()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_faqs_updated_fields
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_faqs_updated_fields();

-- Comments
COMMENT ON TABLE public.faqs IS 'Frequently asked questions displayed in the Inquiries FAQ tab';
COMMENT ON COLUMN public.faqs.question IS 'FAQ question text (searchable)';
COMMENT ON COLUMN public.faqs.answer IS 'FAQ answer text';
COMMENT ON COLUMN public.faqs.category IS 'Optional grouping/category';
COMMENT ON COLUMN public.faqs.tags IS 'Optional tags for filtering/search';
COMMENT ON COLUMN public.faqs.sort_order IS 'Lower comes first';
COMMENT ON COLUMN public.faqs.is_published IS 'Whether this FAQ is visible to the public';
