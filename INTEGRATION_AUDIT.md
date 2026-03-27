# Integration Audit — LC Companion

**Purpose:** Document every content generation feature, all API endpoints, what would be needed to expose them to an external app, and the current output format relative to H1 Club content pages.

**Audit date:** 2026-03-27

---

## 1. Content Generation Features

### 1.1 Poetry Analysis Note

**What it generates:** A structured markdown document containing a poem overview, stanza-by-stanza breakdown with technique analysis, key themes, exam-ready takeaways, exam angles, and links to other prescribed poems by the same poet. Target length 2,000–3,000 words.

**Inputs required:**
- `year` — 2026 or 2027
- `level` — `"HL"` or `"OL"`
- `poet` — poet name (must match prescribed list for the given year/level)
- `poem` — poem title (must match prescribed list for the given poet)
- `userInstructions` — optional free-text instructions (focus area, class ability, etc.)

**Implicit inputs (resolved server-side):**
- Stored poem text from `/data/poems/` — if present, injected directly into the prompt. If absent, Claude uses the `web_search` tool to retrieve the poem text before analysing it.
- Exam pattern data from `/data/exam-patterns/` — past question types and predicted angles for the poet, injected into the system prompt.
- Prescribed poem list for the year/level — used to constrain cross-references in the note.

**Output format:** Raw markdown text, streamed as Server-Sent Events. The output is a multi-section markdown document using `## ` headings, `**bold**`, and prose paragraphs. No HTML is produced at this stage. The frontend accumulates the stream and displays it in a `<div>` with `whitespace-pre-wrap`. There is no markdown-to-HTML rendering in the browser; the text is displayed literally.

**Export formats available:**
- Copy to clipboard (raw markdown string)
- `.md` file download (raw markdown string)
- `.docx` file — the markdown is parsed server-side by the `docx` library and converted to a Word document with styled headings, body text, and a footer. A4 page size, Calibri 11pt.
- PDF — browser `window.print()` triggered client-side; layout controlled by `@media print` CSS.

**External services called:**
- Claude API (`claude-sonnet-4-20250514`, up to 16,000 output tokens)
- Claude `web_search_20250305` tool (max 3 uses, only when poem text is not stored locally)

---

### 1.2 Comparative Study Note

**What it generates:** A structured markdown document covering one comparative mode (Cultural Context, General Vision and Viewpoint, Literary Genre for 2026 HL; Theme or Issue replaces Literary Genre for 2027 HL). Contains mode overview, 4–5 comparative arguments across three texts, comparison anchor phrases, key quotes per text per mode, and a sample comparative paragraph.

**Inputs required:**
- `year`, `level`
- `comparativeMode` — one of the HL or OL mode strings for the given year
- `comparativeTexts` — array of exactly 3 objects: `{ title, author?, director?, category }` where category is `"novel"`, `"drama"`, or `"film"`

**Implicit inputs:** Comparative exam pattern data for the mode (past question angles).

**Output format:** Raw markdown, streamed as SSE. Same display and export pipeline as poetry notes.

**External services:** Claude API + `web_search_20250305` tool (max 5 uses, always enabled for this content type).

---

### 1.3 Single Text Study Note

**What it generates:** A comprehensive study note for a Paper 2 Section I single text (novel, play, or Shakespeare). Sections: text overview, character analysis (3–5 characters with quotes and arcs), themes (4–6 with exam sentences), key scenes (5–8), essay structure guide, quote bank (15–20 quotes organised by theme), and a sample paragraph.

**Inputs required:**
- `year`, `level`
- `author` — author name
- `textTitle` — text title
- `textType` — `"shakespeare"`, `"novel"`, or `"play"`

**Output format:** Raw markdown, streamed as SSE.

**External services:** Claude API + `web_search_20250305` tool (max 5 uses, always enabled).

---

### 1.4 Worksheet / Activity Pack

**What it generates:** A printable classroom worksheet for a poem, single text, comparative study, or skills topic. Activities are configurable from: pre-lesson, during-lesson, post-lesson, vocabulary. Skills-based types (unseen poetry, comprehension, composition) have fixed structures that override the activity type selection.

**Inputs required:**
- `year`, `level`
- `worksheetContentType` — `"poetry"`, `"single_text"`, `"comparative"`, `"unseen_poetry"`, `"comprehension"`, or `"composition"`
- Additional fields depending on content type: `poet`, `poem`, `author`, `textTitle`, `comparativeMode`, `comparativeTexts`, `compositionType`
- `activityTypes` — array of `"pre-lesson"`, `"during-lesson"`, `"post-lesson"`, `"vocabulary"` (ignored for skills types)

