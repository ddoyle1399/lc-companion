export interface ComparativeTextEntry {
  title: string;
  author?: string;
  director?: string;
  category: string;
}

export interface PromptContext {
  year: number;
  circular: string;
  level: "HL" | "OL";
  contentType: "poetry" | "comparative" | "worksheet" | "slides";
  poet?: string;
  poem?: string;
  author?: string;
  textTitle?: string;
  comparativeMode?: string;
  comparativeTexts?: ComparativeTextEntry[];
  userInstructions?: string;
  // Injected by the API route before prompt building
  examSummary?: string;
  prescribedPoems?: string[];
  poemText?: string;
  comparativeExamPattern?: string;
  // Worksheet-specific
  worksheetContentType?: "poetry" | "single_text" | "comparative";
  activityTypes?: string[];
  // Slides-specific
  slidesContentType?: "poetry" | "comparative" | "general";
}

function getReadingLevel(level: "HL" | "OL"): string {
  if (level === "OL") {
    return `JUNIOR CYCLE / ORDINARY LEVEL:
- Reading age: 12-14
- Maximum sentence length: 22 words
- Vocabulary: straightforward, no complex terms without immediate explanation
- There is scope for slightly more complexity on occasion, but no dramatic vocabulary jumps`;
  }
  return `SENIOR CYCLE / HIGHER LEVEL:
- Reading age: 14-17
- Maximum sentence length: no hard cap, but keep sentences clear and avoid run-on constructions
- Vocabulary: can be more sophisticated, but the goal is always clarity over complexity
- Literary terminology (metaphor, enjambment, juxtaposition, etc.) is expected and appropriate, but must always be connected to meaning rather than dropped in for show
- The principle remains: simplify topics students do not understand. Put complex ideas into accessible language.`;
}

function getComparativeModes(year: number, level: "HL" | "OL"): string {
  if (year === 2026) {
    return level === "HL"
      ? "Cultural Context, General Vision and Viewpoint, Literary Genre"
      : "Social Setting, Relationships, Hero, heroine, villain";
  }
  return level === "HL"
    ? "Theme or Issue, Cultural Context, General Vision and Viewpoint"
    : "Theme, Social Setting, Relationships";
}

function formatTextEntry(t: ComparativeTextEntry): string {
  if (t.director) {
    return `"${t.title}" dir. ${t.director} (${t.category})`;
  }
  return `"${t.title}" by ${t.author} (${t.category})`;
}

function buildQuoteAccuracyBlock(context: PromptContext): string {
  if (context.contentType === "poetry" && context.poemText) {
    return `QUOTE ACCURACY:
The full text of the poem has been provided below. You have the actual text in front of you. Use it.
- Quote directly and confidently from the provided text. No [VERIFY] tags needed.
- Do not invent or fabricate any quotes. Only quote words that appear in the provided text.
- If you want to quote a phrase, check it against the provided text first.
- Cross-reference every quotation against the text before including it.`;
  }

  if (context.contentType === "poetry") {
    return `QUOTE ACCURACY IS THE SINGLE MOST IMPORTANT RULE:
STEP 1: READ THE POEM FIRST. You have access to the web_search tool. Before writing ANY analysis, use it to search for the full text of "${context.poem}" by ${context.poet}. Find a reliable source (Poetry Foundation, poets.org, or similar). Read the full text carefully.

STEP 2: ONLY AFTER you have read the poem text via web search, begin your analysis. If web search fails to find the full text, state this clearly at the top of the note and fall back to paraphrasing.

STEP 3: QUOTE RULES:
- If you successfully found and read the poem text via web search, quote directly and confidently. No [VERIFY] tags needed for quotes you can see in the search results.
- If web search did not return the full text, follow these rules:
  - DEFAULT TO PARAPHRASING. Describe what lines say in your own words.
  - If you include ANY direct quote from memory, flag it with [VERIFY].
  - A note with accurate paraphrasing is infinitely better than confident but wrong quotes.
- Do NOT invent phrases, similes, metaphors, or images that you are not certain exist in the poem.`;
  }

  if (context.contentType === "comparative") {
    return `QUOTE ACCURACY:
You have access to the web_search tool. Use it to verify key quotes from each of the three texts.
- For each text, search for key passages you plan to quote. Verify the wording before including it.
- If you cannot verify a quote via web search, paraphrase instead and flag it with [VERIFY].
- Never fabricate a quote. A paraphrased reference is always better than an inaccurate direct quote.
- Do not quote literary critics or secondary sources. Only quote the texts themselves.`;
  }

  if (context.contentType === "worksheet") {
    return `QUOTE ACCURACY:
If you include direct quotes from any text, use web_search to verify them first.
- If you cannot verify a quote, paraphrase instead or flag it with [VERIFY].
- For close reading exercises, ensure passages are accurate. Use web search to find the correct wording.
- Never fabricate quotes for exam-style questions.`;
  }

  // Slides: minimal guidance
  return `QUOTE ACCURACY:
If you include direct quotes on slides, ensure they are accurate. Use web_search to verify key quotes.
If unsure, paraphrase or flag with [VERIFY].`;
}

