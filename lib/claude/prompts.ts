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
  contentType: "poetry" | "comparative" | "worksheet" | "slides" | "single_text" | "unseen_poetry" | "comprehension" | "composition";
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
  worksheetContentType?: "poetry" | "single_text" | "comparative" | "unseen_poetry" | "comprehension" | "composition";
  activityTypes?: string[];
  // Slides-specific
  slidesContentType?: "poetry" | "comparative" | "general" | "single_text" | "unseen_poetry" | "comprehension" | "composition";
  // Single text-specific
  textType?: "shakespeare" | "novel" | "play";
  // Comprehension-specific
  focusArea?: "question_a" | "question_b" | "both";
  // Composition-specific
  compositionType?: "personal_essay" | "short_story" | "speech" | "discursive" | "feature_article" | "descriptive";
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

  if (context.contentType === "single_text") {
    return `QUOTE ACCURACY IS CRITICAL FOR SINGLE TEXT NOTES:
You have access to the web_search tool. Before writing your analysis, use it to search for key quotes from "${context.textTitle}" by ${context.author}.
- Search for character quotes, pivotal scenes, and thematic passages.
- Only quote words you have verified via web search. No inventing quotes.
- If you cannot verify a quote, paraphrase the passage and flag with [VERIFY].
- A note with accurate paraphrasing is better than confident but wrong quotes.
- Do not quote literary critics or secondary sources. Only quote the text itself.`;
  }

  if (context.contentType === "unseen_poetry" || context.contentType === "comprehension" || context.contentType === "composition") {
    return `QUOTE ACCURACY:
This is a skills-based guide. If you include example quotes from texts, ensure they are accurate or clearly labelled as illustrative examples.
- For practice exercises using public domain poems, verify the poem text via web search if needed.
- Do not fabricate quotes from any specific text.`;
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

  if (context.contentType === "single_text") {
    examAlignmentBlock = `

EXAM ALIGNMENT REQUIREMENT:
This is a Paper 2, Section I text (60 marks). The single text question asks students to engage personally and critically with the text. Questions typically ask students to discuss a theme, a character, a key moment, or the text's overall impact.

Your note must:
(1) Prepare students for character-focused, theme-focused, and moment-focused questions
(2) Provide quotes that can be deployed flexibly across different question angles
(3) Show students how to structure a 60-mark essay with proper paragraph development
(4) Connect analysis to the specific marking criteria: clarity of argument, use of evidence, personal response`;
  }

  if (context.contentType === "unseen_poetry") {
    examAlignmentBlock = `

EXAM ALIGNMENT REQUIREMENT:
This is a Paper 2, Section III skills guide. The unseen poetry question (50 marks) asks students to respond to a poem they have never seen before. The examiner rewards students who can identify techniques, quote accurately from the given poem, explain effects, and offer genuine personal response.

Your guide must:
(1) Teach a repeatable method that works for any poem
(2) Focus on the techniques that actually appear in exam poems (imagery, tone, structure, sound)
(3) Show students how to write about technique with precision, not vagueness
(4) Emphasise personal response as a genuine component of the mark, not an afterthought`;
  }

  if (context.contentType === "comprehension") {
    examAlignmentBlock = `

EXAM ALIGNMENT REQUIREMENT:
This is a Paper 1, Section I skills guide. Question A (comprehension, 50 marks) tests the student's ability to read, understand, and analyse unseen texts. Question B (functional writing, 50 marks) tests the student's ability to write in a specific format and register.

Your guide must:
(1) Teach students to decode what each question type is actually asking
(2) Show how to use evidence from the passage without over-quoting or under-quoting
(3) For Question B, emphasise format conventions and register as much as content
(4) Connect all advice to the PCLM marking criteria used by examiners`;
  }

  if (context.contentType === "composition") {
    examAlignmentBlock = `

EXAM ALIGNMENT REQUIREMENT:
This is a Paper 1, Section II composition (100 marks, the highest-value question on either paper). Assessed on PCLM: Purpose (P), Coherence (C), Language (L), Mechanics (M). Each criterion is marked on a scale.

Your guide must:
(1) Make PCLM concrete and actionable for this specific composition type
(2) Show students what distinguishes a 70-mark composition from a 90-mark composition
(3) Provide openings and structures that demonstrate clear purpose from the first line
(4) Emphasise that Language marks come from precision and variety, not from big words`;
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

TARGET LENGTH: 2000-3000 words total. The stanza analysis sections should make up approximately 60% of the note. The extra length comes from fuller stanza analysis, not padding. Do not pad other sections.

STRUCTURE (follow this exactly):

## 1. Poem Overview
3-5 sentences maximum. Cover:
- What the poem is about at surface level
- The central theme(s) in one sentence
- Where it sits in the poet's broader concerns (link to their recurring themes)
- Brief note on form/structure if relevant

## 2. Stanza/Line Breakdown
Every stanza in the poem must receive its own analysis section. Do not skip or combine stanzas unless they are genuinely a single unit of meaning. The stanza analysis is the most important part of this note. Students spend 80% of their study time here. It must be thorough.

Use stanza-by-stanza breakdown by default. Only go line-by-line if the poem is exceptionally dense (e.g., Prufrock, A Valediction Forbidding Mourning, Fireman's Lift).

For each stanza, include ALL FOUR of the following (target 200-250 words per stanza):

**Plain Meaning (2-3 sentences):** Start by explaining what is literally happening in this stanza in simple, clear language. What is the speaker saying or doing? What situation are we in? Do not assume the student already understands the poem. Write as if explaining to someone reading it for the very first time.

**Technique Analysis (3-4 sentences):** Identify 2-3 poetic techniques from the approved LC list. For each: name the technique, quote the specific words that show it, and explain the effect it creates. Use only approved devices (imagery, metaphor, simile, personification, alliteration, assonance, onomatopoeia, enjambment, caesura, rhyme, repetition, contrast, symbolism, tone shifts, juxtaposition, direct address). Never name a technique without explaining what it does and why it matters.

**Deeper Insight (2-3 sentences):** Go beyond identifying techniques. Explain what makes this stanza significant in the context of the whole poem. How does it develop the poem's themes? How does it shift the tone or mood? What would an examiner specifically reward a student for noticing? Give the student something original and perceptive that will stand out from generic answers.

**Exam-Ready Sentence (1 sentence):** One polished analytical sentence the student could adapt directly into an exam essay. Combine a technique, a quote, and an insight about effect or meaning. This should model how to write about poetry at a high level.

${quoteGuidance}

NEVER summarise what a stanza is "about" in vague terms. Be specific.
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
  } else if (context.worksheetContentType === "unseen_poetry") {
    textDescription = `unseen poetry skills (${context.level} level, ${context.year})`;
  } else if (context.worksheetContentType === "comprehension") {
    textDescription = `Paper 1 comprehension skills (${context.level} level, ${context.year})`;
  } else if (context.worksheetContentType === "composition") {
    const typeLabels: Record<string, string> = {
      personal_essay: "Personal Essay", short_story: "Short Story", speech: "Speech",
      discursive: "Discursive Essay", feature_article: "Feature Article", descriptive: "Descriptive Essay",
    };
    const compType = typeLabels[context.compositionType || "personal_essay"] || "Personal Essay";
    textDescription = `Paper 1 composition: ${compType} (${context.level} level, ${context.year})`;
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

  // For skills-based content types, override with specific exercise structures
  let skillsOverride = "";
  if (context.worksheetContentType === "unseen_poetry") {
    skillsOverride = `

UNSEEN POETRY WORKSHEET STRUCTURE (use this instead of the activity types above):

## Technique Identification Exercises
5 exercises. For each, provide a line or short passage from a public domain poem and ask the student to:
1. Name the technique used
2. Quote the specific words that demonstrate the technique
3. Explain the effect the technique creates

## Quote Analysis Exercises
3 exercises. For each, provide a quote from a public domain poem and ask the student to write a paragraph (5-7 sentences) analysing the quote, identifying techniques, and explaining their effect.

## Full Unseen Poem Response
Provide a short public domain poem (8-16 lines) the student has not studied. Include:
- The poem text
- An exam-style question (50 marks)
- Space for the student's response
- A brief marking guide for the teacher`;
  }

  if (context.worksheetContentType === "comprehension") {
    skillsOverride = `

COMPREHENSION WORKSHEET STRUCTURE (use this instead of the activity types above):

## Question A Practice
Provide a short non-fiction passage (200-300 words, invented but realistic) and generate:
1. A "main ideas" question (10 marks)
2. A "language analysis" question (15 marks)
3. A "personal response" question (15 marks)
Include mark allocations and brief marking guidance for the teacher.

## Question B Practice
Based on the passage above, generate:
1. A functional writing task (speech, article, letter, blog post, or report) (50 marks)
2. Include the specific format, audience, and word count expectations
3. Include a brief marking guide referencing PCLM criteria`;
  }

  if (context.worksheetContentType === "composition") {
    skillsOverride = `

COMPOSITION WORKSHEET STRUCTURE (use this instead of the activity types above):

## Planning Exercise
Provide a composition title and ask the student to:
1. Write a 5-point plan (beginning, 3 middle points, ending)
2. Draft their opening paragraph (100 words)
3. List 5 strong vocabulary words they intend to use

## Opening Paragraph Practice
Provide 3 different composition titles. For each, the student writes an opening paragraph (80-100 words) using a different opening strategy (anecdote, question, vivid description).

## Peer Review Checklist
A structured checklist the student uses to review a classmate's composition:
- Does the opening grab attention?
- Is there a clear sense of purpose?
- Does each paragraph flow to the next?
- Are sentences varied in length?
- Are there any cliches or vague language?
- Is the ending effective?
- 3 things that work well / 2 things to improve`;
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
${skillsOverride || activityInstructions}${userInstr}`;
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
  } else if (context.slidesContentType === "single_text") {
    textDescription = `a single text lesson on "${context.textTitle}" by ${context.author}`;
    slideStructure = `Suggested slide sequence (10 slides):
1. Title slide (text name, author, exam year)
2-4. Character profiles (one per slide: key traits, role, and 1-2 key quotes)
5-7. Key themes (one per slide: how theme manifests, supporting evidence)
8. Essay structure guide (how to structure a 60-mark answer)
9. Key quotes summary (organised by theme)
10. Exam tips (what examiners reward, common mistakes)`;
  } else if (context.slidesContentType === "unseen_poetry") {
    textDescription = `an unseen poetry skills lesson`;
    slideStructure = `Suggested slide sequence (10 slides):
1. Title slide
2-3. The 4-step approach to unseen poetry (first read, second read, plan, write)
4-5. Sound devices with examples (alliteration, assonance, onomatopoeia, rhyme, sibilance)
6-7. Imagery and figurative language with examples (metaphor, simile, personification, symbolism)
8. Structural devices with examples (enjambment, caesura, repetition)
9. Response structure template (opening, body paragraphs, closing)
10. Common mistakes and exam tips`;
  } else if (context.slidesContentType === "comprehension") {
    textDescription = `a Paper 1 comprehension skills lesson`;
    slideStructure = `Suggested slide sequence (10 slides):
1. Title slide
2. Overview: Question A vs Question B (marks, time, approach)
3-5. Question A types: what each question type asks and how to approach it
6. Language analysis toolkit: key techniques to identify in prose
7-8. Question B formats: letter, speech, article, report, review (format and tone)
9. Sample response walkthrough
10. PCLM marking criteria and exam tips`;
  } else if (context.slidesContentType === "composition") {
    const typeLabels: Record<string, string> = {
      personal_essay: "Personal Essay", short_story: "Short Story", speech: "Speech",
      discursive: "Discursive Essay", feature_article: "Feature Article", descriptive: "Descriptive Essay",
    };
    const compType = typeLabels[context.compositionType || "personal_essay"] || "Personal Essay";
    textDescription = `a ${compType} writing skills lesson`;
    slideStructure = `Suggested slide sequence (10 slides):
1. Title slide (${compType})
2. Format overview: what examiners expect from a ${compType}
3-4. Structure template: opening strategies, middle development, closing
5. PCLM breakdown: what each criterion means for a ${compType}
6-7. Opening examples: 2-3 strong openings with explanation
8. Language tips: vocabulary, sentence variety, common errors
9. Common mistakes to avoid
10. Summary and exam tips`;
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

export function buildSingleTextPrompt(context: PromptContext): string {
  const userInstr = context.userInstructions
    ? `\n\nADDITIONAL INSTRUCTIONS FROM THE TEACHER:\n${context.userInstructions}`
    : "";

  const textTypeLabel =
    context.textType === "shakespeare"
      ? "Shakespeare play"
      : context.textType === "play"
        ? "play"
        : "novel";

  return `Generate a comprehensive single text study note for "${context.textTitle}" by ${context.author} (${textTypeLabel}).

This is a Paper 2, Section I text worth 60 marks at ${context.level} level for the ${context.year} examination.

IMPORTANT: Use web_search to find and verify key quotes from this text before writing. Search for key passages, character quotes, and pivotal scenes. Only quote words you have verified. If you cannot verify a quote, paraphrase instead and flag with [VERIFY].

STRUCTURE (follow this exactly):

## 1. Text Overview
100-150 words. Cover:
- What the text is about in plain language
- Setting and time period
- Central conflict or driving force of the narrative
- No hedging or spoiler avoidance. Students need the full picture.

## 2. Character Analysis
For each major character (3-5 characters depending on the text), write 150-200 words covering:
- Their role in the text
- Key character traits with supporting quotes
- Character arc: how they change from beginning to end
- Examiner focus: what questions tend to ask about this character
- 3-4 key quotes with act/scene/page references where applicable

Format each character as a ### subheading.

## 3. Themes
For each major theme (4-6 themes), write 150-200 words covering:
- How the theme manifests in the text with specific examples
- Key quotes that support this theme
- How this theme connects to exam question patterns
- A one-sentence "exam sentence" the student could use directly in an essay

Format each theme as a ### subheading.

## 4. Key Scenes and Moments
For each pivotal moment (5-8 scenes), write 100-150 words covering:
- What happens in the scene
- Why it matters to the text as a whole
- Key quotes from the scene
- Which themes it connects to

Format each scene as a ### subheading.

## 5. Essay Structure Guide
200-300 words on how to structure a 60-mark single text essay:
- How to open (not "In this essay I will...")
- How to build paragraphs: point, quote, explain, link to question
- How to close effectively
- Common mistakes to avoid
- What the examiner specifically rewards in single text answers

## 6. Quote Bank
15-20 essential quotes organised by theme.
For each quote:
- The quote itself (verified via web search)
- Which theme it supports
- A one-line note on what the quote proves or demonstrates

Format as a table or structured list grouped by theme.

## 7. Sample Paragraph
200-250 words. One model paragraph answering a typical exam question on this text.
- Demonstrate proper structure: point, quote, explain, personal response
- Show how to integrate quotes naturally
- Show how to link back to the exam question${userInstr}`;
}

export function buildUnseenPoetryPrompt(context: PromptContext): string {
  const userInstr = context.userInstructions
    ? `\n\nADDITIONAL INSTRUCTIONS FROM THE TEACHER:\n${context.userInstructions}`
    : "";

  return `Generate a comprehensive unseen poetry skills guide for ${context.level} level students preparing for the ${context.year} Leaving Certificate English examination.

This covers Paper 2, Section III. Students must analyse a poem they have never seen before. This is skills-based, not content-based. Worth 50 marks.

STRUCTURE (follow this exactly):

## 1. Approach Guide
200-300 words. A step-by-step method for tackling an unseen poem under exam conditions:
- First read: what is happening? Who is speaking? What is the mood?
- Second read: mark techniques, note imagery, identify tone shifts
- Planning: link observations to the specific question asked
- Writing: how to structure the response
- Time management: how long to spend reading vs writing

## 2. Core Poetic Techniques Reference
Cover 15-20 techniques that students MUST be able to identify and discuss. For each technique, write 50-80 words covering:
- A plain English definition
- A brief example (use well-known poems, not prescribed ones, to avoid confusion)
- A template sentence showing how to write about it in an exam: "The poet's use of [technique] in '[quote]' creates a sense of..."

Group the techniques under these headings:

### Sound Devices
Alliteration, assonance, onomatopoeia, rhyme (full, half, internal), rhythm, sibilance

### Figurative Language
Metaphor, simile, personification, hyperbole, symbolism

### Structural Devices
Enjambment, caesura, stanza structure, repetition, refrain

### Tone and Mood
Tone shifts, irony, contrast, juxtaposition

### Imagery
Visual imagery, auditory imagery, tactile imagery, sensory detail

## 3. Response Structure Template
150-200 words. How to structure an unseen poetry answer:
- Opening: name the poem's subject and your overall impression (2-3 sentences)
- Body paragraphs: technique + quote + effect + personal response (3-4 paragraphs)
- Closing: overall impact of the poem (2-3 sentences)
- Include a model opening sentence and a model closing sentence

## 4. Common Question Patterns
100-150 words. The types of questions that appear and what they actually ask for:
- "Discuss the poet's use of imagery" = find and analyse specific images
- "Comment on the mood/atmosphere" = identify emotional tone and explain how it is created
- "Do you find this poem appealing/interesting?" = personal response with evidence from the text
- "How does the poet convey [theme]?" = identify techniques used to communicate the theme
- "Comment on the effectiveness of the title" = connect the title to the poem's content and meaning

## 5. Practice Exercise
A worked example using a public domain poem (choose a short, accessible poem by W.B. Yeats, John Donne, or another poet whose work is out of copyright). Show:
- The poem text
- A sample exam question
- A model response (200-250 words) applying the method from Section 1
- Brief annotations explaining why each paragraph works

## 6. PCLM Connection
100-150 words. How the PCLM marking criteria apply to unseen poetry responses:
- Purpose: demonstrate understanding of the poem and engagement with the question
- Coherence: logical flow from point to point, each paragraph building on the last
- Language: appropriate literary vocabulary, varied sentence structure
- Mechanics: spelling, grammar, punctuation
- What vocabulary and phrasing scores highly in poetry responses${userInstr}`;
}

export function buildComprehensionPrompt(context: PromptContext): string {
  const userInstr = context.userInstructions
    ? `\n\nADDITIONAL INSTRUCTIONS FROM THE TEACHER:\n${context.userInstructions}`
    : "";

  const includeQA =
    context.focusArea === "question_a" || context.focusArea === "both";
  const includeQB =
    context.focusArea === "question_b" || context.focusArea === "both";

  let sections = "";

  if (includeQA) {
    sections += `
## 1. Question A Strategy Guide
200-300 words. How to approach comprehension questions:
- Read the text first, read the questions second, read the text again with the questions in mind
- Identify what the question is actually asking: summarise, analyse, compare, evaluate, or respond personally
- How to use quotes from the passage: short, embedded in your sentences, directly relevant
- How to structure responses: point, evidence from the passage, explanation
- Time management: how long per question based on mark allocation
- The difference between "identify" questions (shorter answers) and "discuss" questions (longer answers)

## 2. Question Types Reference
For each of the following question types, write 100-150 words explaining what the question asks, how to approach it, and a brief example of a strong response structure:

### "What are the main ideas in this text?"
Summarise in your own words. Do not copy full sentences from the passage.

### "Comment on the writer's use of language"
Identify specific language techniques (rhetorical questions, lists of three, emotive language, imagery, register) and explain their effect on the reader.

### "Compare the two texts"
Find similarities and differences. Use linking phrases: "Both texts...", "However, Text B differs in that...", "While Text A emphasises..."

### "Do you agree with the writer's view?"
Personal response with evidence. State your position, support it with evidence from both the text and your own knowledge.

### "Identify the writer's purpose and audience"
Analyse tone, register, content choices, and publication context.

### "How effective is the opening/closing?"
Analyse structural choices: hooks, conclusions, circular structure, call to action.

### "What impression do you form of [person/place/event]?"
Character or subject analysis with evidence from the passage.

### "Explain the impact of specific words/phrases"
Close language analysis: connotation, imagery, sound, register.

## 3. Language Analysis Toolkit
200-250 words. The techniques students need to identify in prose passages:
- Rhetorical questions, lists of three, direct address
- Emotive language, formal vs informal register
- Statistics, anecdote, expert testimony (in persuasive texts)
- Imagery and metaphor in non-fiction prose
- Sentence structure variation: short sentences for impact, longer sentences for flow
- Paragraph structure and topic sentences
- Bias and perspective: how to identify when a writer is presenting one side

Include 2-3 template sentences for writing about language: "The writer's use of [technique] in the phrase '[quote]' serves to..."`;
  }

  if (includeQB) {
    sections += `

## ${includeQA ? "4" : "1"}. Question B Types and Frameworks
For each functional writing type, write 150-200 words covering format requirements, tone expectations, typical length, opening strategy, and a structural template:

### Formal Letter
Format: addresses, date, "Dear...", "Yours sincerely/faithfully". Tone: professional, measured. Structure: state purpose, develop points, close with action.

### Informal Letter / Email
Format: relaxed greeting, conversational close. Tone: warm but clear. Structure: context, main points, personal sign-off.

### Blog Post / Feature Article
Format: catchy title, subheadings optional, engaging opening. Tone: engaging, opinionated, personal. Structure: hook, body paragraphs with examples, conclusion.

### Speech / Talk
Format: "Ladies and gentlemen..." or direct address to audience. Tone: persuasive, personal, varied pace. Structure: attention-grabbing opening, 3-4 key points, memorable close.

### Report
Format: title, introduction, findings, recommendations. Tone: formal, objective. Structure: state purpose, present evidence, draw conclusions.

### Review (book, film, event)
Format: title of item reviewed, star rating optional. Tone: evaluative, balanced. Structure: summary, strengths, weaknesses, recommendation.

### Diary / Journal Entry
Format: date, first person, reflective. Tone: personal, honest. Structure: describe event/situation, reflect on feelings, consider meaning.

## ${includeQA ? "5" : "2"}. Sample Question A Response
200-250 words. A model answer to a typical comprehension question. Show:
- How to open without restating the question
- How to embed short quotes from the passage
- How to explain the significance of evidence
- How to maintain focus on the specific question asked

## ${includeQA ? "6" : "3"}. Sample Question B Response
250-300 words. A model functional writing piece (choose the most common type: speech or feature article). Show:
- Correct format for the chosen type
- Appropriate tone and register
- Clear structure with logical flow
- Strong opening and closing`;
  }

  return `Generate a comprehensive Paper 1 comprehension skills guide for ${context.level} level students preparing for the ${context.year} Leaving Certificate English examination.

This covers Paper 1, Section I. Students read unseen texts and answer Question A (comprehension/analysis, 50 marks) and Question B (functional writing based on the text, 50 marks).

Focus area: ${context.focusArea === "both" ? "Both Question A and Question B" : context.focusArea === "question_a" ? "Question A (Comprehension)" : "Question B (Functional Writing)"}
${sections}${userInstr}`;
}

export function buildCompositionPrompt(context: PromptContext): string {
  const userInstr = context.userInstructions
    ? `\n\nADDITIONAL INSTRUCTIONS FROM THE TEACHER:\n${context.userInstructions}`
    : "";

  const typeLabels: Record<string, string> = {
    personal_essay: "Personal Essay",
    short_story: "Short Story",
    speech: "Speech",
    discursive: "Discursive Essay",
    feature_article: "Feature Article",
    descriptive: "Descriptive Essay",
  };

  const compType = typeLabels[context.compositionType || "personal_essay"] || "Personal Essay";

  const typeSpecificGuidance: Record<string, string> = {
    personal_essay: `A personal essay is reflective, drawing on the student's own experiences, observations, and feelings. The examiner expects a genuine voice, not a formal academic essay. The best personal essays move between the specific (a moment, a memory, a detail) and the general (a broader insight about life, people, or the world). The tone should feel honest and thoughtful. Humour is welcome if natural. The essay should feel like it was written by a real person with something to say.`,
    short_story: `A short story must have a clear narrative arc: a beginning that hooks, a middle that develops tension or conflict, and an ending that resolves or resonates. Characters should feel real, not cardboard. Dialogue should sound natural. The setting should be established quickly through specific sensory detail, not lengthy description. The examiner rewards controlled pacing, a clear climax, and an ending that leaves an impression. Avoid cliches: "it was all a dream", "and then I woke up", "the end".`,
    speech: `A speech must be written for a specific audience and occasion. It should open with direct address and an attention-grabbing statement. The tone should be persuasive and engaging, mixing personal anecdote with broader argument. Use rhetorical techniques naturally: repetition, rhetorical questions, lists of three, direct address. The speech should build to a strong conclusion with a call to action or memorable final statement. It must sound like something that would be spoken aloud, not read silently.`,
    discursive: `A discursive essay presents a balanced exploration of an issue, considering multiple perspectives before reaching a reasoned conclusion. The structure is critical: introduce the topic, present arguments for and against (or multiple viewpoints), and conclude with a considered personal position. Each paragraph should have a clear topic sentence and supporting evidence. The tone should be thoughtful and measured, not aggressive or one-sided. The examiner rewards nuance and the ability to engage with opposing viewpoints fairly.`,
    feature_article: `A feature article is written for publication in a newspaper or magazine. It needs a catchy headline and an engaging opening that hooks the reader. The tone is more personal and engaging than a news report but more structured than a personal essay. It can include anecdote, interview-style quotes (invented is fine), statistics, and expert opinion. Subheadings can be used to break up the text. The closing should circle back to the opening or leave the reader with something to think about.`,
    descriptive: `A descriptive essay creates a vivid picture of a place, person, event, or experience through detailed sensory writing. The examiner rewards specific, concrete detail over vague generalities. Use all five senses where appropriate. The description should have a controlling mood or atmosphere. Structure through spatial organisation (moving through a place), chronological organisation (moving through time), or emotional organisation (moving through feelings). Avoid listing adjectives. Instead, use precise nouns and strong verbs to carry the description.`,
  };

  const guidance = typeSpecificGuidance[context.compositionType || "personal_essay"] || typeSpecificGuidance.personal_essay;

  return `Generate a comprehensive composition writing guide for the ${compType} for ${context.level} level students preparing for the ${context.year} Leaving Certificate English examination.

This covers Paper 1, Section II. The composition is worth 100 marks, the single highest-value question on either paper. It is assessed on PCLM: Purpose, Coherence, Language, Mechanics.

COMPOSITION TYPE: ${compType}

TYPE-SPECIFIC CONTEXT:
${guidance}

STRUCTURE (follow this exactly):

## 1. Format and Expectations
150-200 words. What the examiner expects from a ${compType}:
- Typical length for a strong answer
- Structural conventions specific to this type
- Tone and voice expectations
- What "Purpose" means specifically for a ${compType}
- What "Coherence" means specifically for a ${compType}

## 2. Structure Template
200-250 words. A detailed structural framework:
- How to open: provide 2-3 specific opening strategies with brief examples
- How to develop the middle: paragraph structure, transitions, pacing
- How to close: circular structure, resonant ending, or call to action
- Approximate number of paragraphs and rough length for each
- How to plan the composition in 5 minutes before writing

## 3. Language Marks Guide
150-200 words. How to maximise the Language mark in a ${compType}:
- 5-10 strong words or phrases to aim for (not pretentious, but precise and effective)
- Sentence variety techniques: how to mix short and long, simple and complex
- What "sophisticated language" actually looks like at this level, with 2-3 examples
- Common language errors that cost marks (repetitive vocabulary, vague adjectives, cliched phrases)

## 4. PCLM Breakdown
200-250 words. How each PCLM criterion applies to the ${compType} specifically:

### Purpose
What does a clear sense of purpose look like in a ${compType}? How does the student demonstrate they know what they are doing and why?

### Coherence
What makes a ${compType} flow? How do paragraphs connect? What structural devices create unity?

### Language
What register and vocabulary is expected? What distinguishes a B-grade ${compType} from an A-grade one in terms of language?

### Mechanics
Spelling, grammar, punctuation focus areas for this type. Common mechanical errors students make in ${compType} writing.

## 5. Strong Opening Examples
Provide 3 different ways to open a ${compType}. For each opening:
- The opening itself (50-80 words)
- A brief explanation (1-2 sentences) of why this opening works

## 6. Sample ${compType}
400-500 words. A complete model ${compType} demonstrating all the principles above.
- This should be the kind of composition that would score 85-90 out of 100
- It should demonstrate varied sentence structure, strong vocabulary, clear purpose, and effective structure
- It should read as if written by a talented student, not by a teacher or AI
- Choose a topic that is accessible and relatable for a 17-18 year old

## 7. Common Mistakes
100-150 words. The 4-5 most common errors students make when writing a ${compType}:
- What the mistake is
- Why it costs marks
- How to avoid it${userInstr}`;
}
