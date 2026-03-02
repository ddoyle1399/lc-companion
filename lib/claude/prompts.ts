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
  comparativeTexts?: string[];
  userInstructions?: string;
  // Injected by the API route before prompt building
  examSummary?: string;
  prescribedPoems?: string[];
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
  // 2027 changes (Circular 0021/2025)
  return level === "HL"
    ? "Theme or Issue, Cultural Context, General Vision and Viewpoint"
    : "Theme, Social Setting, Relationships";
}

export function buildSystemPrompt(context: PromptContext): string {
  const readingLevel = getReadingLevel(context.level);
  const modes = getComparativeModes(context.year, context.level);

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

  return `You are a Leaving Certificate English content generator for an experienced Irish secondary school teacher. Your role is to produce exam-focused, accurate, and concise study content aligned with the Irish Leaving Certificate English syllabus.

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

APPROVED POETIC/LITERARY DEVICES (only use devices from this list):
Sound devices: alliteration, assonance, onomatopoeia, rhyme (full, half, internal), rhythm, sibilance
Figurative language: metaphor, simile, personification, hyperbole, oxymoron, symbolism, allegory
Structural devices: enjambment, caesura, stanza structure, volta (turn), refrain, repetition, parallelism
Tone and mood: tone shifts, irony (verbal, situational, dramatic), ambiguity, juxtaposition, contrast
Imagery: visual imagery, auditory imagery, tactile imagery, sensory detail
Other exam-relevant devices: rhetorical questions, direct address, colloquial language, register shifts, dramatic monologue, narrative voice (first/third person)

Do NOT use synecdoche, metonymy, litotes, anaphora (use "repetition" instead), epistrophe, chiasmus, zeugma, synesthesia, or any obscure device that would confuse a typical HL student or that examiners would not expect to see identified.

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

  // Build the prescribed poems constraint for the Links section
  let prescribedListConstraint = "";
  if (context.prescribedPoems && context.prescribedPoems.length > 0) {
    const poemList = context.prescribedPoems
      .filter((p) => p !== context.poem)
      .map((p) => `"${p}"`)
      .join(", ");
    prescribedListConstraint = `
CRITICAL: You must ONLY link to poems on the prescribed list for ${context.year} at ${context.level}. The prescribed poems for ${context.poet} are: ${poemList}. Do NOT reference any poem not on this list. Linking to non-prescribed poems is misleading and harmful to exam preparation.`;
  }

  return `Generate a comprehensive poetry analysis note for "${context.poem}" by ${context.poet}.

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
