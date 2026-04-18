# OL Grade-Tier Behavioural Profiles

**Created:** 18 April 2026
**Owner:** Diarmuid
**Status:** First pass. Behavioural profiles inferred from SEC OL marking schemes 2020-2025 plus Aoife O'Driscoll OL anchor PDFs and the EducatePlus OL Solutions workbook. No graded OL student scripts have been observed. Where a profile is inferred rather than observed, it is labelled inferred.
**Depends on:** PCLM-MARKING-SCHEME.md, GRADE-PROFILES.md, SAMPLE-ANSWER-GENERATION-PLAN.md, PHASE-5-SAMPLE-ANSWER-SPEC.md
**Source material captured locally:**
- /sessions/gifted-youthful-edison/mnt/lcenglishhub/sec-marking-schemes/sec_2020_english_ol.txt through sec_2025_english_ol.txt
- /sessions/gifted-youthful-edison/mnt/lcenglishhub/ol-anchors/ (13 Aoife OL PDFs, Scoilnet 2018 sample, EducatePlus OL Solutions workbook)

---

## Honest caveat before anything else

We have zero observed OL student scripts with PCLM marks attached. The HL calibration in GRADE-PROFILES.md is built on 31 real essays. This document is built on marking scheme indicative material, Aoife's teacher-written sample answers (which are not the same thing as graded scripts), and the EducatePlus worked solutions (which are examiner-facing "indicative" answers, also not graded scripts).

Consequence: this document is directionally correct for calibrating a generator, but the O1/O4/O6 tier boundaries here should be treated as provisional until Diarmuid pulls at least two real OL scripts per section from last year's cohort and marks them back against this file. That is a gap to close post-24-April, not a blocker for shipping the pipeline.

---

## What PCLM does at OL (short version)

Identical framework. Identical weightings. Identical grade grid. Identical primacy rule.

Read PCLM-MARKING-SCHEME.md first. Everything there applies verbatim at OL. The 2025 SEC OL marking scheme prints Appendix 1 (dimensions) and Appendix 2 (grade grid) with the same wording as the HL scheme. There is no separate OL PCLM framework.

What changes at OL is not the marking framework. It is three things downstream of the framework:

1. The tasks set. Simpler question wording, simpler rubrics, more scaffolded prompts ("write a talk to your class", "identify two emotions").
2. The mark caps. OL uses Combined Criteria for the vast majority of questions. Discrete Criteria only applies where the question is worth 40 marks or more. See "OL Exam Structure" below.
3. The Indicative material. SEC indicative bullets for OL are noticeably broader ("Allow for a broad definition of central character", "Allow for a broad interpretation of..."). The examiner is instructed to reward more generously.

The grade grid itself is the same. An O1 at 100 marks is 30-27/24/24/9, the same numerical target as an H1. The difference is what quality of writing lands at those marks on an OL task. An O1 answer to "write a talk for your Parents' Council" is not the same prose as an H1 answer to "evaluate the treatment of female identity in the poetry of Paula Meehan". Both sit at the top PCLM band. Both look sophisticated against their own task difficulty. Neither could be swapped for the other.

---

## OL Exam Structure (what the generator must know per question)

Source: SEC 2025 OL marking scheme. Confirmed structurally stable across 2020-2025.

### Paper 1 (200 marks, 2 hours 50 minutes)

**Section I - Comprehending (100 marks)**
- Question A on ONE text (1, 2, or 3): 50 marks, typically 3 sub-parts (usually 15 + 15 + 20)
- Question B on a DIFFERENT text: 50 marks, single composition-style task (letter, blog, article, diary, talk)
- Candidate must use different text for A and B

**Section II - Composing (100 marks)**
- Choose 1 of 7 composition options
- Single 100-mark composition
- Uses Discrete Criteria: P=30, C=30, L=30, M=10
- Genres observed across 2020-2025: personal essay, short story, magazine article, talk, speech, diary, letter. Each year's paper offers two personal essays, two short stories, plus one each of article, talk, speech (roughly).

### Paper 2 (200 marks, 3 hours 20 minutes)

**Section I - Single Text (60 marks)**
- Choose ONE prescribed text
- Answer 2 of 4 questions on that text, each worth 30 marks
- Each 30-mark question typically splits into 3 sub-parts of 10 marks (Combined)
- Can also be structured as 10 + 10 + 10 OR 10 + 20 depending on the year