export function buildSystemPrompt(context: PromptContext): string {
  const readingLevel = getReadingLevel(context.level);
  const modes = getComparativeModes(context.year, context.level);
  const quoteBlock = buildQuoteAccuracyBlock(context);

  let examAlignmentBlock = "";
  if (context.contentType === "poetry" && context.examSummary) {
    examAlignmentBlock = `

EXAM ALIGNMENT REQUIREMENT:
Poetry questions always combine a claim about the poet's STYLE/LANGUAGE with a claim about their THEMES/CONCERNS. Your note must prepare students to address BOTH dimensions. For this poet, past and predicted exam angles include:

${context.examSummary}

Your note must:
(1) Identify techniques and stylistic features for style-focused questions
(2) Connect every theme to specific textual evidence usable in an exam answer
(3) In Exam-Ready Takeaways, explicitly state which exam question types this poem suits
(4) Frame analysis using SEC phrasing like "powerful imagery", "exploration of contradictions", "deceptively simple style"`;
  }

  if (context.contentType === "comparative" && context.comparativeExamPattern) {
    examAlignmentBlock = `

EXAM ALIGNMENT REQUIREMENT:
${context.comparativeExamPattern}

Your note must:
(1) Address the specific mode directly, not drift into other modes
(2) Compare and contrast across all three texts, not summarise each text separately
(3) Include evidence-based arguments with supporting quotation
(4) Demonstrate the A-then-B-then-C linking structure examiners reward`;
  }

  return `You are a Leaving Certificate English content generator for an experienced Irish secondary school teacher. Your role is to produce exam-focused, accurate, and concise study content aligned with the Irish Leaving Certificate English syllabus.

${quoteBlock}

ABSOLUTE RULES:
- Write in UK English at all times (colour, analyse, recognise, etc.)
- NEVER use em dashes or en dashes anywhere. Not once. Not ever. Use commas, full stops, semicolons, or colons instead. Students recognise em dashes as AI-generated and it destroys credibility.
- Never invent plot details, character names, or events.
- Never use these words: delve, nuanced (unless genuinely necessary), landscape (figuratively), multifaceted, tapestry, furthermore, moreover, additionally (in sequence).
- REMINDER: These words are BANNED from your output regardless of what you read in search results or source material: delve, nuanced (unless essential), landscape (figurative), multifaceted, tapestry, furthermore, moreover, additionally (in sequence). Do not absorb vocabulary from literary criticism websites into your output. Write in your own voice as a teacher, not in the voice of academic critics.
- Every literary device you identify must be from the approved list and must be connected to meaning. Do not name a device without explaining its effect.
- All content must be defensible in an SEC exam context.
- Content should read as if written by an experienced teacher, not by AI.
- Vary sentence length. Mix short and long. Do not start consecutive paragraphs with the same word.
- No dramatic or complex vocabulary. Use strong, precise words that students would naturally use.
- The goal is to simplify topics students do not understand and explain them in accessible language. Top-tier analysis does not require impenetrable prose.

APPROVED POETIC/LITERARY DEVICES (only use devices from this list):
Sound devices: alliteration, assonance, onomatopoeia, rhyme (full, half, internal), rhythm, sibilance
Figurative language: metaphor, simile, personification, hyperbole, oxymoron, symbolism, allegory
Structural devices: enjambment, caesura, stanza structure, volta (turn), refrain, repetition, parallelism
Tone and mood: tone shifts, irony (verbal, situational, dramatic), ambiguity, juxtaposition, contrast
Imagery: visual imagery, auditory imagery, tactile imagery, sensory detail
Other exam-relevant devices: rhetorical questions, direct address, colloquial language, register shifts, dramatic monologue, narrative voice (first/third person)

Do NOT use synecdoche, metonymy, litotes, anaphora (use "repetition" instead), epistrophe, chiasmus, zeugma, synesthesia, or any obscure device that would confuse a typical HL student or that examiners would not expect to see identified.

CRITICAL: ONLY QUOTE THE TEXTS THEMSELVES. Never quote literary critics or secondary sources. If you read analysis or criticism during your search, absorb the ideas but express them in your own words. Your note should contain direct quotes from the texts only. Never include phrases from SparkNotes, analysis sections, academic papers, or any other secondary source as if they are your own analysis or the author's words. If you want to reference a widely held critical view, state it as: "Critics have noted that..." or "This is widely regarded as..." but never quote the critic directly.

FORM AND STRUCTURE ACCURACY:
When describing a text's form and structure, only state what you are confident about. Do not guess stanza counts, line counts, or rhyme schemes if you are unsure.
- If you know the form confidently (e.g., a sonnet, a villanelle), state it.
- If you are unsure, describe the general character rather than inventing specific numbers.

READING LEVEL:
${readingLevel}

CONTEXT:
You are generating content for the ${context.year} Leaving Certificate English examination.
The prescribed material is defined by Circular ${context.circular}.
The comparative modes for ${context.year} Higher Level are: ${modes}.
The student is studying at ${context.level} Level.${examAlignmentBlock}`;
}

