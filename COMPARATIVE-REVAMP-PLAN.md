# Comparative Revamp Plan

Date: 25 April 2026
Status: Proposal, awaiting decisions before implementation

---

## 1. Where we are

The current `/comparative` route is a single form: pick year, level, mode, three texts, optional instructions. The Claude API call returns one monolithic note structured as five sections (mode overview, 4-5 arguments, comparison anchors, quotes per text, sample paragraph). Markdown, Word and PDF export work. 2026, 2027 and 2028 circular data are wired (2028 not yet in the UI).

That delivers the literal PRD (Section 4.2). It does not deliver what an experienced teacher actually needs, which is what the user is now asking for.

Two related quality concerns from the master plan:

- The "Wuthering Heights / Macbeth mistake at scale" warning sits over comparative as much as anywhere. The lcenglishhub site has older AI-sounding pages on these exact texts. If the comparative generator outputs the same kind of prose, the H1 Club Plus (Sep 2026) launches with the same problem.
- There is no verified quote bank for comparative texts. The current prompt asks Claude to verify via web search at runtime. That is slow, expensive, and unreliable on contemporary texts (Hamnet, Small Things Like These, Purple Hibiscus) where the source text is paywalled.

## 2. Diagnosis: why the current generator falls short

Three structural problems, in order of severity.

### 2.1 Mismatched mental model

Teachers and students work in three layers, not one. SEC marking schemes 2023-2025 confirm this:

1. **Per text** the student needs plot beats, key moments tagged to multiple modes, character profiles, relationships, vision, genre toolkit, cultural-context axes, and 2-3 quotes per character. The SEC indicative material every year says key moments are the spine of a strong answer.
2. **Per mode** the student needs a comparative grid (3 texts x mode axes), 5-6 comparative arguments, and rote link phrases (`While X... by contrast Y...`). Mode-led, not text-led.
3. **Per question** the student needs to deploy moments and arguments against a specific question in the correct format (30 / 40 / 70 marks, PCLM split, ~5 pages not 9).

The current generator collapses all three layers into one form and one output. That is fine for a competent note. It is the wrong shape for elite preparation, because elite preparation is a substrate of reusable Layer 1 material that gets reassembled per mode and per question.

### 2.2 No reusable substrate

Every generation today is from scratch. Hit Generate twice for the same three texts in Cultural Context and you get two unrelated notes, two unrelated quote selections, two different framings. There is no cached profile of *Hamnet*, no canonical key-moments list, no verified quote bank. This blocks the video pipeline (Output 2) too: the script generator wants to pull from a stable, reviewed substrate, not regenerate it.

### 2.3 No exam-question entry point

The highest-leverage student use case is "here is the 2024 Q1(b) question, give me an elite answer plan against the three texts I'm studying." The current generator cannot do this. It cannot read a question, infer the sub-angle, pick the right key moments, target the right word count, or output in the right format. This is also the use case the H1 Club Plus needs to differentiate from Studyclix, which has past-paper questions but does not generate answers against them.

## 3. Proposed architecture: three layers

```
                                   Layer 3
                          Question-specific generator
                          (paste exam Q + 3 texts)
                                      ^
                                      |
                                   Layer 2
                       Mode-led comparative grid + arguments
                          (current /comparative, refactored)
                                      ^
                                      |
                                   Layer 1
                     Comparative Text Profiles (per text, per year)
                       single source of truth, reviewed once
```

Layer 1 is the substrate. Layers 2 and 3 are derived. This is the architecture H1 Club's existing comparative section already uses implicitly (Context, Key Moments, Characters, Evidence That Scores, Common Mistakes) but on lcenglishhub they read like AI sludge because they were generated without this discipline.

### 3.1 Layer 1: Comparative Text Profile

Every prescribed comparative text gets a single canonical Profile, generated once, reviewed by the teacher, then reused. Schema:

```ts
interface ComparativeTextProfile {
  textId: string;                  // "hamnet-ofarrell"
  title: string;                   // "Hamnet"
  author: string;                  // "Maggie O'Farrell"
  type: "novel" | "drama" | "film" | "memoir";
  year: 2026 | 2027 | 2028;        // circular year(s) it sits in
  copyrightStatus: "public_domain" | "rights_managed";

  // Plot
  plotBeats: PlotBeat[];           // 5-7 beats: opening / inciting / midpoint / climax / closing image
  openingScene: SceneNote;         // expanded analysis of opening
  closingScene: SceneNote;         // expanded analysis of closing
  climax: SceneNote;               // expanded analysis of climax (SEC examined this directly in 2025)

  // Key moments are the spine of the whole system
  keyMoments: KeyMoment[];         // 5-8 moments, each tagged to modes + sub-axes
                                   // each moment has: title, location, summary, why-it-matters,
                                   // mode tags (CC.gender, GVV.hope, LG.narrative, TI.power, etc),
                                   // 1-2 verified quotes or shot descriptions

  // Characters
  characters: Character[];         // central + 3-5 supporting
                                   // each character has: name, role, social position,
                                   // mindset, freedoms, contradictions, arc, 2-3 verified quotes

  relationships: Relationship[];   // at least 3-5 relationships, each with a one-paragraph
                                   // analysis tagged to mode-relevance

  // Mode-specific profiles
  culturalContext: {
    socialClass: ContextNote;
    gender: ContextNote;
    religion: ContextNote;
    familyAndMarriage: ContextNote;
    authorityAndPower: ContextNote;
    // ContextNote = { applies: bool, summary, anchorMoments: KeyMomentRef[], quotes: Quote[] }
  };

  generalVisionAndViewpoint: {
    onelineVision: string;         // "Hamnet offers a tempered, ultimately consoling vision of grief and survival"
    openingShapesVision: ContextNote;
    closingShapesVision: ContextNote;
    crisesAndResponses: ContextNote;
    ambiguityAndComplexity: ContextNote;
    keyMomentsThatShapeVision: KeyMomentRef[];
  };

  literaryGenre: {
    // toolkit varies by type
    novel?: { narrativeVoice, structure, imagery, pacing, dialogue, characterisation };
    drama?: { soliloquy, stageDirections, asides, structure, dialogue, staging };
    film?: { cinematography, music, editing, miseEnScene, dialogue, performance };
    keyMomentsThatShowcaseGenre: KeyMomentRef[];
  };

  themeOrIssue: {
    primaryThemes: ThemeNote[];    // 3-5 themes, each with depth
    pivotalMoments: KeyMomentRef[];
    contradictoryAspects: string;  // SEC 2023 examined this directly
  };

  // Output 2 video pipeline
  videoSafeQuotes: Quote[];        // for rights_managed texts: max 3 consecutive lines per quote
  attributionLine: string;
}

interface Quote {
  text: string;
  speaker?: string;                // for drama / film
  location: string;                // chapter, page, act-scene, timestamp
  verified: "verified" | "unverified" | "paraphrased";
  source?: string;                 // edition reference for verified quotes
}
```

Why this is the highest-leverage thing to build first:

- Each profile feeds Layer 2 and Layer 3 indefinitely. Generate once, review once, reuse forever.
- Profiles are the substrate the video pipeline (Output 2) already needs but does not have.
- Profiles solve the quote verification problem at the right level: you verify quotes once when building the profile, not every time someone hits Generate.
- Profiles can be exported as study-pack PDFs for paid H1 Club Plus members directly. Layer 1 alone is a sellable product.

### 3.2 Layer 2: Mode-led comparative grid

Refactor the current `/comparative` to consume Profiles. Same five-section output the PRD already specifies, but the prompt now has access to verified quotes, tagged key moments, and pre-built mode profiles for each text. Quality jumps without prompt redesign because the input is better.

New UI element: an actual grid view. 3 texts (columns) x mode axes (rows). For Cultural Context:

|              | Hamnet  | A Raisin in the Sun | The Banshees of Inisherin |
|--------------|---------|---------------------|---------------------------|
| Social class |   ...   |        ...          |            ...            |
| Gender       |   ...   |        ...          |            ...            |
| Religion     |   ...   |        ...          |            ...            |
| Family       |   ...   |        ...          |            ...            |
| Authority    |   ...   |        ...          |            ...            |

Each cell holds a 1-2 sentence interpretation plus a key-moment reference plus a quote. This is exactly how teachers structure their classroom notes (PDST workshop materials confirm this). Today's prompt produces a wall of text; the grid produces something a student can actually study from.

Outputs from Layer 2:

- The grid (HTML, exportable to A4 landscape PDF, exportable to Word table).
- 5-6 comparative arguments derived from the grid.
- Comparison anchor sentences, mode-specific.
- One sample comparative paragraph (kept from current prompt).

### 3.3 Layer 3: Question-specific generator

New route: `/comparative/question`. Inputs: paste a question, pick three texts, pick the format (Q1a 30 marks / Q1b 40 marks / Q2 70 marks).

The generator:

1. Classifies the question. Extracts mode (CC / GVV / LG / TI), sub-angle ("freedom determined by social position" -> CC.gender + CC.socialClass), question-shape ("compare", "to what extent", "discuss"), and any specific structural element being tested (climax, opening, key moment, relationship, technique).
2. Pulls the relevant key moments from the three Profiles based on mode + sub-angle tags.
3. Builds an answer plan: introduction with question-facing thesis, 4-6 body paragraphs each citing all three texts with comparative link sentences, conclusion.
4. Targets the correct word count for the format. PCLM-aware (Purpose primacy: marks for Coherence and Language cannot exceed marks for Purpose).
5. Outputs both the plan and a fully-written sample answer at a chosen tier (H1 / H2 / H4).

