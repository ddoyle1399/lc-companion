-- Persist which poems the user selected when generating a sample answer.
-- Narrows the quote bank used and makes regeneration reproducible.

ALTER TABLE public.sample_answers
ADD COLUMN selected_poems jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.sample_answers.selected_poems IS
'Array of poem sub_key strings the user asked the generator to include. Narrows the quote bank used for generation and validation.';
