# LC Teaching Companion - Product Requirements Document

## 1. Project Overview

### What This Is

A private, password-protected web application for a single user (the teacher/owner). It generates elite, exam-aligned Leaving Certificate English content on demand, exports it in multiple formats, and powers a video content pipeline.

The system is built around the official Department of Education prescribed text lists (Circular 0016/2024 for 2026 and the equivalent for 2027). All content generation is bounded by these circulars. The app does not generate content for texts or poems outside the prescribed lists.

### The Three Outputs (Built in Order)

**Output 1 - Teaching Notes (Priority)**
Generate poetry analysis notes, comparative text notes, worksheets, activities, and PowerPoint slides on demand via live Claude API calls. Content is concise, exam-focused, and aligned with the LC English syllabus. This is the foundation. Everything else derives from reviewed Output 1 content.

**Output 2 - Video Content**
Takes an approved note (from Output 1), reformats it into a spoken script with timing markers, generates audio via Voicebox (local voice cloning tool) REST API, and assembles a video with the poem/text on screen and highlighted lines synced to the audio. Target length: 3-10 minutes per video.

**Output 3 - H1 Club Content (Parked)**
Same quality and substance as Output 1, reformatted to the H1 Club's existing content structure. The specific format will be defined later. Do not build this yet.

### Who Uses This

Only the owner. This is a private admin tool. There is no student-facing interface. Password-protect the entire application.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Hosting | Vercel (hobby tier) |
| AI | Claude API (Anthropic) |
| Voice | Voicebox (local, REST API at localhost:8000) |
| Video | Remotion (React-based video rendering) |
| Export | docx-js (Word), pptxgenjs (PowerPoint), PDF generation |
| Data | JSON files for circular data, local filesystem for generated content |

No database is needed. The circulars are static JSON. Generated content is exported as files.

---

## 3. Content Generation Rules (Non-Negotiable)

These rules apply to ALL content the system generates via Claude API. They must be embedded in every system prompt.

### Language and Style

- All content in UK English (colour, analyse, recognise, etc.)
- NEVER use em dashes anywhere in any content, under any circumstances. No en dashes either. Use commas, full stops, semicolons, or colons instead. Students recognise em dashes as AI-generated content, and their presence instantly damages the credibility of the material. This is a hard rule with zero exceptions.
- Never use the word "delve", "nuanced", "landscape" (in non-literal contexts), "multifaceted", "tapestry", or other recognisable AI filler words.
- Sentences must be clear and direct. No padding. No waffle.
- Avoid overly academic or pretentious language. The purpose of this content is to simplify topics that students do not understand and put them into the students' own words. Explain complex ideas simply.
- Content should read as if written by an experienced, knowledgeable teacher, not by AI.
- The tone is authoritative but accessible. Think: the best English teacher you ever had explaining something clearly.
- No dramatic or unnecessarily complex vocabulary. Use strong, precise words, but not words a student would need to look up.

### Reading Level by Cycle

These reading level targets must be applied to all generated content based on the target audience:

**Junior Cycle (1st, 2nd, 3rd Year):**
- Reading age: 12-14
- Maximum sentence length: 22 words
- Vocabulary: straightforward, no complex terms without immediate explanation
- There is scope for slightly more complexity on occasion, but no dramatic vocabulary jumps

**Senior Cycle (5th and 6th Year / Leaving Certificate):**
- Reading age: 14-17
- Maximum sentence length: no hard cap, but keep sentences clear and avoid run-on constructions
- Vocabulary: can be more sophisticated than Junior Cycle, but the goal is always clarity over complexity
- Literary terminology (metaphor, enjambment, juxtaposition, etc.) is expected and appropriate, but must always be connected to meaning rather than dropped in for show
- The principle remains: simplify topics students do not understand. Put complex ideas into accessible language. Top-tier analysis does not require impenetrable prose.

### Accuracy

- NEVER hallucinate quotes. If the system is not certain a quote is accurate, it must not include it. It is better to describe what a line says than to fabricate a quotation.
- NEVER invent plot details, character names, or events that do not exist in the text.
- NEVER misattribute a poem to the wrong poet or a quote to the wrong character.
- If the AI is uncertain about a specific detail, it must flag this explicitly with a note like: "[VERIFY: check exact wording of this line]"
- All content must be defensible in an exam context. If a literary interpretation would not be accepted by an SEC examiner, do not present it as fact.

