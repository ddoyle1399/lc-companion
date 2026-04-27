# Single Text Notes Generator — Redesign Proposal

## Context

Current state: `/single-text` produces a single generic note per text. Useless for serious students. Needs to become a comprehensive on-demand study guide that covers every angle a student would ever need for an HL or OL exam answer.

This is a different product from `/generate` (which produces sample answers). `/single-text` produces source material — the notes a student would consult while writing an answer.

---

## Question Genre Taxonomy (HL Single Text)

Based on Macbeth corpus 1953–2023 and Othello corpus 1990–2022 (sampled from the 1995–2025 archive). Frequency is approximate and assumes the same text rotates in every 6–8 years.

### 1. Character Study (Single)
**Frequency**: every paper for the rotating text
**Pattern**: a quoted statement asserting one trait or flaw, followed by "discuss".

Verbatim examples:
- *"Macbeth's unstable and tragic identity is shaped by a variety of ambiguities and complexities in his character."* (2023 Macbeth)
- *"The Witches in Macbeth are malevolent creatures who originate deeds of blood and have power over the soul."* (1983 Macbeth)
- *"Lady Macbeth is no monster. She is a loyal (though misguided) wife, not without tenderness and not without conscience."* (1979 Macbeth)
- *"Othello is essentially a noble character, flawed by insecurity and a nature that is naive and unsophisticated."* (1990 Othello)

### 2. Character Relationships
**Frequency**: every 2-3 papers
**Pattern**: pivots on a paired dynamic.

Verbatim:
- *"Various aspects of the relationship between Iago and Emilia in Shakespeare's play, Othello, are both fascinating and disturbing."* (2022 Othello)
- *"Macbeth's relationships with other characters can be seen primarily as power struggles which prove crucial to the outcome of the play."* (2014)
- *"The relationship between Macbeth and Lady Macbeth undergoes significant change during the course of the play."* (2007)
- *"Their partnership in guilt, which, at the beginning of the play, is a strong bond between them, gradually drives Macbeth and his wife apart..."* (1979)

### 3. Theme Analysis
**Frequency**: every paper, often in disguise as character or atmosphere
**Pattern**: asserts a theme is central, asks for discussion.

Verbatim:
- *"Essentially the play Macbeth is about power, its use and abuse."* (2007 — Power)
- *"Kingship, with all its potential for good or evil, is a major theme in the play, Macbeth."* (1995 — Kingship)
- *"The eternal struggle between good and evil... is the central theme of the play Macbeth."* (1991 — Good vs Evil)
- *"Shakespeare's Macbeth invites us to look into the world of a man driven on by ruthless ambition and tortured by regret."* (2004 — Ambition)
- *"In Macbeth, Shakespeare presents us with a powerful vision of evil."* (2003 — Evil)

Common themes per text:
- **Macbeth**: Ambition, Kingship, Appearance vs Reality, Good vs Evil, Guilt, Supernatural, Gender, Fate vs Free Will
- **Othello**: Jealousy, Race/Otherness, Manipulation, Reputation, Honour, Marriage, Appearance vs Reality, Trust

### 4. Dramatic Technique
**Frequency**: every 2–3 papers
**Pattern**: focuses on craft — how Shakespeare achieves dramatic impact.

Verbatim:
- *"Shakespeare makes effective use of Lady Macbeth and the Witches to heighten the dramatic impact of his play Macbeth in a variety of ways."* (2023)
- *"Throughout the play, Macbeth, Shakespeare makes effective use of a variety of dramatic techniques that evoke a wide range of responses from the audience."* (2014)
- *"Macbeth has all the ingredients of compelling drama."* (2009)
- *"The play, Macbeth, has many scenes of compelling drama."* (2004)

Sub-categories: soliloquy, dramatic irony, staging, juxtaposition, suspense, comic relief.

### 5. Imagery, Language, Style
**Frequency**: every 4-5 papers
**Pattern**: focuses on the texture of language.

Verbatim:
- *"Shakespeare makes effective use of disturbing imagery in the play, Macbeth."* (2013)
- *"Discuss how language in Macbeth contributes to creating an atmosphere of evil and violence."* (1987)
- *"Discuss how light/darkness, violent imagery, and unnatural happenings create atmosphere in Macbeth."* (1983)
- *"In Macbeth, the inner self is conveyed... by means of an elaborate pattern of imagery and symbolism."* (1975)

### 6. Audience Response / Sympathy
**Frequency**: every 4-5 papers
**Pattern**: asks about the response the play evokes.

Verbatim:
- *"We feel very little pity for the central characters of Macbeth and Lady Macbeth."* (2003)
- *"Shakespeare does not present Macbeth as a mere villain, but succeeds in arousing a measure of sympathy for him."* (1975)
- *"Othello's foolishness, rather than Iago's cleverness, leads to the tragedy of Shakespeare's Othello."* (2008 Othello)

### 7. Plot Structure / Consequences
**Frequency**: occasional
**Pattern**: focuses on cause and effect across the play.

