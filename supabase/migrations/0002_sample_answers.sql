-- Phase 5: Sample Answer Generation
-- Run manually in the Supabase SQL editor.
-- Verify after: select count(*) from sample_answers; → 0

-- past_question_pclm: SEC marking scheme data per question
create table if not exists past_question_pclm (
  question_id uuid primary key references past_questions(id) on delete cascade,
  source_year int not null,
  examiner_expectation text not null,
  pclm_template jsonb not null,
  indicative_material jsonb not null,
  code text
);

alter table past_question_pclm enable row level security;

-- sample_answers: generated exam answers at a grade tier
create table if not exists sample_answers (
  id uuid primary key default gen_random_uuid(),
  outline_id uuid not null references question_outlines(id) on delete cascade,
  question_id uuid not null references past_questions(id) on delete cascade,
  note_id uuid not null references notes(id) on delete cascade,
  grade_tier text not null check (grade_tier in ('H1','H2','H3','H4','H5','H6','H7')),
  question_type text not null check (question_type in (
    'poetry','single_text','comparative','composition','comprehension','unseen_poetry'
  )),
  mark_cap int not null,
  marking_mode text not null check (marking_mode in ('discrete','combined')),
  pclm_target jsonb not null,
  answer_text text not null,
  word_count int not null,
  quotes_used jsonb not null,
  validator_result jsonb not null,
  generation_model text not null,
  generated_at timestamptz default now(),
  approved boolean default false,
  reviewer_notes text,
  -- SEC primacy rule: C and L cannot exceed P
  constraint pclm_primacy check (
    (pclm_target->>'C')::int <= (pclm_target->>'P')::int
    and (pclm_target->>'L')::int <= (pclm_target->>'P')::int
  )
);

create index if not exists sample_answers_outline on sample_answers (outline_id);
create index if not exists sample_answers_question on sample_answers (question_id);
create index if not exists sample_answers_approved on sample_answers (approved);

alter table sample_answers enable row level security;

-- Seed: 2019 Kavanagh question PCLM
-- Run after creating the table. Replace <question_id> with the actual UUID from:
--   select id from past_questions where subject_key = 'kavanagh' and exam_year = 2019;
--
-- insert into past_question_pclm (question_id, source_year, examiner_expectation, pclm_template, indicative_material, code)
-- values (
--   '<question_id>',
--   2019,
--   '<verbatim examiner expectation paragraph from SEC 2019 marking scheme>',
--   '{
--     "P": ["Engages with question", "Develops a clear argument about the poetry", "Supports argument with reference to poems"],
--     "C": ["Demonstrates understanding of poetic techniques", "Explores themes in depth", "Shows insight into the poets concerns"],
--     "L": ["Clear, fluent expression", "Appropriate register", "Varied sentence structure"],
--     "M": ["Accurate spelling, grammar, punctuation"]
--   }'::jsonb,
--   '["...", "..."]'::jsonb,
--   'KE'
-- );
