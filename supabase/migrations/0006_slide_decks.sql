-- 0006_slide_decks.sql
-- Tracks PowerPoint decks generated from saved notes.
-- Each row corresponds to one .pptx file in the slide-decks Storage bucket.

CREATE TABLE IF NOT EXISTS public.slide_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  deck_plan JSONB NOT NULL,
  storage_path TEXT NOT NULL,
  slide_count INTEGER NOT NULL,
  file_size_bytes INTEGER,
  generation_model TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_slide_decks_note_id ON public.slide_decks(note_id);
CREATE INDEX IF NOT EXISTS idx_slide_decks_generated_at ON public.slide_decks(generated_at DESC);

ALTER TABLE public.slide_decks ENABLE ROW LEVEL SECURITY;
-- No public policies; service-role-only access for now (matches notes table).