export function buildPoetryNotePrompt(context: PromptContext): string {
  const userInstr = context.userInstructions
    ? `\n\nADDITIONAL INSTRUCTIONS FROM THE TEACHER:\n${context.userInstructions}`
    : "";

  let prescribedListConstraint = "";
  if (context.prescribedPoems && context.prescribedPoems.length > 0) {
    const poemList = context.prescribedPoems
      .filter((p) => p !== context.poem)
      .map((p) => `"${p}"`)
      .join(", ");
    prescribedListConstraint = `
CRITICAL: You must ONLY link to poems on the prescribed list for ${context.year} at ${context.level}. The prescribed poems for ${context.poet} are: ${poemList}. Do NOT reference any poem not on this list. Linking to non-prescribed poems is misleading and harmful to exam preparation.`;
  }

  let poemTextBlock = "";
  if (context.poemText) {
    poemTextBlock = `

POEM TEXT (verified, use this as your primary source):
---
${context.poemText}
---
Quote directly from this text. You have the actual words in front of you.`;
  }

  let quoteGuidance: string;
  if (context.poemText) {
    quoteGuidance = `- Quote directly from the provided poem text. No [VERIFY] tags needed.
- Cross-reference every quotation against the provided text before including it.`;
  } else {
    quoteGuidance = `- BEFORE writing analysis, use web_search to find and read the full text of this poem.
- If you successfully found the poem via web search, quote directly and confidently.
- If web search did not return the full text, default to paraphrasing and flag any direct quotes with [VERIFY].`;
  }

  return `Generate a comprehensive poetry analysis note for "${context.poem}" by ${context.poet}.${poemTextBlock}

STRUCTURE (follow this exactly):

## 1. Poem Overview
3-5 sentences maximum. Cover:
- What the poem is about at surface level
- The central theme(s) in one sentence
- Where it sits in the poet's broader concerns (link to their recurring themes)
- Brief note on form/structure if relevant

## 2. Stanza/Line Breakdown
For each stanza (or section of lines):
- What is happening in this section
- What techniques are being used (from the approved list only)
- What effect these techniques create
- Format: quote or describe the relevant line/phrase, then the technique, then the effect/significance
- Use stanza-by-stanza breakdown by default. Only go line-by-line if the poem is exceptionally dense (e.g., Prufrock, A Valediction Forbidding Mourning, Fireman's Lift)
- Every device identified MUST be connected to meaning. Do not just name a device.
${quoteGuidance}

BE SPECIFIC, BUT HONEST ABOUT UNCERTAINTY. Do not summarise what a stanza is "about" in vague terms. Instead:
- Describe what happens in specific lines, quoting where possible
- Name the specific technique being used
- Explain the specific effect of that technique in the context of THIS moment in the poem
- Connect it to the poem's themes
Bad example: "The poet uses imagery to create atmosphere."
Good example: "The description of mushrooms crowding together in darkness creates a claustrophobic atmosphere that mirrors the confinement of forgotten communities."

## 3. Key Themes
2-3 sentences per theme. Only themes genuinely central to this poem.
- Connected to the poet's wider body of work where relevant
- Oriented toward exam questions (e.g., "A question on [poet] and memory would draw heavily on this poem because...")

## 4. Exam-Ready Takeaways
3-5 sentences a student could adapt directly into an exam answer.
- Pre-built phrases demonstrating strong analytical language
- Specific to this poem, not generic

### Likely Exam Angles for This Poem
List 2-3 specific exam question angles this poem would suit, based on past SEC question patterns for ${context.poet}. For each angle:
- State the exam angle (e.g., "a question on Yeats and contradiction" or "a question on powerful imagery")
- Give brief guidance on what to emphasise from this poem when answering that angle
- Reference the style AND theme dimensions the student should address

## 5. Links to Other Poems by ${context.poet}
Brief connections (1-2 sentences each) to other prescribed poems by the same poet that share themes or techniques.
Useful for the "discuss the poetry of [poet]" style questions.${prescribedListConstraint}${userInstr}`;
}