**Output format:** Raw markdown, streamed as SSE.

**External services:** Claude API + `web_search_20250305` tool (max 3 uses, always enabled).

---

### 1.5 PowerPoint Slides

**What it generates:** A PowerPoint deck as a `.pptx` file. Claude returns structured JSON (not markdown), which is then parsed and passed to `pptxgenjs` to produce the file client-side.

**Inputs required:**
- `year`, `level`
- `slidesContentType` — `"poetry"`, `"comparative"`, `"single_text"`, `"unseen_poetry"`, `"comprehension"`, `"composition"`, or `"general"`
- Additional fields depending on content type (same as worksheet above)

**Output format:** The `/api/generate` endpoint streams JSON text as SSE. The client accumulates this JSON string, parses it, and calls `exportToSlides()` client-side which triggers a `.pptx` download via `pptxgenjs`. The JSON structure is:

```json
{
  "title": "Deck title",
  "subtitle": "Subtitle",
  "slides": [
    {
      "layout": "title | content | two_column | quote | summary",
      "title": "Slide title",
      "content": ["bullet 1", "bullet 2"],
      "left_column": ["..."],
      "right_column": ["..."],
      "quote": "...",
      "attribution": "...",
      "speaker_notes": "Teacher notes for this slide"
    }
  ]
}
```

**External services:** Claude API + `web_search_20250305` tool (always enabled for slides).

**Note:** Slides are the only content type where the raw output from Claude is JSON, not markdown. If the slides output is displayed in the browser before export (it currently is, via `whitespace-pre-wrap`), the user sees raw JSON. The export step converts this to `.pptx`.

---

### 1.6 Unseen Poetry Skills Guide

**What it generates:** A skills-based guide (not tied to any specific poem) covering: step-by-step approach, core technique reference (15–20 devices with definitions and template sentences), response structure template, common question patterns, a worked example using a public domain poem, and PCLM marking criteria guidance. Worth 50 marks on Paper 2.

**Inputs required:**
- `year`, `level` (no poet/poem — this is skills-based)

**Output format:** Raw markdown, streamed as SSE.

**External services:** Claude API only. Web search is disabled for this content type.

---

### 1.7 Comprehension Strategy Guide

**What it generates:** A Paper 1 skills guide covering Question A (comprehension strategy, question type breakdowns, language analysis toolkit) and/or Question B (functional writing formats: letter, speech, article, blog post, report). Configurable to produce one section or both.

**Inputs required:**
- `year`, `level`
- `focusArea` — `"question_a"`, `"question_b"`, or `"both"` (defaults to `"both"`)

**Output format:** Raw markdown, streamed as SSE.

**External services:** Claude API only. Web search disabled.

---

### 1.8 Composition Guide

**What it generates:** A Paper 1 composition technique guide (100-mark question) for a specific composition type. Covers PCLM criteria applied to the type, structure templates, opening strategies, strong examples, and common mistakes.

**Inputs required:**
- `year`, `level`
- `compositionType` — `"personal_essay"`, `"short_story"`, `"speech"`, `"discursive"`, `"feature_article"`, or `"descriptive"`

**Output format:** Raw markdown, streamed as SSE.

**External services:** Claude API only. Web search disabled.

---

### 1.9 Video Script Generation

**What it generates:** A structured JSON video script derived from an existing poetry note. The script is an array of typed sections (intro, stanza analysis, themes, exam connection, outro) each containing spoken text, line highlight indices, estimated duration, and metadata for the visual layer (key quotes, techniques, themes, DALL-E image prompts).

**Inputs required:**
- `poet`, `poem`, `poemText` (full text of the poem, line-separated)
- `poetryNote` — a completed poetry analysis note (output of feature 1.1)
- `year`, `level`

**Output format:** JSON (non-streaming). The `VideoScript` object:

```typescript
{
  poemTitle: string;
  poet: string;
  totalEstimatedDuration: number; // seconds
  sections: ScriptSection[];
  warnings?: ScriptWarning[]; // hallucination flags
}
```

Each `ScriptSection`:
```typescript
{
  id: string;
  type: "intro" | "stanza_analysis" | "theme" | "exam_connection" | "outro";
  spokenText: string;
  highlightLines: number[];      // 1-based poem line indices
  estimatedDuration: number;     // seconds
  imagePrompt?: string;          // DALL-E prompt for background
  keyQuote?: { text: string; lineIndex: number };
  techniques?: { name: string; quote: string; effect: string }[];
  themes?: { name: string; supportingPoints: string[]; quote?: string }[];
  examConnection?: { questionTypes: string[]; linkedPoems: string[]; examTip: string };
  outroData?: { closingLine: string; poemTitle: string; poetName: string };
}
```