### Exam Alignment

- Content must be oriented around how it would appear in an exam answer.
- For poetry, focus on the themes and techniques that actually come up in LC English exam questions. Do not produce generic literary appreciation.
- For comparative study, content must be structured around the prescribed comparative modes (Cultural Context, General Vision and Viewpoint, Literary Genre for 2026 HL; Theme or Issue replaces Literary Genre for 2027 HL).
- Always consider: "What would the examiner be looking for in a response about this?"

### Poetic Devices (Approved List)

Only use poetic/literary devices that are aligned with the Leaving Certificate English syllabus. The following are the core devices students should be expected to identify and discuss:

**Sound devices:** alliteration, assonance, onomatopoeia, rhyme (full, half, internal), rhythm, sibilance

**Figurative language:** metaphor, simile, personification, hyperbole, oxymoron, symbolism, allegory

**Structural devices:** enjambment, caesura, stanza structure, volta (turn), refrain, repetition, parallelism

**Tone and mood:** tone shifts, irony (verbal, situational, dramatic), ambiguity, juxtaposition, contrast

**Imagery:** visual imagery, auditory imagery, tactile imagery, sensory detail

**Other exam-relevant devices:** rhetorical questions, direct address, colloquial language, register shifts, dramatic monologue, narrative voice (first/third person)

**Do NOT use** unless specifically relevant and the student would be expected to know it: synecdoche, metonymy, litotes, anaphora (use "repetition" instead), epistrophe, chiasmus, zeugma, synesthesia, or any other device that would confuse a typical HL student or that examiners would not expect to see identified.

### Anti-AI Detection

The content must not look or feel AI-generated. Specific rules:

- Vary sentence length naturally. Mix short punchy sentences with longer explanatory ones.
- Do not start consecutive paragraphs with the same word.
- Do not use formulaic transitions like "Furthermore", "Moreover", "Additionally" in sequence.
- Do not use bullet points where prose works better.
- Include occasional colloquial phrasing appropriate for an Irish educational context.
- Do not over-hedge. State interpretations confidently where they are defensible.

---

## 4. Output 1 Specification - Teaching Notes

### 4.1 Poetry Analysis Notes

**Format: Hybrid approach**