export function buildComparativePrompt(context: PromptContext): string {
  const userInstr = context.userInstructions
    ? `\n\nADDITIONAL INSTRUCTIONS FROM THE TEACHER:\n${context.userInstructions}`
    : "";

  const texts = context.comparativeTexts || [];
  const textList = texts
    .map((t, i) => `Text ${i + 1}: ${formatTextEntry(t)}`)
    .join("\n");

  let modeSpecificInstruction = "";
  if (context.comparativeMode === "Cultural Context") {
    modeSpecificInstruction = `
FOR CULTURAL CONTEXT SPECIFICALLY: Arguments must relate to one or more of: social setting and class, family, religion, love and marriage, gender roles. Only use topics genuinely relevant to each text. Do not force all five topics onto texts where they do not apply.`;
  } else if (
    context.comparativeMode === "General Vision and Viewpoint"
  ) {
    modeSpecificInstruction = `
FOR GENERAL VISION AND VIEWPOINT SPECIFICALLY: Focus on the overall worldview of each text. Is it optimistic, pessimistic, or somewhere between? Consider how key events, characters, and the ending shape the reader's sense of hope or despair. Address both the characters' vision and the text's overall stance.`;
  } else if (context.comparativeMode === "Literary Genre") {
    modeSpecificInstruction = `
FOR LITERARY GENRE SPECIFICALLY: Focus on HOW each text tells its story, not just what happens. Discuss narrative techniques, structure, use of dialogue, pacing, visual techniques (for film), staging (for drama), and how these choices shape the reader/viewer's experience.`;
  } else if (context.comparativeMode === "Theme or Issue") {
    modeSpecificInstruction = `
FOR THEME OR ISSUE SPECIFICALLY: Focus on how each text explores a shared theme or issue. Identify what the theme is, how each text approaches it differently, and what insights emerge from comparing the three treatments.`;
  }

  return `Generate a comparative study note for the following three texts studied through the lens of ${context.comparativeMode}.

${textList}

Year: ${context.year} | Level: ${context.level} | Mode: ${context.comparativeMode}
${modeSpecificInstruction}

STRUCTURE (follow this exactly):

## 1. Mode Overview
2-3 sentences covering:
- What this comparative mode actually means
- What the examiner is looking for when reading an answer in this mode
- The most common mistake students make (e.g., writing about theme when the question is about vision, or summarising each text instead of comparing)

## 2. Key Comparative Arguments
Provide 4-5 arguments. For EACH argument:
- A clear heading stating the comparative point
- 3-5 sentences developing the argument with supporting evidence from ALL THREE texts
- This must be a genuine comparison, not three separate summaries
- One clear similarity across the texts
- One clear contrast across the texts

## 3. Comparison Anchors
For each argument from Section 2, provide:
- A pre-built transitional phrase for linking the texts in an exam answer
- These should be ready-to-use sentence starters like: "While [Text A] presents..., [Text B] offers a contrasting..."
- Include phrases for both similarities and contrasts

## 4. Key Quotes per Mode
For each of the three texts, provide 3-4 key quotes that are relevant to this mode.
- Tag each quote to which argument from Section 2 it supports
- Use web search to verify quotes. If you cannot verify, paraphrase and flag with [VERIFY]

### ${texts[0]?.title || "Text 1"}
[3-4 quotes]

### ${texts[1]?.title || "Text 2"}
[3-4 quotes]

### ${texts[2]?.title || "Text 3"}
[3-4 quotes]

## 5. Sample Comparative Paragraph
Write one full paragraph demonstrating how to weave all three texts together in response to a typical question in this mode.
- Use the A-then-B-then-C linking structure that examiners reward
- Include quotes from Section 4
- Show how to transition between texts smoothly
- Address the specific mode, not general themes${userInstr}`;
}