**Section II - Comparative Study (70 marks)**
- Choose ONE question from Theme, Social Setting, or Relationships (A / B / C)
- Structure: Part (a)(i) 15 marks Combined + Part (a)(ii) 15 marks Combined + Part (b) 40 marks Discrete
- Part (a) pair quotes two different texts on the same theme/setting/relationship element
- Part (b) is the long comparative with explicit similarity/difference analysis
- Cannot reuse the Single Text text. Can reference only one film across the answer.

**Section III - Poetry (70 marks)**
- Unseen Poem: 20 marks total (2 sub-questions worth 10 marks each, both Combined)
- Prescribed Poem: 50 marks total (Part 1(a) 15 Combined + Part 1(b) 15 Combined + Part 2(i/ii/iii) 20 Combined), choose one of 6 prescribed poems

### Mark caps and marking mode summary

| Question | Mark cap | Mode | PCLM shape |
|---|---|---|---|
| Paper 1 Comp Q A sub-part | 15 or 20 | Combined | P+C / L+M |
| Paper 1 Comp Q B | 50 | Discrete | P / C / L / M |
| Paper 1 Composition | 100 | Discrete | P / C / L / M |
| Paper 2 Single Text sub-part | 10 | Combined | P+C / L+M |
| Paper 2 Comparative (a)(i) / (a)(ii) | 15 each | Combined | P+C / L+M |
| Paper 2 Comparative (b) | 40 | Discrete | P / C / L / M |
| Paper 2 Unseen Poem sub-part | 10 each | Combined | P+C / L+M |
| Paper 2 Prescribed Poem Part 1(a), 1(b) | 15 each | Combined | P+C / L+M |
| Paper 2 Prescribed Poem Part 2 | 20 | Combined | P+C / L+M |

**Key implication for the generator**: most OL items are short Combined Criteria responses, not long essays. The pipeline currently built for HL Poetry (single 50-mark Discrete essay) is the exception at OL, not the norm. The generator must handle two distinct output shapes:
- Combined Criteria response: one focused paragraph to half a page, P+C and L+M as paired targets
- Discrete Criteria response: multi-paragraph essay, all four PCLM dimensions independent

---

## Combined Criteria grade bands (from SEC 2025 OL Appendix 2, verbatim)

For prompt targeting, Combined means the examiner gives a single global mark split into P+C (60% of the mark cap) and L+M (40% of the mark cap). The generator must target those paired values, not four separate dimensions.

### 20-mark question (Combined)

| Grade | 01 | 02 | 03 | 04 | 05 | 06 | 07 | 08 |
|---|---|---|---|---|---|---|---|---|
| Total | 20-18 | 16 | 14 | 12 | 10 | 8 | 6 | 5-0 |
| P+C (12) | 12-11 | 10 | 9 | 8 | 6 | 5 | 4 | 3-0 |
| L+M (8) | 8 | 7 | 6 | 5 | 4 | 3 | 3 | 2-0 |

### 15-mark question (Combined)

| Grade | 01 | 02 | 03 | 04 | 05 | 06 | 07 | 08 |
|---|---|---|---|---|---|---|---|---|
| Total | 15-14 | 12 | 11 | 9 | 8 | 6 | 5 | 4-0 |
| P+C (9) | 9 | 8 | 7 | 6 | 5 | 4 | 3 | 2-0 |
| L+M (6) | 6 | 5 | 4 | 4 | 3 | 2 | 2 | 1-0 |

### 10-mark question (Combined)

| Grade | 01 | 02 | 03 | 04 | 05 | 06 | 07 | 08 |
|---|---|---|---|---|---|---|---|---|
| Total | 10-9 | 8 | 7 | 6 | 5 | 4 | 3 | 2-0 |
| P+C (6) | 6 | 5 | 4 | 4 | 3 | 2 | 2 | 1-0 |
| L+M (4) | 4 | 3 | 3 | 2 | 2 | 1 | 1 | 1-0 |

### Discrete grade bands (100, 70, 60, 50, 40)

These mirror HL. See PCLM-MARKING-SCHEME.md Appendix 2 for the full grids. OL Paper 1 Composition, Paper 1 Comp Q B, and Paper 2 Comparative Part (b) are the Discrete questions.