- Line-by-line breakdown for complex or dense poems (e.g., Eliot's "Prufrock", Donne's "A Valediction Forbidding Mourning", Ni Chuilleanain's "Fireman's Lift")
- Stanza-by-stanza breakdown for more straightforward poems (e.g., Yeats' "Lake Isle of Innisfree", Heaney's "The Forge", Meehan's "Buying Winkles")
- The system should default to stanza-by-stanza and only go line-by-line when the density of the poem demands it
- Focus on poetic devices from the approved list only

**Structure of a Poetry Note:**

1. **Poem Overview** (3-5 sentences max)
   - What the poem is about at surface level
   - The central theme(s) in one sentence
   - Where it sits in the poet's broader concerns (link to their recurring themes)
   - Brief note on form/structure if relevant

2. **Stanza/Line Breakdown**
   - For each stanza (or section of lines): what is happening, what techniques are being used, what effect they create
   - Quotations must be accurate or flagged for verification
   - Every device identified must be connected to meaning. Do not just name a device. Explain what it does in context.
   - Format: the relevant line or phrase, followed by the technique, followed by the effect/significance

3. **Key Themes** (brief, 2-3 sentences each)
   - Only themes that are genuinely central to this poem
   - Connected to the poet's wider body of work where relevant
   - Oriented toward exam questions (e.g., "A question on [poet] and memory would draw heavily on this poem because...")

4. **Exam-Ready Takeaways**
   - 3-5 sentences a student could adapt directly into an exam answer
   - Pre-built phrases that demonstrate strong analytical language
   - Specific to this poem, not generic

5. **Link to Other Poems by This Poet**
   - Brief connections (1-2 sentences each) to other prescribed poems by the same poet that share themes or techniques
   - Useful for the "discuss the poetry of [poet]" style questions

### 4.2 Comparative Text Notes

**Structure follows the three HL comparative modes for 2026:**

- Cultural Context (CC)
- General Vision and Viewpoint (GVV)
- Literary Genre (LG)

**For 2027, Literary Genre is replaced by Theme or Issue (TI).**

**For each mode, the note should contain:**

1. **Mode Definition and Examiner Lens** (2-3 sentences)
   - What this mode actually means
   - What the examiner is looking for when reading an answer in this mode
   - The most common mistake students make (e.g., writing about theme when the question is about vision)

2. **Key Comparative Arguments** (4-5 per mode)
   - Pre-built comparative points across the three texts being studied
   - Not summaries of each text. Actual arguments that compare and contrast.
   - Each argument should be 3-5 sentences with supporting evidence from the texts
   - For Cultural Context specifically, arguments must relate to: social setting and class, family, religion, love and marriage, and/or gender roles. Not every text will engage with all five. Only use the topics genuinely relevant to each text.

3. **Comparison Anchors**
   - For each argument: one similarity and one contrast across the texts
   - Pre-built transitional phrases for linking texts (e.g., "While [Text A] presents... [Text B] offers a contrasting...")

4. **Key Quotes per Mode** (curated, 3-4 per text per mode)
   - Tagged to which argument they support
   - Must be verified accurate

5. **Sample Comparative Paragraph** (one per mode)
   - Demonstrates how to weave all three texts together in response to a typical question
   - Shows the "A, then B, then C" structure that examiners reward

### 4.3 Worksheets and Activities

The system should generate:

- **Pre-lesson activities:** hooks, discussion starters, image-based prompts, prediction exercises
- **During-lesson activities:** close reading exercises, device identification tasks, quote analysis grids
- **Post-lesson activities:** exam-style questions (short and extended), reflection prompts, comparison tasks
- **Vocabulary exercises:** key terms from the text with definitions, usage in context, exam-appropriate synonyms

Format: clean, printable layout. Exportable as PDF and Word.

### 4.4 PowerPoint Slides

The system should generate presentation slides for classroom use:

- **Poetry lessons:** Title slide, poet context (brief), poem displayed, stanza-by-stanza analysis slides, key themes slide, exam connection slide
- **Comparative lessons:** Mode overview, text-by-text points, comparison slides, sample paragraph walkthrough
- **General lessons:** Adaptable to whatever the user requests

Design requirements:
- Clean, professional, teacher-made aesthetic. Not flashy.
- Use the owner's brand colours where appropriate (teal and navy on cream) but keep it subtle.
- No accent lines under titles (AI hallmark).
- Minimal text per slide. Key points only. The teacher provides the detail verbally.
- Include speaker notes with the detailed content the teacher should say.

---

## 5. Output 2 Specification - Video Content Pipeline

### Overview

Takes an approved Output 1 note and transforms it into a video where the owner's cloned voice narrates a poem analysis while the poem text is displayed on screen with lines highlighting as they are discussed.

### Pipeline Steps

**Step 1: Script Generation**

The system takes a completed, reviewed poetry note and reformats it into a spoken script. The script is structured as an array of sections:

```json
{
  "poem_title": "The Forge",
  "poet": "Seamus Heaney",
  "total_estimated_duration": "6:30",
  "sections": [
    {
      "id": "intro",
      "type": "introduction",
      "script_text": "Today we are looking at The Forge by Seamus Heaney. This is one of Heaney's most celebrated poems...",
      "highlight_lines": [],
      "estimated_duration_seconds": 45
    },
    {
      "id": "stanza_1_lines_1_4",
      "type": "analysis",
      "script_text": "The poem opens with the line 'All I know is a door into the dark.' This immediately establishes...",
      "highlight_lines": [1, 2, 3, 4],
      "estimated_duration_seconds": 90
    }
  ]
}
```

Rules for script generation:
- The script must sound natural when spoken aloud. No written-English constructions that sound awkward when read.
- Sentences should be shorter than in written notes. Spoken analysis needs breathing room.
- Remove all parenthetical references, footnotes, or written-only formatting.
- The script should follow the same hybrid approach: stanza-by-stanza for simpler poems, line-by-line for complex ones.
- Target total duration: 3-10 minutes.
- Each section should map to specific line numbers in the poem for highlighting.

**Step 2: Voice Generation (Voicebox)**

The system sends each script section to the Voicebox REST API running locally:

```
POST http://localhost:8000/generate
Content-Type: application/json

{
  "text": "Today we are looking at The Forge by Seamus Heaney...",
  "profile_id": "{owner_voice_profile_id}",
  "language": "en"
}
```

Returns: audio file (WAV/MP3) for each section.

The owner must have already created a voice profile in Voicebox by recording a short sample of their voice. The profile_id is stored in the app configuration.

**Step 3: Video Assembly (Remotion)**

A Remotion composition that:

1. Displays the full poem text on screen (clean, readable typography)
2. Highlights the relevant lines (colour change, subtle background highlight, or underline) based on the current section's `highlight_lines` array
3. Plays the corresponding audio file for each section
4. Transitions smoothly between sections
5. Includes a title card at the start (poem name, poet name, branding)
6. Includes a brief end card (branding, call to action if desired)

Design:
- Background: cream/off-white
- Text: dark navy
- Highlighted lines: teal highlight or teal text
- Font: clean, readable serif or sans-serif
- Branding: small LC English Hub or H1 Club logo in corner
- Resolution: 1920x1080 (standard YouTube)

Output: MP4 file ready for upload.

### Video Pipeline UI

In the app, after generating and reviewing a poetry note, the user should see a "Generate Video" button that:

1. Shows a preview of the script (editable before generation)
2. Allows the user to adjust section breaks and line mappings
3. Triggers the Voicebox API calls
4. Shows progress as audio generates
5. Triggers Remotion rendering
6. Provides the final MP4 for download

---

## 6. App Architecture

### Pages/Routes

```
/                     - Dashboard (recent generations, quick actions)
/login                - Password gate
/poetry               - Poetry note generator
/poetry/[id]          - View/edit a generated poetry note
/comparative          - Comparative note generator
/comparative/[id]     - View/edit a generated comparative note
/worksheet            - Worksheet/activity generator
/slides               - PowerPoint generator
/video                - Video pipeline (select a note, generate script, produce video)
/video/[id]           - View/edit a video project
/settings             - API keys, Voicebox config, voice profile selection
```

### Dashboard

The landing page after login. Shows:
- Quick action buttons: "New Poetry Note", "New Comparative Note", "New Worksheet", "New Slides", "New Video"
- Recent generations with status (draft, reviewed, exported)
- Poet/text selector that filters to the correct circular year

### Content Generation Flow

1. User selects the circular year (2026 or 2027)
2. User selects the content type (poetry, comparative, worksheet, slides)
3. User selects the specific text/poem from the prescribed list (populated from circular JSON data)
4. User optionally adds specific instructions (e.g., "focus on imagery and memory", "this is for a mixed-ability class", "OL level")
5. System sends request to Claude API with:
   - The system prompt (all rules from Section 3)
   - The circular context (what is prescribed, what modes are examined)
   - The specific text/poem details
   - The content type template (poetry note structure, comparative structure, etc.)
   - Any user instructions
6. Response streams back in real time
7. User reviews, edits if needed, then exports

### Claude API System Prompt (Core)

This is the base system prompt sent with every generation request. Content-type-specific instructions are appended.

```
You are a Leaving Certificate English content generator for an experienced Irish secondary school teacher. Your role is to produce exam-focused, accurate, and concise study content aligned with the Irish Leaving Certificate English syllabus.

ABSOLUTE RULES:
- Write in UK English at all times (colour, analyse, recognise, etc.)
- NEVER use em dashes or en dashes anywhere. Not once. Not ever. Use commas, full stops, semicolons, or colons instead. Students recognise em dashes as AI-generated and it destroys credibility.
- Never hallucinate quotes. If you are not certain a quote is word-perfect, describe what the line says instead, or flag it with [VERIFY].
- Never invent plot details, character names, or events.
- Never use these words: delve, nuanced (unless genuinely necessary), landscape (figuratively), multifaceted, tapestry, furthermore, moreover, additionally (in sequence).
- Every literary device you identify must be from the approved list and must be connected to meaning. Do not name a device without explaining its effect.
- All content must be defensible in an SEC exam context.
- Content should read as if written by an experienced teacher, not by AI.
- Vary sentence length. Mix short and long. Do not start consecutive paragraphs with the same word.
- No dramatic or complex vocabulary. Use strong, precise words that students would naturally use.
- The goal is to simplify topics students do not understand and explain them in accessible language. Top-tier analysis does not require impenetrable prose.

READING LEVEL: {reading_level}
- If Junior Cycle: reading age 12-14, max 22 words per sentence, straightforward vocabulary
- If Senior Cycle: reading age 14-17, clear sentences, literary terminology expected but always connected to meaning

CONTEXT:
You are generating content for the {year} Leaving Certificate English examination.
The prescribed material is defined by Circular {circular_number}.
The comparative modes for {year} Higher Level are: {modes}.
The student is studying at {level} Level.

CONTENT TYPE: {content_type}
SPECIFIC TEXT/POEM: {text_or_poem}
POET/AUTHOR: {author}
USER INSTRUCTIONS: {user_instructions}
```

---

## 7. Prescribed Material Data (2026 - Circular 0016/2024)

This data must be stored as structured JSON and used to populate dropdowns and validate content requests.

### 7.1 Single Text Options (2026)

```json
{
  "year": 2026,
  "circular": "0016/2024",
  "single_texts": [
    { "author": "Anne Bronte", "title": "The Tenant of Wildfell Hall", "level": "H/O" },
    { "author": "Lorraine Hansberry", "title": "A Raisin in the Sun", "level": "O" },
    { "author": "John B. Keane", "title": "Sive", "level": "O" },
    { "author": "Arthur Miller", "title": "The Crucible", "level": "H/O" },
    { "author": "Maggie O'Farrell", "title": "Hamnet", "level": "H/O" },
    { "author": "Ron Rash", "title": "The Cove", "level": "O" },
    { "author": "William Shakespeare", "title": "Macbeth", "level": "H/O" },
    { "author": "Bram Stoker", "title": "Dracula", "level": "H/O" },
    { "author": "Colson Whitehead", "title": "The Underground Railroad", "level": "O" }
  ]
}
```

### 7.2 Comparative Study Texts (2026)

```json
{
  "comparative_modes_HL": ["Cultural Context", "General Vision and Viewpoint", "Literary Genre"],
  "comparative_modes_OL": ["Social Setting", "Relationships", "Hero, heroine, villain"],
  "novels_memoirs": [
    { "author": "Chimamanda Ngozi Adichie", "title": "Purple Hibiscus" },
    { "author": "Jane Austen", "title": "Pride and Prejudice" },
    { "author": "Pat Barker", "title": "The Silence of the Girls" },
    { "author": "Colin Barrett", "title": "Young Skins" },
    { "author": "Anne Bronte", "title": "The Tenant of Wildfell Hall" },
    { "author": "Thi Bui", "title": "The Best We Could Do" },
    { "author": "Raymond Chandler", "title": "The Big Sleep" },
    { "author": "Anthony Doerr", "title": "All the Light We Cannot See" },
    { "author": "Daphne Du Maurier", "title": "Rebecca" },
    { "author": "Bonnie Garmus", "title": "Lessons in Chemistry" },
    { "author": "Tom Gregory", "title": "A Boy in the Water" },
    { "author": "Thomas Hardy", "title": "The Mayor of Casterbridge" },
    { "author": "Claire Keegan", "title": "Small Things Like These" },
    { "author": "Mike McCormack", "title": "Notes from a Coma" },
    { "author": "Maggie O'Farrell", "title": "Hamnet" },
    { "author": "Delia Owens", "title": "Where the Crawdads Sing" },
    { "author": "Claudia Pineiro", "title": "Elena Knows" },
    { "author": "Ron Rash", "title": "The Cove" },
    { "author": "Bram Stoker", "title": "Dracula" },
    { "author": "Colson Whitehead", "title": "The Underground Railroad" }
  ],
  "drama": [
    { "author": "Marina Carr", "title": "Girl on an Altar" },
    { "author": "Euripides", "title": "Medea" },
    { "author": "Lorraine Hansberry", "title": "A Raisin in the Sun" },
    { "author": "John B. Keane", "title": "Sive" },
    { "author": "Phillip McMahon", "title": "Once Before I Go" },
    { "author": "Arthur Miller", "title": "The Crucible" },
    { "author": "Laura Wade", "title": "Colder Than Here" },
    { "author": "William Shakespeare", "title": "Macbeth" },
    { "author": "William Shakespeare", "title": "The Merry Wives of Windsor" }
  ],
  "film": [
    { "director": "Wes Anderson", "title": "The Grand Budapest Hotel" },
    { "director": "Frank Darabont", "title": "The Shawshank Redemption" },
    { "director": "Deniz Gamze Erguven", "title": "Mustang" },
    { "director": "Greta Gerwig", "title": "Barbie" },
    { "director": "Rian Johnson", "title": "Knives Out" },
    { "director": "Asif Kapadia", "title": "Diego Maradona" },
    { "director": "Elia Kazan", "title": "On the Waterfront" },
    { "director": "Martin McDonagh", "title": "The Banshees of Inisherin" }
  ]
}
```

### 7.3 Poetry - Higher Level (2026)

```json
{
  "hl_poetry_2026": {
    "note": "Students must study at least 6 poems per poet. 8 poets prescribed.",
    "poets": {
      "Elizabeth Bishop": [
        "The Fish",
        "The Bight",
        "At the Fishhouses",
        "The Prodigal",
        "Questions of Travel",
        "The Armadillo",
        "Sestina",
        "First Death in Nova Scotia",
        "Filling Station",
        "In the Waiting Room"
      ],
      "John Donne": [
        "The Sunne Rising",
        "Song: Go, and catch a falling star",
        "The Anniversarie",
        "Song: Sweetest love, I do not goe",
        "The Dreame",
        "A Valediction Forbidding Mourning",
        "The Flea",
        "Batter my heart",
        "At the round earth's imagined corners",
        "Thou hast made me"
      ],
      "T.S. Eliot": [
        "The Lovesong of J. Alfred Prufrock",
        "Preludes",
        "Aunt Helen",
        "from The Waste Land: II. A Game of Chess",
        "Journey of the Magi",
        "from Landscapes: III Usk",
        "from Landscapes: IV Rannoch, by Glencoe",
        "from The Four Quartets: East Coker IV"
      ],
      "Seamus Heaney": [
        "The Forge",
        "Bogland",
        "The Tollund Man",
        "Mossbawn: Two Poems in Dedication (1) Sunlight",
        "A Constable Calls",
        "The Skunk",
        "The Harvest Bow",
        "The Underground",
        "Postscript",
        "A Call",
        "Tate's Avenue",
        "The Pitchfork",
        "Lightenings viii (The annals say...)"
      ],
      "Paula Meehan": [
        "Buying Winkles",
        "The Pattern",
        "The Statue of the Virgin at Granard Speaks",
        "Cora, Auntie",
        "The Exact Moment I Became a Poet",
        "My Father Perceived as a Vision of St. Francis",
        "Hearth Lesson",
        "Prayer for the Children of Longing",
        "Death of a Field",
        "Them Ducks Died for Ireland"
      ],
      "Eilean Ni Chuilleanain": [
        "Lucina Schynning in Silence of the Nicht",
        "The Second Voyage",
        "Deaths and Engines",
        "Street",
        "Fireman's Lift",
        "All for You",
        "Following",
        "Kilcash",
        "Translation",
        "The Bend in the Road",
        "On Lacking the Killer Instinct",
        "To Niall Woods and Xenya Ostrovskaia, married in Dublin on 9 September 2009"
      ],
      "Tracy K. Smith": [
        "Joy (Elegy 1)",
        "Dominion over the beasts of the Earth",
        "The Searchers",
        "Letter to a Photojournalist Going In",
        "The Universe is a House Party",
        "The Museum of Obsolescence",
        "Don't you wonder, sometimes?",
        "It's Not",
        "The Universe as Primal Scream",
        "The Greatest Personal Privation",
        "I am 60 odd years of age (from I will tell you the truth about this, I will tell you all about it)",
        "Ghazal"
      ],
      "W.B. Yeats": [
        "The Lake Isle of Innisfree",
        "September 1913",
        "The Wild Swans at Coole",
        "An Irish Airman Foresees his Death",
        "Easter 1916",
        "The Second Coming",
        "Sailing to Byzantium",
        "from Meditations in Time of Civil War: VI, The Stare's Nest by My Window",
        "In Memory of Eva Gore-Booth and Con Markiewicz",
        "Swift's Epitaph",
        "An Acre of Grass",
        "from Under Ben Bulben: V and VI",
        "Politics"
      ]
    }
  }
}
```

### 7.4 Poetry - Ordinary Level (2026)

```json
{
  "ol_poetry_2026": {
    "note": "36 poems total prescribed for Ordinary Level.",
    "poems": [
      { "poet": "Fleur Adcock", "title": "Advice to a Discarded Lover" },
      { "poet": "Elizabeth Bishop", "title": "The Prodigal" },
      { "poet": "Elizabeth Bishop", "title": "Filling Station" },
      { "poet": "Elizabeth Barrett Browning", "title": "How Do I Love Thee?" },
      { "poet": "Colette Bryce", "title": "Mammy Dozes" },
      { "poet": "Kate Clancy", "title": "Driving to the Hospital" },
      { "poet": "John Donne", "title": "The Flea" },
      { "poet": "John Donne", "title": "Song: Go, and catch a falling star" },
      { "poet": "Rita Dove", "title": "Summit Beach, 1921" },
      { "poet": "T.S. Eliot", "title": "Preludes" },
      { "poet": "T.S. Eliot", "title": "Aunt Helen" },
      { "poet": "Seamus Heaney", "title": "A Constable Calls" },
      { "poet": "Seamus Heaney", "title": "The Underground" },
      { "poet": "Seamus Heaney", "title": "A Call" },
      { "poet": "Colm Keegan", "title": "Memorial" },
      { "poet": "Paula Meehan", "title": "Buying Winkles" },
      { "poet": "Paula Meehan", "title": "Hearth Lesson" },
      { "poet": "Paula Meehan", "title": "Prayer for the Children of Longing" },
      { "poet": "Paul Muldoon", "title": "The Loaf" },
      { "poet": "Eilean Ni Chuilleanain", "title": "Street" },
      { "poet": "Eilean Ni Chuilleanain", "title": "To Niall Woods and Xenya Ostrovskaia, married in Dublin on 9 September 2009" },
      { "poet": "Naomi Shihab Nye", "title": "Kindness" },
      { "poet": "Mary Oliver", "title": "When I am Among the Trees" },
      { "poet": "Edgar Allan Poe", "title": "The Raven" },
      { "poet": "Percy Bysshe Shelley", "title": "Ozymandias" },
      { "poet": "Penelope Shuttle", "title": "Zoo Morning 16" },
      { "poet": "Tracy K. Smith", "title": "It's Not" },
      { "poet": "Tracy K. Smith", "title": "The Greatest Personal Privation" },
      { "poet": "Tracy K. Smith", "title": "The Searchers" },
      { "poet": "Jessica Traynor", "title": "The Artane Band" },
      { "poet": "William Carlos Williams", "title": "This is Just to Say" },
      { "poet": "James Wright", "title": "Lying in a Hammock at William Duffy's Farm in Pine Island, Minnesota" },
      { "poet": "W.B. Yeats", "title": "The Lake Isle of Innisfree" },
      { "poet": "W.B. Yeats", "title": "The Wild Swans at Coole" },
      { "poet": "W.B. Yeats", "title": "An Irish Airman Foresees his Death" },
      { "poet": "Benjamin Zephaniah", "title": "The Sun" }
    ]
  }
}
```

### 7.5 Exam Structure Reference

**Higher Level Paper II (where poetry and comparative appear):**

- Section I: The Single Text (50 marks)
- Section II: The Comparative Study (70 marks)
- Section III: Poetry (50 marks)

**Poetry question types (HL):**
- "Discuss the poetry of [poet] with reference to [theme/technique]"
- "Choose a poem by [poet] that [appeals to you / deals with a particular theme] and discuss..."
- "Write a personal response to the poetry of [poet]"

**Comparative question types (HL):**
- Questions will specify one of the three modes
- Students must discuss all three of their chosen texts
- The question will have a specific angle within the mode (e.g., for CC: "Compare the ways in which social class affects characters...")

---

## 8. Phased Build Plan

### Phase 1: Foundation (Build First)

- Next.js project setup with TypeScript and Tailwind
- Password gate (simple, single-user)
- Circular JSON data files (2026 complete, 2027 placeholder)
- Dashboard with quick action buttons
- Poet/poem/text selector dropdowns populated from circular data
- Claude API integration (streaming responses)
- Poetry note generator with the full structure from Section 4.1
- Export: copy to clipboard, download as Markdown

### Phase 2: Full Content Types

- Comparative note generator (Section 4.2)
- Worksheet/activity generator (Section 4.3)
- PowerPoint generator using pptxgenjs (Section 4.4)
- Word document export using docx-js
- PDF export
- 2027 circular data added

### Phase 3: Video Pipeline

- Script formatter (takes approved note, produces JSON script structure)
- Voicebox API integration (requires Voicebox running locally)
- Script preview and editing UI
- Remotion video composition (poem display, line highlighting, audio sync)
- Video rendering and MP4 export
- Video project management (save, resume, re-render)

### Phase 4: Polish and Workflow

- Content library (browse all previously generated content)
- Favourites/bookmarking system
- Template system (save custom generation instructions as reusable templates)
- Batch generation (generate notes for all poems by a poet in sequence)
- Quality flags (mark content as "reviewed", "needs checking", "approved")
- Search across generated content
- Web search integration for sourcing video material and external resources

---

## 9. Implementation Notes

### For Claude Code

- This document is the single source of truth for the project.
- Start with Phase 1. Do not skip ahead.
- All page sizes should be A4 (this is Ireland, not the US).
- Test exports in both Word and PDF to ensure formatting holds.
- The Claude API system prompt in Section 6 is a starting point. It should be refined based on output quality during testing.
- The circular JSON files should be stored in `/data/circulars/` within the project.
- Generated content should be stored in `/data/generated/` organised by type and date.
- Environment variables needed: `ANTHROPIC_API_KEY`, `APP_PASSWORD`, `VOICEBOX_URL` (default: http://localhost:8000)

### File Structure

```
lc-companion/
  /app                  - Next.js app router pages
    /api                - API routes for Claude calls, exports
    /poetry             - Poetry generation pages
    /comparative        - Comparative generation pages
    /worksheet          - Worksheet generation pages
    /slides             - Slide generation pages
    /video              - Video pipeline pages
    /settings           - Configuration page
  /components           - Shared React components
  /data
    /circulars          - JSON files for prescribed lists
    /generated          - Generated content storage
  /lib
    /claude             - Claude API client and prompt templates
    /export             - Export utilities (docx, pptx, pdf)
    /video              - Voicebox client, Remotion compositions
  /public               - Static assets, branding
  PRD.md                - This document
```

---

## 10. What "Done" Looks Like

### Phase 1 Complete When:

- User can log in with a password
- User can select a poet and poem from the 2026 prescribed list
- User can generate a poetry analysis note via Claude API
- The generated note follows all rules in Section 3
- The note follows the structure in Section 4.1
- The note can be exported as Markdown and copied to clipboard
- The generation streams in real time so the user sees progress
- The UI is clean, functional, and fast

### Phase 2 Complete When:

- All four content types (poetry, comparative, worksheet, slides) generate successfully
- Exports work in Word, PowerPoint, and PDF formats
- 2027 circular data is populated and selectable
- Comparative notes correctly use the mode structures for the selected year

### Phase 3 Complete When:

- User can select an approved poetry note and generate a video script
- User can edit the script before voice generation
- Voicebox generates audio for each script section
- Remotion assembles the video with correct line highlighting
- Final MP4 downloads successfully and plays correctly
- The full pipeline from "select note" to "download video" works end to end

---

## Appendix A: 2027 Changes Summary

For reference when the 2027 circular data is added:

**Poetry changes:**
- Rotating OUT: Eliot, Heaney, Ni Chuilleanain, Smith
- Rotating IN: Emily Dickinson, Patrick Kavanagh, Derek Mahon, Adrienne Rich
- Carrying OVER: Bishop, Donne, Meehan, Yeats

**Comparative mode change (HL):**
- Literary Genre is replaced by Theme or Issue

**New texts:**
- Othello available alongside Macbeth for Shakespeare
- The Great Gatsby appears as a single text option

**The 2027 circular (and eventually 2028) should be added to the JSON data files when available.**