export function buildWorksheetPrompt(context: PromptContext): string {
  const userInstr = context.userInstructions
    ? `\n\nADDITIONAL INSTRUCTIONS FROM THE TEACHER:\n${context.userInstructions}`
    : "";

  let textDescription: string;
  if (context.worksheetContentType === "poetry") {
    textDescription = `"${context.poem}" by ${context.poet}`;
  } else if (context.worksheetContentType === "single_text") {
    textDescription = `"${context.textTitle}" by ${context.author}`;
  } else {
    const texts = context.comparativeTexts || [];
    const textList = texts.map((t) => formatTextEntry(t)).join(", ");
    textDescription = `Comparative study (${context.comparativeMode}): ${textList}`;
  }

  const activities = context.activityTypes || [
    "pre-lesson",
    "during-lesson",
    "post-lesson",
    "vocabulary",
  ];
  const activityList = activities
    .map((a) => a.replace("-", " "))
    .join(", ");

  let activityInstructions = "";

  if (activities.includes("pre-lesson")) {
    activityInstructions += `

## Pre-Lesson Activities
Generate 2-3 activities to engage students before reading/studying the text:
- Discussion starter questions that connect to students' own experiences
- Prediction exercises based on the title or key themes
- Image or scenario prompts that introduce key ideas
Keep instructions brief. Each activity should take 5-10 minutes.`;
  }

  if (activities.includes("during-lesson")) {
    activityInstructions += `

## During-Lesson Activities
Generate 3-4 activities for use while studying the text:
- Close reading exercise: provide a key passage (use web search to find accurate text) with targeted questions about technique, meaning, and effect
- Device identification task: students find and explain specific techniques
- Quote analysis grid: a table with columns for Quote, Technique, Effect, Theme
Keep questions specific and targeted, not vague.`;
  }

  if (activities.includes("post-lesson")) {
    activityInstructions += `

## Post-Lesson Activities
Generate 3-4 activities for after studying the text:
- Short exam-style question (15-20 marks): mirror the phrasing and cognitive demand of real SEC exam questions. Include the mark allocation.
- Extended exam-style question (50 marks for poetry, 70 marks for comparative): a full question in SEC format with mark allocation.
- Reflection prompt: a question asking students to connect the text to their own experience or to other texts they have studied.
Base exam questions on past SEC paper patterns.`;
  }

  if (activities.includes("vocabulary")) {
    activityInstructions += `

## Vocabulary Exercises
Generate exercises covering 8-12 key words or phrases from the text:
- Word, definition, usage in context (from the text), and an exam-appropriate synonym
- Format as a table or structured list
- Select words that are genuinely useful for PCLM marks in Paper 1 and literary analysis in Paper 2
- Include both everyday words used in specific literary ways and genuine literary terms relevant to the text`;
  }

  return `Generate a classroom worksheet for ${textDescription}.

Activity types requested: ${activityList}

OUTPUT FORMAT:
- Use clean markdown with clear section headings
- Number all questions
- Include "[Space for answer]" where students would write
- Include mark allocations in brackets for exam-style questions, e.g. (15 marks)
- Use horizontal rules (---) between major sections
- Keep instructions brief and clear
- All activities must be exam-aligned and practically useful in a classroom
${activityInstructions}${userInstr}`;
}