**External services:** Claude API (`claude-sonnet-4-20250514`, 16,000 tokens, no web search). Up to 2 attempts with JSON repair and retry logic.

---

### 1.10 Full Video Rendering Pipeline

**What it generates:** An MP4 video file (1920×1080, h264, 30fps) of a poem analysis. The video shows poem text on screen with lines highlighted per section, narrated by the owner's ElevenLabs cloned voice, with DALL-E 3 watercolour background images and H1 Club branding. Saved to `/data/videos/` with a metadata JSON sidecar.

**Inputs required:**
- `poet`, `poem`, `poemText`, `year`, `level`
- `poetryNote` — optional; generated automatically if not provided
- `script` — optional `VideoScript` object; if provided, skips note and script generation and goes straight to audio + render

**Pipeline stages (streaming SSE):**
1. If no `poetryNote`: generates one via Claude (feature 1.1)
2. If no `script`: generates one via Claude (feature 1.9) — **pipeline pauses here** so the user can review the script before audio is generated
3. Audio generation: one ElevenLabs MP3 per script section
4. Image generation: one DALL-E 3 image per section (watercolour style, 1792×1024)
5. Remotion render: bundles composition, renders MP4, saves to `/data/videos/`

**Output format:** SSE progress stream during rendering; final `videoUrl` in the `complete` event pointing to `/api/video/download?file=...`. The `.mp4` file persists in `/data/videos/`.

**Copyright handling:** `getCopyrightMode(poet)` (from `src/data/poets.config.ts`) is called before rendering. Returns `'public_domain'` or `'rights_managed'`. Rights-managed mode switches the Remotion `PoemDisplay` component to `PoemDisplayRightsManaged`, which limits consecutive visible lines to three and makes poem text secondary to analysis text overlays.

**External services:**
- Claude API (if generating note or script)
- ElevenLabs TTS (`eleven_multilingual_v2`, `ELEVENLABS_VOICE_ID` env var)
- OpenAI DALL-E 3 (optional; falls back to solid colour backgrounds if `OPENAI_API_KEY` absent or invalid)
- Remotion renderer (local, requires pre-built bundle at `.remotion-bundle/`)

**Fallbacks:**
- No ElevenLabs key: silent mode, uses estimated durations
- No OpenAI key: solid colour backgrounds, rendering continues
- Individual audio section failure: that section renders silently

---

## 2. All API Endpoints

### Authentication

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/auth` | Login: validates `{ password }` against `APP_PASSWORD` env var, sets httpOnly session cookie |
| `DELETE` | `/api/auth` | Logout: clears session cookie |

The session cookie (`lc-companion-session`) is a base64-encoded string of `"authenticated:{timestamp}"`. All routes except `/login` and `/api/auth` are protected by `middleware.ts`.

---

### Content Generation

| Method | Route | Content-Type | Purpose |
|--------|-------|--------------|---------|
| `POST` | `/api/generate` | `text/event-stream` | Master generation endpoint — handles all 8 content types via the `contentType` field. Streams SSE. |

**Request body (common fields):**
```json
{
  "year": 2026,
  "circular": "0016/2024",
  "level": "HL",
  "contentType": "poetry | comparative | worksheet | slides | single_text | unseen_poetry | comprehension | composition",
  "userInstructions": "optional"
}
```

**Additional fields by content type:**

| contentType | Required additional fields |
|-------------|---------------------------|
| `poetry` | `poet`, `poem` |
| `comparative` | `comparativeMode`, `comparativeTexts` (array of 3) |
| `worksheet` | `worksheetContentType`, `activityTypes`, plus content-type-specific fields |
| `slides` | `slidesContentType`, plus content-type-specific fields |
| `single_text` | `author`, `textTitle`, `textType` |
| `unseen_poetry` | none |
| `comprehension` | `focusArea` (optional, defaults to `"both"`) |
| `composition` | `compositionType` |

**SSE event format:**
```
data: { "text": "..." }       — content chunk
data: { "status": "searching" } — web search in progress
data: [DONE]                  — stream complete
data: { "error": "..." }      — error during stream
```

---

### Poem Text Storage

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/poems?poet=...&poem=...` | Retrieve stored poem text (or null if not stored) |
| `GET` | `/api/poems?batch=true&poems=[...]` | Batch status check for multiple poems |
| `POST` | `/api/poems` | Save poem text: `{ poet, poem, text }` |
| `DELETE` | `/api/poems?poet=...&poem=...` | Delete stored poem text |