Reference question bank should include at minimum the verbatim 2023, 2024, 2025 HL questions for all three modes (already on disk at `/Users/diarmuiddoyle/lcenglishhub/sec-marking-schemes/`) plus the Theme or Issue questions for 2027 prep.

This is the layer that makes the product feel elite. It is also the layer no competitor has.

## 4. What we keep, what we build

### Keep

- `/comparative` route as Layer 2 entry, refactored to read from Profiles.
- `buildSystemPrompt()` in `/lib/claude/prompts.ts`. The general rules (UK English, no em dashes, banned words, approved devices) apply unchanged.
- Existing circular data files at `/data/circulars/2026-comparative.json` etc.
- Word, PDF, Markdown export utilities.

### Build

- `/data/profiles/comparative/<year>/<textId>.json` - one file per text per year. Source of truth.
- `/lib/claude/comparativeProfilePrompt.ts` - new prompt that generates a Profile from circular data + uploaded source material (or web search for public-domain texts).
- `/app/comparative/text/[id]/page.tsx` - Profile viewer / editor / regenerate.
- `/app/comparative/grid/page.tsx` - Layer 2 grid view (replaces or supplements current comparative page).
- `/app/comparative/question/page.tsx` - Layer 3 question generator.
- `/lib/claude/comparativeAnswerPrompt.ts` - new prompt for Layer 3 (the EOD plan already flagged this as needed but unwritten).
- Quote bank: `/data/profiles/comparative/<year>/<textId>.quotes.json` separated from main Profile so quotes can be reviewed/audited independently.
- `/data/comparative-questions/<year>.json` - SEC question bank (use the verbatim text already on disk).

## 5. Sequencing

Phase A. Profile generation pipeline. 2-3 weeks.
Build the schema, the generator prompt, the viewer UI, the review workflow. Generate Profiles for the 9 highest-priority 2026 texts first: Hamnet, A Raisin in the Sun, The Crucible, Macbeth, Sive, Dracula, The Banshees of Inisherin, Small Things Like These, Purple Hibiscus. These cover the most-taught comparative groupings.

Phase B. Refactor Layer 2 to consume Profiles. 1-2 weeks.
Quality jumps automatically once the substrate is in place. New grid view. Existing five-section output becomes a derivative artefact rather than the main output.

Phase C. Layer 3 question generator. 2 weeks.
Question classifier prompt, answer plan prompt, sample answer prompt. Question bank seeded from `/Users/diarmuiddoyle/lcenglishhub/sec-marking-schemes/`.

Phase D. OL implementation. 1 week.
The OL spec already exists at `/Users/diarmuiddoyle/lcenglishhub/ol-prompt-modules/07-olComparativePrompt.md`. Adapt the HL profile schema for OL modes (Social Setting, Relationships, Hero/Heroine/Villain) and OL word counts.

Phase E. Coverage expansion. Rolling.
Generate Profiles for the remaining 30+ texts as anthology uploads come in. Each new text plugs into the system without changing the architecture.

Total to MVP (A+B+C): 5-7 weeks of focused engineering.

## 6. Hard problems and trade-offs

### 6.1 Quote verification at scale

The unsolved problem. Three options:

1. **Web search per request.** Status quo. Slow, expensive, unreliable on contemporary texts. Reject.
2. **Anthology upload + retrieval.** Teacher uploads PDFs of the prescribed texts, app indexes them, prompts retrieve verified passages. Best long-term answer. Implementation cost: 1-2 weeks for indexing infra, but solves the problem permanently.
3. **Hand-curated quote bank.** Teacher (or a contractor) selects 30-50 quotes per text, tagged to mode and key moment, stored in `<textId>.quotes.json`. Lower tech cost but higher human cost.

Recommendation: build (3) for the 9 priority texts first as a forcing function for quality. Layer (2) on top later for scale. Six of the prescribed texts are public domain (Macbeth, Othello, Hamlet, Dracula, Pride and Prejudice, Wuthering Heights per the EOD plan) and can be scraped today; do those via (2) immediately, do contemporary texts via (3).

### 6.2 Anti-hallucination on character and plot details

A profile that invents a character ruins the entire substrate. Embed strict rules in the profile generator prompt:

- Every character must have a verified quote attributing the role.
- Every plot beat must cite a chapter / act-scene / timestamp.
- Anything the model is not sure of gets `[VERIFY]`.
- Profile quality flag: `draft` -> `reviewed` -> `approved`. Layer 2 and 3 only consume `approved` Profiles.

### 6.3 2026 vs 2027 mode rotation

2026 examines CC, GVV, LG. 2027 examines CC, GVV, TI (LG out). Profiles should hold all four mode profiles regardless of year so a Profile generated for 2026 students is reusable in 2027 if the text is still prescribed. Some texts will rotate out; their Profiles get archived but kept (older students retake exams).