export function buildSlidesPrompt(context: PromptContext): string {
  const userInstr = context.userInstructions
    ? `\n\nADDITIONAL INSTRUCTIONS FROM THE TEACHER:\n${context.userInstructions}`
    : "";

  let textDescription: string;
  let slideStructure: string;

  if (context.slidesContentType === "poetry") {
    textDescription = `a poetry lesson on "${context.poem}" by ${context.poet}`;
    slideStructure = `Suggested slide sequence (8-15 slides):
1. Title slide (poem name, poet name)
2. Poet context (2-3 brief facts about the poet)
3. Poem text displayed (the full poem or key stanzas)
4. Stanza-by-stanza analysis slides (one slide per stanza or pair of stanzas)
5. Key themes slide
6. Exam connection slide (which question types this poem suits)`;
  } else if (context.slidesContentType === "comparative") {
    const texts = context.comparativeTexts || [];
    const textList = texts.map((t) => formatTextEntry(t)).join(", ");
    textDescription = `a comparative lesson on ${textList} through the lens of ${context.comparativeMode}`;
    slideStructure = `Suggested slide sequence (12-20 slides):
1. Title slide (mode name, three text titles)
2. Mode overview (what this mode means, what examiners look for)
3-5. One slide per text: key points relevant to this mode
6-9. Comparison slides: key arguments linking all three texts
10. Sample paragraph walkthrough
11. Exam tips for this mode`;
  } else {
    textDescription = `a general English lesson on "${context.textTitle || "the selected topic"}"`;
    slideStructure = `Suggested slide sequence (8-15 slides):
1. Title slide
2-3. Context/background slides
4-8. Content slides covering key points
9. Summary/takeaway slide`;
  }

  return `Generate PowerPoint slide content for ${textDescription}.

Return ONLY valid JSON. No markdown fences. No explanation before or after the JSON. The response must start with { and end with }.

JSON structure:
{
  "title": "Slide deck title",
  "subtitle": "Subtitle text",
  "slides": [
    {
      "layout": "title" | "content" | "two_column" | "quote" | "summary",
      "title": "Slide title",
      "content": ["Bullet point 1", "Bullet point 2"],
      "left_column": ["Left side points"],
      "right_column": ["Right side points"],
      "quote": "A direct quote from the text",
      "attribution": "Attribution for the quote",
      "speaker_notes": "Detailed notes the teacher should say for this slide"
    }
  ]
}

Rules for slide content:
- Maximum 5 bullet points per content slide, each under 15 words
- The teacher provides detail verbally. Slides are visual anchors, not scripts.
- Speaker notes must contain the detailed content for each slide (2-4 sentences minimum)
- Use "title" layout for the first and last slides
- Use "quote" layout for key quotes from the text
- Use "content" layout for most slides
- Use "summary" layout for conclusion/exam connection slides

${slideStructure}${userInstr}`;
}