Verbatim:
- *"Macbeth's murder of Duncan has horrible consequences both for Macbeth himself and for Scotland."* (2009)
- *"Discuss the course and nature of the resistance to Macbeth's rule in the play."* (1995)

### 8. Cultural Context / Outsider Status
**Frequency**: rare for Macbeth, more common for Othello
**Pattern**: pivots on social/cultural placement.

Verbatim:
- *"Discuss the reasons why our knowledge of Othello's status as an outsider enables us to better understand various aspects of Shakespeare's play, Othello."* (2022 Othello)

### 9. Tragedy / Genre Convention
**Frequency**: every 5+ papers
**Pattern**: invokes tragic-form expectations.

Verbatim:
- *"Macbeth's unstable and tragic identity..."* (frames the play as tragedy, 2023)
- *"Why Shakespeare's use of horrific, bizarre and unbelievable elements does or does not heighten the tragic intensity of the play."*

---

## OL-Specific Question Patterns

OL Single Text questions are **structurally different** from HL — multiple sub-questions per text rather than one essay.

Standard OL pattern (from 2024 OL Paper 2):
1. **(a) + (b) + (c) — paired "lesson + reflection + title"** — three 10-mark parts
   - "What do you think is the most important lesson that can be learned..."
   - "Describe one action taken by a character... explain why you did or did not agree..."
   - "Do you think that [Title] is a good title for [Author]'s [text]?"
2. **Object/symbol identification** — one 30-mark
   - "Identify three objects, featured or referred to, in [text]... explain how each helped you understand a key aspect..."
3. **"Talk to your class about [aspect]"** — bullet-point structure, one 30-mark
   - "Describe two moments..."
   - "Explain why..."
   - "Explain what your overall feelings were..."
4. **Creative response** — character diary, monologue, letter — one 30-mark
   - "Imagine you are a character... write three diary entries..."

OL note style: simpler vocabulary, second-person guidance, concrete examples, less analytical sophistication, more "what could a student SAY about this".

---

## Proposed Notes Generator Architecture

### Note types (each with its own prompt and structured output)

Per text, the generator produces these on demand:

1. **Character Profile** — single character deep dive
   - Inputs: text, character, level
   - Output: ~1500 words HL / ~800 OL covering: introduction (who they are), trajectory across acts, key relationships, role in tragedy, defining quotes (8-12 with context), 3 exam questions this material answers

2. **Theme Study** — single theme deep dive
   - Inputs: text, theme, level
   - Output: ~1500 words covering: theme statement, where it appears across the play, characters who embody/oppose it, key quotes (8-12), connection to other themes, 3 exam questions this answers

3. **Relationship Study** — paired dynamic
   - Inputs: text, character A, character B, level
   - Output: ~1200 words covering: nature of the bond, how it changes, key scenes (4-6), key quotes from each character about the other, role in plot, 3 exam questions

4. **Scene Analysis** — pivotal moment deep dive
   - Inputs: text, scene reference (e.g. "Act 2 Scene 2 — after Duncan's murder"), level
   - Output: ~1000 words covering: setup, action beats, what's revealed about character/theme, dramatic technique used, key quotes, why this scene matters

5. **Plot Summary** — full-play overview
   - Inputs: text, level
   - Output: ~2000 words act-by-act, with key turning points highlighted

6. **Quote Bank by Theme** — curated quote collection
   - Inputs: text, theme, level
   - Output: 15-25 quotes organised by sub-theme, each with speaker, scene reference, and 1-2 sentences of analytical use

7. **Quote Bank by Character** — same structure, character-driven
8. **Quote Bank by Act/Scene** — chronological
9. **Dramatic Technique Note** — soliloquy / dramatic irony / staging
10. **Critical Interpretation** — multiple readings of an ambiguous element (e.g. "Was Lady Macbeth's collapse psychological or supernatural?")
11. **Exam Question Walkthrough** — given a past question, breaks down the question, lists relevant quotes, suggests structure

### Per-text "askable" subjects (catalogue)

For each text, the system needs a curated catalogue of what can be asked. Without this the user faces an empty box. Macbeth example:

**Characters** (Macbeth-specific):
- Macbeth, Lady Macbeth, Banquo, Duncan, Macduff, Lady Macduff, Malcolm, the Witches (as group), Porter (comic relief), Ross

**Themes**:
- Ambition, Kingship, Appearance vs Reality, Good vs Evil, Guilt, Supernatural, Gender (masculinity, motherhood), Fate vs Free Will, Loyalty/Betrayal, Sleep and Conscience, Blood/Violence

**Relationships**:
- Macbeth & Lady Macbeth, Macbeth & Banquo, Macbeth & the Witches, Macbeth & Duncan, Macduff & Macbeth, Lady Macbeth & gender expectations

**Pivotal scenes**:
- 1.1 Witches' opening, 1.5 Lady Macbeth's "unsex me", 1.7 "If it were done", 2.2 After the murder, 3.4 Banquet/ghost, 4.1 Cauldron prophecies, 5.1 Sleepwalking, 5.5 "Tomorrow" soliloquy, 5.8 Final fight

**Dramatic techniques**:
- Soliloquy, dramatic irony, supernatural staging, blood/dark imagery, doubling, comic relief, nature disorder