Poem texts are stored as flat `.txt` files in `/data/poems/` with a `{poet}--{poem}` naming convention (lowercased, alphanumeric and hyphens only).

---

### Video Pipeline

| Method | Route | Content-Type | Purpose |
|--------|-------|--------------|---------|
| `POST` | `/api/video/script` | `application/json` | Generate video script from poetry note. Returns `{ script: VideoScript, warnings: [] }`. |
| `POST` | `/api/video/render` | `text/event-stream` | Full video pipeline (note → script → audio → images → render). Streams SSE progress events. Pauses after script generation for user review. |
| `GET` | `/api/video/download?file=...` | `video/mp4` | Download a generated video file. Validates filename to prevent path traversal. |
| `GET` | `/api/video/library` | `application/json` | List all generated videos with metadata. |
| `DELETE` | `/api/video/library?file=...` | `application/json` | Delete a video and its metadata JSON sidecar. |

---

## 3. Exposing Generation Features as an Internal API

The following documents what would be required to allow an external app (e.g., an H1 Club platform) to call each generation feature directly, without going through the browser UI.

### 3.1 What Already Works

The `/api/generate` endpoint is structurally ready to be called from an external service. It accepts a JSON POST body, streams SSE, requires no browser context, and has no CSRF protection. The main blocker is the session-cookie authentication — an external app cannot obtain the cookie via a browser login flow.

### 3.2 Authentication

**Current mechanism:** httpOnly session cookie set by `POST /api/auth`. A browser client logs in and the cookie is sent on subsequent requests automatically by the browser.

**What an external app needs:** A machine-to-machine auth mechanism. Options:

1. **Shared secret header** — Add an `X-Internal-API-Key` header check to protected routes. The external app sends this header. The key is stored in an env var (`INTERNAL_API_KEY`). This is the simplest approach for a private tool.
2. **Bearer token** — Same principle but uses `Authorization: Bearer {token}` convention.
3. **Bypass middleware for specific routes** — Add an `/api/internal/*` prefix that uses a different auth check in `middleware.ts`.

No session cookies or browser login flow would be needed.

### 3.3 Consuming the SSE Stream

The `/api/generate` endpoint streams Server-Sent Events. An external Node.js or server-side app must consume this as a stream. This is straightforward with the `EventSource` API (browser) or a streaming `fetch` with manual SSE parsing (server-side). The stream ends with `data: [DONE]`. The accumulated `text` chunks form the complete note.

If an external app needs the complete text synchronously (not streamed), two options:
1. Consume the stream and wait for `[DONE]` before returning the full text.
2. Add a non-streaming version of the endpoint (POST to `/api/generate/sync`) that collects the full Claude response and returns it in one JSON body. This would require Claude API calls that do not use `messages.stream()` — the non-streaming `messages.create()` call already exists in `lib/video/script-formatter.ts` and `app/api/video/render/route.ts` as a reference.

### 3.4 Output Format Transformation

The current output is raw markdown. An H1 Club platform almost certainly expects structured HTML or a specific content schema. This transformation step does not exist yet. It would need to be built as one of:

- A markdown-to-HTML conversion at the API layer (e.g., using `marked` or `remark`) before returning the response
- A post-processing step in the external app
- A dedicated `/api/generate/html` endpoint variant that converts the output before streaming

The slides content type is an exception — it already returns structured JSON, which could be adapted to other structured formats relatively easily.

### 3.5 Per-Feature Readiness Summary

| Feature | Streaming | Auth blocker | Output needs transform | Notes |
|---------|-----------|--------------|------------------------|-------|
| Poetry note | Yes (SSE) | Yes | Markdown → HTML/schema | Web search needs poem lookup |
| Comparative note | Yes (SSE) | Yes | Markdown → HTML/schema | |
| Single text note | Yes (SSE) | Yes | Markdown → HTML/schema | |
| Worksheet | Yes (SSE) | Yes | Markdown → HTML/schema | |
| Slides | Yes (SSE) | Yes | JSON → pptx or HTML | Already structured JSON |
| Unseen poetry guide | Yes (SSE) | Yes | Markdown → HTML/schema | No poem dependency |
| Comprehension guide | Yes (SSE) | Yes | Markdown → HTML/schema | No poem dependency |
| Composition guide | Yes (SSE) | Yes | Markdown → HTML/schema | No poem dependency |
| Video script | No (JSON) | Yes | Already structured JSON | Depends on poetry note |
| Video render | Yes (SSE) | Yes | N/A — produces MP4 | Requires Remotion bundle |

