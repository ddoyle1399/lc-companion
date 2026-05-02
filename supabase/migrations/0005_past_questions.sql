-- past_questions: creates table if it doesn't exist yet.
-- No unique constraint is added because existing seeded data already has
-- duplicate (subject_key, exam_year, paper, level) combinations.
-- Deduplication is handled in the seed script instead.

create table if not exists past_questions (
  id           uuid primary key default gen_random_uuid(),
  subject_key  text        not null,
  exam_year    int         not null,
  paper        int         not null default 2,
  level        text        not null check (level in ('higher', 'ordinary')),
  section      text        not null default 'poetry',
  question_text text       not null,
  source       text        not null default 'examinations.ie',
  created_at   timestamptz not null default now()
);

create index if not exists past_questions_subject_key_idx
  on past_questions (subject_key);

create index if not exists past_questions_exam_year_idx
  on past_questions (exam_year desc);