---

## Inferring the OL grade descriptors

Since the grade grid is shared between levels, the grade descriptor at OL is not in the numbers. It is in what "Clarity of Purpose at the O1 band" looks like when the purpose is "write a talk for your school Parents' Council" vs "analyse Kavanagh's treatment of the spiritual in Advent". The descriptor that distinguishes an O1 from an O4 has to be inferred from the Indicative material, the examiner expectation paragraphs, and the observable register of marking scheme-style answers (Aoife, EducatePlus).

Pattern observed across SEC OL 2020-2025 Indicative material:

- SEC OL consistently uses the phrase "Allow for a broad interpretation of...". The HL scheme uses tighter phrases ("Candidates should critically evaluate...", "Expect a nuanced reading of...").
- SEC OL frequently ends Indicative bullets with "Etc." signalling non-exhaustive acceptability. This is present in HL too but more heavily used at OL.
- SEC OL consistently instructs examiners to "Reward focus, development, support, clarity and accuracy". This phrase is the OL descriptor shorthand. Every Combined Criteria question carries it.
- HL indicative material rewards insight and critical distance. OL indicative material rewards visible engagement with the task, clear support, and coherent response shape. The difference is not intelligence, it is interpretive demand.

That lets us pin behavioural descriptors per tier.

---

## O1 profile (inferred from SEC language plus Aoife anchors)

**What O1 looks like across all OL genres:**

- Answers the exact question asked, not an adjacent question. SEC OL examiners repeatedly instruct "Reward focus". O1 focus is total.
- Concrete specificity from the text. Not summary. Specific line, specific moment, specific quote.
- Supports every assertion with a reference. SEC says "Support your answer with reference". O1 does this every time.
- Clear topic sentences opening each paragraph or sub-response. Each paragraph has one job.
- Appropriate register for the genre. A talk sounds like a talk (direct address, rhetorical questions, hook, call to action). A personal essay sounds like a personal essay (first person, reflective, anecdote). A comparative paragraph explicitly uses comparative language ("similarly", "in contrast", "both texts").
- Varied sentence length. Not sophisticated in an HL sense, but not monotone.
- Correct UK spelling throughout. Accurate grammar. M marks sit at or near the ceiling.
- In Combined Criteria short responses: one well-chosen quote or moment, one reason, one evaluation. Three sentences can score O1 at 10 marks if they do the job.

**Anti-patterns for O1:**

- Repetition of the question stem without answering it.
- Retelling plot instead of engaging with the specific angle the question asks about.
- Using vague abstractions ("the writer uses language well").
- Dropping in quotes without a reason to quote them.
- Exceeding the appropriate length. O1 on a 10-mark question does not need a page.

**PCLM targets at O1:**
- 100 marks (Discrete): P=28, C=27, L=27, M=9
- 40 marks (Discrete): P=12, C=11, L=11, M=4
- 50 marks (Discrete): P=15, C=14, L=14, M=5
- 20 marks (Combined): P+C=12, L+M=8
- 15 marks (Combined): P+C=9, L+M=6
- 10 marks (Combined): P+C=6, L+M=4

---

## O4 profile (inferred, the middle of the OL cohort)

**What O4 looks like:**

- Answers the question correctly but not deeply. Understands what is being asked. Misses the sharpest angle.
- Uses quotes or textual reference but integration is mechanical. "For example..." or "In the text..." are the typical lead-ins. Not wrong. Not polished.
- Paragraph structure present but transitions formulaic. "Another reason is..." and "Also..." dominate.
- Register mostly appropriate for the genre but slips at the edges. A speech may drift into essay register by the third paragraph.
- Sentence length uniform. Medium sentences throughout. Few short punchy ones. Few long developed ones.
- Some correctness slips in mechanics. One or two spelling errors per 100 words. Occasional comma splice. M marks hold up because OL mechanics expectation is moderate.
- In Combined Criteria responses: the answer is present but thin. One vague reason where O1 gives two specific reasons.

**Anti-patterns for O4:**

- Being actively wrong about the text. O4 is not wrong. It is shallow and safe.
- Perfect polish. That is O1 work.
- Writing the same amount as O1. O4 typically under-develops, not over-develops.
- Missing the question entirely. That is O6 work.