This catalogue makes the UI non-blank: user clicks a category, sees options, picks one, hits Generate.

### UI proposal

```
/single-text

Header: "Single Text Notes"
Subheader: "Generate study notes for any aspect of your prescribed single text"

Step 1 — Text selector (cards): Macbeth · Othello · Hamlet · Hamnet · etc
Step 2 — Level: HL / OL toggle
Step 3 — Note type (cards):
  ┌─────────────┬─────────────┬─────────────┐
  │ Character   │ Theme       │ Relationship│
  ├─────────────┼─────────────┼─────────────┤
  │ Scene       │ Plot summary│ Quote bank  │
  ├─────────────┼─────────────┼─────────────┤
  │ Dramatic    │ Critical    │ Past Q      │
  │ technique   │ reading     │ walkthrough │
  └─────────────┴─────────────┴─────────────┘

Step 4 — Subject (depends on note type)
  e.g. for Character: dropdown of characters in selected text
  e.g. for Theme: dropdown of themes in selected text
  e.g. for Past Q walkthrough: dropdown of seeded past questions

Step 5 — Depth: Quick (1pg) · Standard (3pg) · Deep dive (5pg)
Step 6 — Optional instructions textarea

[ Generate Note ]
```

Output panel below: structured note with copy button, save-to-library button, delete.

### Library

A `/single-text/library` page listing all generated notes per text, filterable. Click to view, copy, edit, delete.

---

## Source-of-truth requirements

For each text, the system needs:

1. **Verified quote bank** (already exists for Macbeth + Othello — 88 + 97 quotes)
2. **Character catalogue** — list of named characters with stage roles
3. **Scene index** — every scene with one-sentence summary
4. **Theme catalogue** — curated list of themes the play actually treats (not generic Shakespeare themes)
5. **Past questions** — already seeded for Macbeth (4) and Othello (4); could expand to ~20 per text from the historical corpus above

---

## Build sequencing

### Phase 1 — Foundation (1 day)

1. New schema: `single_text_assets` table with columns `text_key`, `asset_type` (character/theme/relationship/scene), `subject` (e.g. "Lady Macbeth", "Ambition"), `display_name`, `meta jsonb`. Seed for Macbeth + Othello.
2. New schema: `text_notes` table for generated notes (similar to `sample_answers` but with `note_type`, `subject`, `depth` fields).
3. New UI: replace `/single-text` with the stepped flow above. Reads the asset catalogue from Supabase.

### Phase 2 — Per-note prompts (2-3 days)

One prompt template per note type, parameterised by text + subject + level + depth. Each template:
- Uses the existing verified quote bank
- Outputs structured Markdown
- Has separate HL and OL voice variants
- Embeds 8-12 quotes with attribution and context
- Closes with "How this could come up in the exam" — 2-3 past question patterns this material answers

Order to build prompts:
1. Character Profile (highest demand)
2. Theme Study (next highest)
3. Quote Bank by Theme (force-multiplier — feeds other types)
4. Relationship Study
5. Scene Analysis
6. Plot Summary
7. Past Q Walkthrough
8. Dramatic Technique
9. Critical Reading

### Phase 3 — Library + organisation (1 day)

- Generations save to `text_notes`
- `/single-text/library` lists notes per text
- Bulk export option — pick 5 notes, export as combined Markdown/PDF

### Phase 4 — OL extension (1 day)

OL prompts use the simpler vocabulary rules from CLAUDE.md, structured for the (a)+(b)+(c) sub-question format where appropriate. Most note types reuse the HL structure but with OL voice.

### Phase 5 — Expand text coverage (ongoing)

Once architecture is stable, add Hamlet, Hamnet, A Doll's House, etc. — each text needs its own quote bank + asset catalogue + the same prompts work.

---

## Honest scope reality

The current `/single-text` page is a stub. This redesign turns it into the largest feature in the app — bigger than the sample answer generator. Realistic timeline: 5-7 working days for Macbeth + Othello at production quality. Each additional text adds 1-2 days for bank + catalogue.

What this builds toward: a student studying Macbeth has a generated comprehensive guide covering every angle. The teacher generates everything once, students consume. Or students self-serve by topic.

This is the right product. It's also a substantial commitment. Worth being clear about that before starting.

---

## Recommended next steps

1. **Validate the question taxonomy with a teacher.** Nine genres is what the corpus shows, but a working LC English teacher will know if I'm missing a category or splitting hairs.
2. **Decide on Phase 1 scope.** The schema + UI + asset catalogue alone is a meaningful product even before any new prompts exist — it makes the existing single-note generation pickable by category.
3. **Pick the first note type to implement well.** Character Profile is highest-leverage. Building one note type end-to-end at production quality teaches you what the others will need.

Sources used in compiling this taxonomy: SEC past papers 2010-2024 (already in repo), `webofnotes.wordpress.com/2014/04/14/macbeth-past-and-sample-exam-questions/` (1953-2014 corpus), `studyclix.ie/leaving-certificate/english/higher/macbeth`, `betterexams.ie/leaving-cert/english`.