### 6.4 Time pressure

The June 2026 LC is six weeks away. This revamp will not be live for those students. It is for the 2026/27 cohort. That is fine. The 2026 students should still get the existing generator. Do not block on shipping a perfect comparative for June.

The H1 Club Plus launch is September 2026. That is the deadline for at least Phase A and Phase B. Phase C can land in October if needed. The differentiator for Tier 2 (€279/year H1 Class) is the question-specific layer; if it slips past September, the tier launches without its sharpest hook.

### 6.5 Output 1 vs Output 2 dependency

The video pipeline (Output 2) wants Profiles too. If Profiles ship for comparative first, the same schema can be lifted for the existing poetry pipeline. That is a separate piece of work but worth flagging now: do not design comparative Profiles in isolation from the poem-side data model.

## 7. Decisions needed before implementation

1. **HL only first, or HL + OL together?** Recommend HL first. The OL spec exists but the audience is smaller and the H1 Club's paying market is HL.
2. **Quote strategy.** Recommend hand-curated bank for the 9 priority texts; web-scraped + indexed for public-domain texts.
3. **Profile review workflow.** Who approves? Recommend the teacher (project owner) reviews every Profile before it flips to `approved`. Automation does not solve quality here.
4. **Sample answer tiers in Layer 3.** Generate H1 + H2 + H4 examples by default? Or single elite-tier with a "compare to a weaker answer" toggle? Recommend the latter, less generation cost.
5. **Question bank scope.** SEC 2023-2025 is on disk. Do we add 2018-2022 (currently unverified, paraphrased only)? Recommend yes, but flag as `verified: false` until cross-checked against SEC PDFs.
6. **Existing `/comparative` URL.** Keep at the same URL or move to `/comparative/grid`? Recommend keeping the URL for the grid view (it is the spiritual successor), and adding `/comparative/text/[id]` and `/comparative/question` as siblings.

## 8. What this is not

- It is not a feature breadth dump. The temptation when a generator feels narrow is to add ten more form fields. That makes it worse. The fix is structural: three layers, each with a tight focus.
- It is not a rewrite of the prompt rules. UK English, no em dashes, banned words, approved devices, reading level - all of that stays unchanged. The substrate changes; the voice rules don't.
- It is not coupled to the lcenglishhub WordPress side. lcenglishhub is the lead magnet. This is the teacher tool. Profile output can later be syndicated to lcenglishhub as ungated free content if desired, but that is downstream and out of scope.

---

## Appendix: anchoring evidence from research

- SEC 2024 HL marking scheme line 1392: "Candidates may refer to only one film in the course of their answers."
- SEC 2023, 2024, 2025 indicative material: every year states key moments exist "to allow the candidates to ground their responses in specific moments without feeling that they must range over the entire text/s."
- SEC 2025 HL Q1(a) GVV examined the climax directly: "Do you think that the climax of a text is over-influential in shaping a reader's perception of the general vision and viewpoint of that whole text?"
- SEC 2024 HL Q1 LG examined a believable relationship: "Discuss how the author in one text on your comparative course employs a variety of techniques to make a relationship in that text believable."
- 2013 Chief Examiner's Report (most recent English-specific report): "Candidates were most successful when they avoided a formulaic approach and demonstrated the ability to link and cross-reference."
- PCLM cap (SEC 2025 marking scheme): "Given the primacy of Clarity of Purpose (P), marks awarded for Coherence of Delivery (C) and Efficiency of Language Use (L) cannot exceed marks awarded for Clarity of Purpose (P)."
- Teacher consensus (leavingcertenglish.net "Tackling the Comparative"): a working comparative answer is roughly five well-developed pages, not nine. Going long cannibalises Poetry time.

Source files referenced live at:

- `/Users/diarmuiddoyle/lcenglishhub/sec-marking-schemes/sec_2023_english_hl.txt`
- `/Users/diarmuiddoyle/lcenglishhub/sec-marking-schemes/sec_2024_english_hl.txt`
- `/Users/diarmuiddoyle/lcenglishhub/sec-marking-schemes/sec_2025_english_hl.txt`
- `/Users/diarmuiddoyle/lcenglishhub/PCLM-MARKING-SCHEME.md`
- `/Users/diarmuiddoyle/lcenglishhub/ol-prompt-modules/07-olComparativePrompt.md`
- `/Users/diarmuiddoyle/lc-companion/data/circulars/2026-comparative.json`
- `/Users/diarmuiddoyle/lc-companion/lib/claude/prompts.ts` (current `buildComparativePrompt` at lines 805-880)
- `/Users/diarmuiddoyle/lc-companion/EOD-GENERATOR-EXPANSION-PLAN.md` (the unbuilt Step 3)