**PCLM targets at O4:**
- 100 marks (Discrete): P=18, C=18, L=18, M=6
- 40 marks (Discrete): P=8, C=8, L=8, M=2
- 50 marks (Discrete): P=9, C=9, L=9, M=3
- 20 marks (Combined): P+C=8, L+M=5
- 15 marks (Combined): P+C=6, L+M=4
- 10 marks (Combined): P+C=4, L+M=2

---

## O6 profile (inferred, bottom-of-pass tier)

OL has a pass mark at O6 (40-49). This tier matters because it is where most genuinely struggling OL candidates cluster. An O7 or O8 answer is either empty or mis-addressing the question. An O6 answer shows visible engagement but weak execution.

**What O6 looks like:**

- Understands the task at surface level. Attempts the question.
- Reference to text is generic or retells plot without selecting a specific moment. "The play is about a man who becomes king and then goes mad."
- Paragraphs run on without structure. Ideas repeat across the response.
- Register drift is noticeable. A personal essay may slide into narrative without reflection. A talk may forget to address the audience.
- Sentence control wobbles. Fragments. Run-ons. Misused commas. Tense shifts.
- Mechanics is where O6 leaks most marks at OL. Spelling errors per 100 words are noticeable. Common word confusions (their/there, its/it's, effect/affect) appear.
- Combined Criteria short responses are under-developed to the point of being under-length. A 10-mark response may be a single sentence.

**Anti-patterns for O6:**

- Writing O4 prose then flagging it as O6. If the response is well-organised and accurate, it is not O6.
- Making errors that a native OL speaker would not make (concept errors about which character did what). That reads as misreading, not weak writing.

**PCLM targets at O6:**
- 100 marks (Discrete): P=12, C=12, L=12, M=4
- 40 marks (Discrete): P=5, C=5, L=5, M=1
- 50 marks (Discrete): P=6, C=6, L=6, M=2
- 20 marks (Combined): P+C=5, L+M=3
- 15 marks (Combined): P+C=4, L+M=2
- 10 marks (Combined): P+C=2, L+M=1

---

## Genre dimension: what changes per OL section

Generic tier profiles above are not sufficient. As with HL, genre matters as much as grade at OL. Below are the genre-specific overlays the generator must apply.

### OL Composing (Paper 1 Section II, 100 marks Discrete)

Seven options per year. Each with an explicit SEC Indicative P/C/L/M template in the marking scheme. See SEC 2025 OL pp. 14-20 for the template pattern.

**Personal essay overlay:**
- Genre markers: first person throughout, reflective rather than narrative, at least two reflective insights, personal anecdote integrated with reflection, individual observation, authentic voice.
- SEC explicitly requires "reflection on at least two things" when a reflective essay prompt says "reflect on" in plural form.
- O1: two distinct, specific reflections. O4: two reflections but one is surface. O6: one reflection, repeated.

**Short story overlay:**
- Genre markers: sense of beginning-middle-end, central character(s), timeline, defining moment followed by change, resolution.
- First person is common at OL and often scaffolded by the question ("imagine you are..."). Reward it.
- O1: a controlled arc with specific sensory detail and a genuine turn. O4: an arc that works but ends obviously. O6: an arc that sprawls or misses the turn.

**Article overlay:**
- Genre markers: a heading or title, possibly sub-headings, magazine-suitable tone, audience awareness.
- Can be serious, humorous, or mixed (SEC often states this explicitly).
- O1: a strong title that frames the piece, an actual hook, a clear argument or perspective developed across sections. O4: a heading that works plus competent development. O6: a bare heading and generic content.

**Talk / Speech overlay:**
- Genre markers: tone may be formal or informal but must show audience awareness; persuasive or argumentative aspect; may include examples, anecdotes, quotations, inclusive or rhetorical language.
- SEC for speech: "argue for or against" typically requires a position. Reward the position even if the argument is thin.
- O1: opening hook, clear position, two or three supporting arguments with examples, call to action close. O4: position present, supporting content uneven. O6: position drifts mid-piece.

**Diary overlay (appears in Comp Q B more than Section II):**
- Genre markers: date and time, first person, subjective voice, reflective or emotional register, informal syntax acceptable.

### OL Comprehending Question A (Paper 1 Section I, 50 marks split as sub-parts)

Structure typically 15 + 15 + 20 or similar. Combined Criteria throughout.

- 15-mark sub-parts are usually identification-plus-reason tasks ("What did you find most interesting in the text? Give a reason.")
- 20-mark sub-part is usually a short composition tied to the text ("Write a letter", "Write a diary entry").
- Generator must respect the mark cap. Answers longer than one page on a 15-mark sub-part are over-length.
- O1: explicit engagement with the text using specific quotation or reference, paired with a developed reason that does not just restate the quote.
- O4: a reference plus a reason but the reason is generic.
- O6: a reference without a reason, or a reason without a reference.

### OL Comprehending Question B (Paper 1 Section I, 50 marks Discrete)

Single composition-style task. Genre scaffolded by the prompt (letter, blog, report, talk, diary, article).

- This is treated as Discrete even though short. P+C gets 30, L+M gets 20 in proportion. Actual SEC split follows the 30-mark pattern for this paper slot: P=9, C=9, L=9, M=3 at the top; scale down to bands.
- Genre cues follow the same overlay rules as Composing above, but shorter.

**Important:** verify the Discrete vs Combined mode on Q B per year. SEC 2025 OL treats Q B sub-slot as 50 marks but may treat the sub-parts within as Combined. Generator should seed `past_question_pclm` with the per-year mode from the actual scheme.

### OL Single Text (Paper 2 Section I, 60 marks as 2 × 30 = 6 × 10 Combined)

2026 prescribed texts at OL (per current SEC cycle): Macbeth, The Tenant of Wildfell Hall, King Lear, Othello, The Secret Life of Bees, Hamlet, Juno and the Paycock, Dancing at Lughnasa, Philadelphia Here I Come. Confirm against the 2026 paper once published.

- Each 10-mark sub-part is a moment or character or view question.
- Generator must produce 3 short focused sub-responses per 30-mark question, not one long essay.
- O1 at this scale: one specific moment, one reason, one textual reference per sub-response, all three sub-responses tying back to the overall question theme.
- O4 at this scale: correct moments chosen but reasons thin.
- O6 at this scale: moments chosen incorrectly or retold without reason.

### OL Comparative (Paper 2 Section II, 70 marks)

Structure: (a)(i) 15 Combined + (a)(ii) 15 Combined + (b) 40 Discrete.

- (a)(i) and (a)(ii) must pair. They use the same theme / social setting / relationship and apply it to two different texts.
- (b) is the long comparative using two texts, with explicit comparison required.
- For (b) Discrete marking applies: P=12, C=12, L=12, M=4 at O1.
- SEC is explicit: "the emphasis is on identifying similarities and/or differences. This requires the candidate to make comparison(s) throughout their response."
- O1 on (b): sustained comparison with explicit linking words (similarly, by contrast, both, whereas), specific textual reference to both texts, balanced treatment.
- O4 on (b): comparison present but sporadic. Long stretches of single-text analysis with comparison tacked on.
- O6 on (b): two separate text analyses with a single comparative sentence at the end.

### OL Prescribed Poetry (Paper 2 Section III, 50 marks)

Structure: Part 1(a) 15 Combined + Part 1(b) 15 Combined + Part 2(i/ii/iii) 20 Combined.

- 2026 prescribed OL poets (per SEC cycle): Morrissey, Boland, Eliot (Preludes extract), Kavanagh or similar. Confirm against the 2026 paper when published.
- Part 1(a) format: "which line or phrase did you find most thought-provoking? Give reasons."
- Part 1(b) format: "identify two emotions you felt. Explain why."
- Part 2 format: longer 20-mark response on imagery, themes, or memorability, often scaffolded by a creative frame ("you are giving a presentation", "you are calling in to a radio show").

**The creative frame matters**: SEC rewards candidates who sustain the frame. If the question says "write a presentation to your class", the generator should open "Hi everyone" or similar, use direct address, close with a wrap-up. Breaking frame costs P marks.

- O1: explicit use of the frame plus developed analysis of the named element (imagery, themes, memorability).
- O4: frame present at open and close only. Middle drifts into standard essay analysis.
- O6: frame absent or inconsistent.

### OL Unseen Poetry (Paper 2 Section III, 20 marks)

Two questions of 10 marks each, both Combined. Recent formats:

- Q1: impression of speaker / atmosphere / theme
- Q2: effectiveness of language, imagery, or technique

- Answer length: one short paragraph per 10-mark sub-question. Aoife's guide explicitly says "about a quarter to half a page for each question".
- O1: specific quotation from the poem, one clear interpretive claim, one reason why.
- O4: general impression without anchoring to a specific line.
- O6: impression off-mark or un-anchored.

---

## What the generator will produce per tier per section

Translating the above into what a prompt must enforce:

| Section | Mark cap | Mode | O1 word target | O4 word target | O6 word target |
|---|---|---|---|---|---|
| Composing | 100 | Discrete | 900-1100 | 700-850 | 500-700 |
| Comp Q A sub-part (15) | 15 | Combined | 120-180 | 90-130 | 60-100 |
| Comp Q A sub-part (20) | 20 | Combined | 200-280 | 150-210 | 100-160 |
| Comp Q B | 50 | Discrete | 450-550 | 350-450 | 250-350 |
| Single Text sub-part | 10 | Combined | 80-120 | 60-90 | 40-70 |
| Comparative (a)(i) or (a)(ii) | 15 | Combined | 150-200 | 110-160 | 80-120 |
| Comparative (b) | 40 | Discrete | 500-650 | 400-500 | 300-400 |
| Prescribed Poetry 1(a) | 15 | Combined | 120-180 | 90-130 | 60-100 |
| Prescribed Poetry 1(b) | 15 | Combined | 150-200 | 110-160 | 80-120 |
| Prescribed Poetry Part 2 | 20 | Combined | 250-350 | 180-250 | 120-180 |
| Unseen Poetry sub-part | 10 | Combined | 80-120 | 60-90 | 40-70 |

These ranges are soft targets enforced in prompt and measured post-generation. They replace the generic HL-only lengths in SAMPLE-ANSWER-GENERATION-PLAN.md for OL content.

---

## Register rules per tier (compressed)

Apply on top of the generic tier profile and the genre overlay.

### O1 register rules
- Direct second person in instructional genres ("you") where appropriate to the task.
- Active voice dominant.
- Specific naming: characters by name, moments by what happens, quotes by exact wording.
- Sentence mix: two short sentences per paragraph minimum, balanced with one or two developed sentences.
- UK spelling throughout.
- Never em dashes.
- No filler transitions. Paragraphs open with content, not connectives.

### O4 register rules
- Formulaic paragraph openings allowed ("Another example is...", "In the text...").
- One weak adjective per paragraph allowed ("good", "nice", "powerful" without explanation).
- Occasional mechanical transition ("Furthermore", "Also") allowed.
- One spelling error per 200 words realistic but not required.
- Tense slips permitted at paragraph boundaries.

### O6 register rules
- Short simple sentences dominant.
- Retelling rather than analysis.
- Reference to text present but unsupported.
- Spelling errors per 100 words: one to two.
- Basic vocabulary only.
- Tense slips within paragraphs.

---

## Open questions to close before 24 April

1. **Real OL scripts**: pull at least 2 real OL scripts per genre (14 total minimum) from Diarmuid's teaching archive. Mark each against this file. Adjust profiles where observed behaviour contradicts inferred behaviour. This is the highest-value follow-up and costs one afternoon.
2. **2026 prescribed text confirmation**: the OL Single Text and Comparative text lists for 2026 need confirmation against the published SEC paper or the NCCA OL syllabus update. Currently inferred from 2025 patterns.
3. **Q B marking mode**: confirm Discrete vs Combined for Q B sub-slot per year. 2025 treats it as 50 Discrete. Older years may differ.
4. **OL quote bank**: no OL quote bank exists in the companion app today. Generating OL sample answers on Single Text or Comparative requires building OL quote banks for Macbeth, The Tenant of Wildfell Hall, and the comparative texts first. This is upstream of the generator. See OL-SAMPLE-ANSWER-SPEC.md for the sequenced plan.

---

## Change log

- 2026-04-18: Initial version written under six-day 24-April deadline. Built from SEC OL 2020-2025 marking schemes plus Aoife O'Driscoll OL anchor PDFs. Profiles are inferred not observed; all explicitly flagged.