### 3.6 Minimum Changes Required

To expose any generation feature to an external app:

1. **Add an internal API key check** to `middleware.ts` or directly in `/api/generate/route.ts`. If `X-Internal-API-Key` matches `process.env.INTERNAL_API_KEY`, bypass cookie auth.
2. **Add a non-streaming variant** or document the SSE consumption pattern for the external app.
3. **Add a markdown-to-HTML post-processing step** if the external app requires HTML rather than markdown.
4. **CORS headers** — if the external app is on a different origin and calls from a browser, add `Access-Control-Allow-Origin` headers for the trusted domain. If server-to-server only, CORS is not relevant.

Nothing in the content generation logic itself needs to change. The prompt system, circular data, exam patterns, and Claude integration are all reusable as-is.

---

## 4. Current Output Format vs. H1 Club Content Page Format

### What the Current Output Looks Like

All content types except slides produce **raw markdown text**. Specifically:

- The Claude API streams plain text containing markdown syntax (`## ` headings, `**bold**`, bullet lists, prose paragraphs)
- The frontend accumulates this text and renders it inside a `<div className="px-5 py-4 prose max-w-none text-sm leading-relaxed whitespace-pre-wrap">`
- The `whitespace-pre-wrap` class means the text is displayed literally — the markdown syntax characters are visible to the user. The headings appear as `## 1. Poem Overview`, not as rendered `<h2>` elements. The `prose` Tailwind class is present but does not take effect without a markdown parser rendering HTML first.
- **In short: the output is a raw text document, not rendered HTML.**

The poetry note follows this section structure:
```
## 1. Poem Overview
[prose]

## 2. Stanza/Line Breakdown
[per-stanza prose with Plain Meaning / Technique Analysis / Deeper Insight sub-blocks]

## 3. Key Themes
[per-theme prose]

## 4. Exam-Ready Takeaways
[bullet points or prose]
### Likely Exam Angles for This Poem
[bullet points]

## 5. Links to Other Poems by [Poet]
[bullet points]
```

### What the H1 Club Format Is

The H1 Club content format is **not defined anywhere in this codebase**. CLAUDE.md describes Output 3 (H1 Club Content) as explicitly "Parked: Same quality and substance as Output 1, reformatted to the H1 Club's existing content structure. The specific format will be defined later. Do not build this yet."

The only H1 Club references in the code are branding strings (`"The H1 Club"`, `"theh1club.ie"`) embedded in the Remotion video composition components (title cards, closing cards, watermark overlays in `TitleCard.tsx`, `ClosingCard.tsx`, `IntroFrame.tsx`, `OutroFrame.tsx`, `StanzaDisplay.tsx`, `ExamFrame.tsx`, `ThemeFrame.tsx`, `ThemeFrame.tsx`). These are visual branding elements on the video, not a content schema.

### Compatibility Assessment

**The current output does not match any defined H1 Club content format because no such format exists in this codebase.** There is no H1 Club content page template, no schema, and no component that consumes the generated notes in an H1 Club structure.

The gap that would need to be bridged when Output 3 is built:

1. The H1 Club content page format needs to be defined (what HTML structure, what sections, what component layout)
2. Either the prompts need to be modified to output content structured for that format, or a post-generation transformation step needs to convert the existing markdown note into the target HTML/schema
3. The current section structure of poetry notes (Overview → Stanza Breakdown → Themes → Exam Takeaways → Links) is reasonable and could map to a web content layout, but the H1 Club platform's design and component structure would dictate whether a direct mapping is feasible or a reformatting prompt is needed

---

## 5. Summary of External Service Dependencies

| Service | Required for | Auth mechanism | Fallback exists |
|---------|-------------|----------------|----------------|
| Anthropic Claude API | All content generation | `ANTHROPIC_API_KEY` env var | None — all generation fails without it |
| ElevenLabs TTS | Video audio | `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID` env vars | Yes — silent mode with estimated durations |
| OpenAI DALL-E 3 | Video background images | `OPENAI_API_KEY` env var | Yes — solid colour backgrounds |
| Remotion renderer | Video MP4 output | Local process, no external auth | None — video render fails without it |
| Claude `web_search_20250305` | Poetry/comparative/single text accuracy | Included in Claude API access | Yes — falls back to paraphrasing |

---

*End of audit. No code was changed.*
