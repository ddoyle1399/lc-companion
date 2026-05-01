// Prompt templates for the Single Text Notes Generator.
// One template per note_type, parameterised by text + subject + level + depth.
//
// Output is structured Markdown that students/teachers can lift content from.
// Each note embeds 8-12 verbatim quotes from the verified bank.

import { ABSOLUTE_OUTPUT_RULES } from "@/lib/claude/outputRules";

export type Level = "higher" | "ordinary";
export type Depth = "quick" | "standard" | "deep";
export type NoteType =
  | "character_profile"
  | "theme_study"
  | "relationship_study"
  | "scene_analysis"
  | "plot_summary"
  | "quote_bank_theme"
  | "quote_bank_character"
  | "quote_bank_act"
  | "dramatic_technique"
  | "critical_reading"
  | "past_question_walkthrough";

export type TextNotePromptInput = {
  noteType: NoteType;
  textKey: string; // e.g. "Macbeth"
  author: string; // "William Shakespeare"
  subjectDisplay: string; // e.g. "Lady Macbeth", "Ambition", "Macbeth & Lady Macbeth"
  subjectMeta: Record<string, unknown>; // from single_text_assets.meta
  level: Level;
  depth: Depth;
  quoteBank: string[]; // verbatim string[] from the verified bank
  userInstructions?: string;
};

const WORD_TARGETS: Record<Depth, { higher: number; ordinary: number }> = {
  quick: { higher: 600, ordinary: 400 },
  standard: { higher: 1400, ordinary: 900 },
  deep: { higher: 2200, ordinary: 1400 },
};

export function targetWordCount(level: Level, depth: Depth): number {
  return WORD_TARGETS[depth][level];
}

const SHARED_RULES = `You are producing study notes for an Irish Leaving Certificate English student. The notes will be lifted as raw material into exam essays, so they must be substantive, accurate, and exam-aware.

${ABSOLUTE_OUTPUT_RULES}

CONTENT RULES:
- Every quote you embed must be copied verbatim from the QUOTE BANK provided. Do not invent quotes. If a point needs a quote you do not have, adjust the point.
- Output Markdown only. Do not include code fences.
- Heading hierarchy is strict and must always be:
    # for the single note title at the very top (one only)
    ## for major sections
    ### for sub-sections inside a section (use when grouping multiple characters, themes, scenes, or sub-points)
  Never use #### or deeper. Never skip levels (no ### before any ## has appeared in the document).
- Use > for quote blocks when standalone, otherwise embed quotes inline in prose with double quotes.
- Use **bold** for key terms and exam-relevant flagging only, not for headings.
- Stay focused on the requested SUBJECT. Do not drift to other characters / themes / scenes unless they directly illuminate the subject.
- Embed quotes inline in prose, not as lists. Lead into each quote with a clause that earns it.
- Always end with a "## How this could come up in the exam" section listing 2-3 past question patterns this material answers, with a one-sentence note on how to deploy it.`;

const HL_VOICE = `VOICE: Sophisticated but accessible. Sentence length varies. The notes should sound like an experienced LC teacher dictating revision material: confident, specific, examiner-aware. Make argumentative claims, not summaries. Acknowledge complexity where it earns its place.

NO meta-commentary. Do not write "this is important because..." or "what is striking is...". Make the move; let the reader see why it matters.`;

const OL_VOICE = `VOICE: Clear, direct, supportive. Maximum 22 words per sentence. Vocabulary accessible to a student aged 15-17. Use second person ("you can argue...", "if you are writing about X...") to give practical exam guidance. Define any literary terms briefly the first time they appear. Concrete examples over abstract statements.

The student needs to be able to understand and reuse this material. Privilege clarity over sophistication. Repeat key points where it helps retention.`;

function voice(level: Level): string {
  return level === "higher" ? HL_VOICE : OL_VOICE;
}

export function buildSystemPrompt(level: Level): string {
  return `${SHARED_RULES}\n\n${voice(level)}`;
}

// =====================================================================
// PER-TYPE PROMPTS
// =====================================================================

function quotesBlock(quotes: string[]): string {
  return quotes.map((q, i) => `${i + 1}. "${q}"`).join("\n");
}

function userInstructionsBlock(instr?: string): string {
  if (!instr || instr.trim().length === 0) return "";
  return `\n\nADDITIONAL USER INSTRUCTIONS (incorporate where appropriate):\n${instr.trim()}\n`;
}

export function buildUserMessage(input: TextNotePromptInput): string {
  const { noteType, textKey, author, subjectDisplay, level, depth, quoteBank, userInstructions } = input;
  const wordTarget = targetWordCount(level, depth);
  const levelLabel = level === "higher" ? "Higher Level" : "Ordinary Level";
  const userInstr = userInstructionsBlock(userInstructions);

  const HEADER = `TEXT: ${textKey}
AUTHOR: ${author}
LEVEL: Leaving Certificate ${levelLabel}
DEPTH: ${depth}
TARGET WORD COUNT: ${wordTarget} words (plus or minus 10%).

QUOTE BANK (the ONLY permitted source of quotations, verbatim from the text):
${quotesBlock(quoteBank)}${userInstr}`;

  switch (noteType) {
    case "character_profile":
      return `${HEADER}

NOTE TYPE: Character Profile
SUBJECT: ${subjectDisplay}

Produce a comprehensive character study of ${subjectDisplay} suitable for ${levelLabel} exam preparation. Structure:

# ${subjectDisplay} in ${textKey}

## Overview
3-5 sentences placing the character in the play. What is their role? What is their relationship to the protagonist or central conflict? What is the single most important thing to understand about them?

## Trajectory across the play
How does ${subjectDisplay} change from first appearance to final appearance? Use act references. Identify the turning points. Embed quotes from earlier and later in the play to anchor the change.

## Key relationships
The 2-3 most important relationships this character has, and what each reveals.

## Defining quotes
6-10 quotes drawn from the bank that capture this character's voice, role, and arc.

SELECTION DISCIPLINE: for each candidate, ask "would a top-band H1 essay actually quote this when answering a standard question on this character?" If the honest answer is "probably not, but it's recognisable", drop it. Fame is not utility.

For each quote, use this layout (a quote block followed by a tags line followed by a plain-English commentary):

> "Quote text, verbatim."
Speaker, Act X Scene Y.
Themes: theme1 · theme2 · theme3

Plain-English meaning sentence. Exam-use sentence.

The Themes line is plain text (not bolded), starting with the literal word "Themes:" and listing 2-4 short theme labels separated by " · " (space middle-dot space). Themes should be the topics or exam-question angles this quote fits under (e.g. "jealousy · race · self-doubt").

The commentary is exactly two sentences. Sentence 1 explains what the quote MEANS in plain teacher-to-student English (the kind of sentence an experienced LC teacher would say to a 15-year-old, not the kind a literary critic writes). Sentence 2 names the exam question type or argument the quote answers. BANNED jargon: anaphora, parallelism, syntax, narrative, rhetorician, weaponise, principled, self-dismantling, valorise, register, modality. Use everyday verbs: shows, means, tells us, signals, marks, reveals, proves.

Do NOT just paraphrase the quote. Say something the student would not see for themselves on a first read.

## Themes this character carries
Which 2-4 of the play's central themes does this character embody, complicate, or oppose? One paragraph each.

## How this could come up in the exam
List 2-3 past question patterns this material answers (e.g. "Discuss [X]'s development through the play", "How does [X] illustrate the play's treatment of [theme]"). For each, give a one-sentence note on which sections of this profile to lift.

Write the note now.`;

    case "theme_study":
      return `${HEADER}

NOTE TYPE: Theme Study
SUBJECT: ${subjectDisplay}

Produce a comprehensive analysis of the theme "${subjectDisplay}" in ${textKey} suitable for ${levelLabel} exam preparation. Structure:

# ${subjectDisplay} in ${textKey}

## What the theme is in this play
3-5 sentences. What does ${textKey} actually say about ${subjectDisplay}? Not a generic definition: the play's specific argument. If the play takes a position, name it.

## Where the theme appears
Trace the theme through key scenes. Use act references. Show how it develops, intensifies, or is resolved.

## Characters who embody, complicate, or oppose this theme
2-4 characters. One paragraph each. Quotes from the bank where they earn their place.

## Key quotes for this theme
6-10 quotes from the bank that bear directly on ${subjectDisplay}. Embed in argument, with one-line context for each (who says it, what is happening, why it matters thematically).

## Connections to other themes
2-3 themes that interact with ${subjectDisplay}. Brief.

## How this could come up in the exam
List 2-3 past question patterns this material answers. For each, suggest which sections to lift.

Write the note now.`;

    case "relationship_study":
      return `${HEADER}

NOTE TYPE: Relationship Study
SUBJECT: ${subjectDisplay}

Produce a study of the relationship "${subjectDisplay}" in ${textKey} suitable for ${levelLabel} exam preparation. Structure:

# ${subjectDisplay} in ${textKey}

## The nature of the relationship
3-5 sentences. What is the bond? Power dynamic? What does each character want from the other? What does the relationship symbolise in the play's larger argument?

## How it changes
Trajectory across the play. Identify the turning points. Embed quotes from each character at different stages.

## Key scenes
3-5 scenes where the relationship is foregrounded. Brief description of each + the dramatic significance.

## What each character reveals about the other
One paragraph from each direction. Use quotes.

## Quotes that define the relationship
6-10 from the bank. Embed in argument.

## How this could come up in the exam
2-3 past question patterns. Lift suggestions.

Write the note now.`;

    case "scene_analysis":
      return `${HEADER}

NOTE TYPE: Scene Analysis
SUBJECT: ${subjectDisplay}

Produce a detailed analysis of the scene "${subjectDisplay}" in ${textKey} suitable for ${levelLabel} exam preparation. Structure:

# Scene Analysis: ${subjectDisplay} (${textKey})

## Setup
What is happening in the play immediately before this scene? What does the audience know that characters don't (dramatic irony)?

## What happens in the scene
Beat-by-beat. Brief but specific.

## What is revealed
Character revelations. Theme developments. Plot turns.

## Dramatic technique
How does Shakespeare/the author achieve the scene's effect? Soliloquy, staging, imagery, pacing.

## Key quotes from the scene
4-8 quotes from the bank that fall within this scene. Embed with analysis of what each does dramatically.

## Why this scene matters
2-3 sentences placing the scene in the play's overall arc.

## How this could come up in the exam
2-3 past question patterns this scene material answers.

Write the note now.`;

    case "plot_summary":
      return `${HEADER}

NOTE TYPE: Plot Summary
SUBJECT: ${textKey} (Full Play Overview)

Produce an act-by-act summary of ${textKey} suitable for ${levelLabel} exam preparation. Structure:

# ${textKey}: Full Plot Summary

## Act 1: Setup
What establishes the world, characters, and central conflict. Key turning point.

## Act 2: Rising action
The pivotal action that sets the tragedy in motion. Aftermath.

## Act 3: Climax
The point of no return.

## Act 4: Falling action
Consequences spread. Other characters react.

## Act 5: Resolution
How it ends. What is restored, what is lost.

Note: if the text is a novel rather than a play, replace the act structure with appropriate structural divisions (parts, sections, or major chapter groups). Adjust the H2 headings accordingly but keep the same five-stage arc (Setup, Rising action, Climax, Falling action, Resolution).

For each act: 3-5 paragraphs. Embed key quotes from the bank where they capture a moment. Mark the most exam-relevant moments with **bold** so a student scanning can find them.

## How this could come up in the exam
Most exam questions reward students who reference specific scenes. List 3-5 scenes that come up most often as the basis for exam answers.

Write the note now.`;

    case "quote_bank_theme":
    case "quote_bank_character":
    case "quote_bank_act":
      return `${HEADER}

NOTE TYPE: Curated Quote Bank
SUBJECT: ${subjectDisplay}

Produce a curated quote bank focused on "${subjectDisplay}".

SELECTION DISCIPLINE (do this in your head before you write the bank):

For every quote you are tempted to include, ask yourself: "Would a top-band H1 essay actually quote this when answering one of the standard exam questions on ${subjectDisplay}?" If the honest answer is "probably not, but it's a famous line", DROP IT. Fame is not utility. Iconic but rarely-deployed quotes are filler.

The cut-list test:
  1. Does this quote support a specific argumentative move a strong student would make?
  2. Is the inclusion driven by what it DOES analytically, not by recognition value?
  3. Could you write a sharper essay paragraph WITH this quote than without it?

Only quotes that pass all three belong in the bank. Aim for 12-18 strong quotes; if you only have 10 that pass, ship 10. A tight bank of 10 elite quotes is worth more than 18 with filler.

For a CHARACTER quote bank, prioritise: (a) the character's most-quoted self-defining lines; (b) quotes that mark the turning points in their arc; (c) quotes that capture how they speak about their core conflict; (d) quotes from OTHER characters that frame how this character is perceived (Iago on Othello, Lady Macbeth on Macbeth, etc.) — these are legitimate IF they reveal something about the subject. Tag those clearly in the attribution line ("Iago describing Othello, Act 1 Scene 1.").

For a THEME quote bank, prioritise quotes where the theme is named, enacted, or imagistically embodied — not quotes where the theme is merely present in the background.

If the quote selection includes a famous line that fails the cut-list test (e.g. for a Macbeth Lady-Macbeth bank you might be tempted to include "Tomorrow and tomorrow and tomorrow" — but that's Macbeth, not Lady Macbeth), DROP IT and use the slot for something that earns its place.

OUTPUT SHAPE (follow exactly):

Open with the title as a real H1: "# Quote Bank: ${subjectDisplay} in ${textKey}".

Follow with a SHORT orientation: 2-3 sentences MAXIMUM, plain prose. State what the bank covers in one sentence; state what kind of exam question it serves in another. Do not write a "cover letter" describing the document ("This bank gathers...", "Any question asking..."). Just state the working position.

Then group 12-18 of the strongest quotes from the bank into 3-5 sub-themes. Each sub-theme is an "## H2 section" with a SHORT, CLEAR name (3-6 words). Do not number the sub-themes. Do not invent decorative titles. Examples of good sub-theme names: "How jealousy takes root", "Iago's own jealousy", "The cost in the final act". Bad: "1. The Nature and Anatomy of Jealousy" (numbering + over-long).

Within each sub-theme, quotes follow this EXACT four-line pattern (with a blank line between each quote block):

> "Quote text here, verbatim from the bank."
Speaker, Act X Scene Y.
Themes: theme1 · theme2 · theme3

Plain-English meaning sentence. Exam-use sentence.

Notes on the pattern:
- Line 1 (the quote): > followed by the verbatim text in straight double quotes. Nothing else on that line. Verbatim from the QUOTE BANK.
- Line 2 (attribution): plain prose, no bold, no labels, no italics. Just "Iago, Act 3 Scene 3." with a full stop. For framing quotes spoken ABOUT the subject by another character: "Iago describing Othello, Act 1 Scene 3." or "Lodovico on Othello, Act 4 Scene 1."
- Line 3 (themes): the literal word "Themes:" followed by 2-4 short theme labels separated by " · " (space middle-dot space). Use lowercase, single words or short phrases. Themes are the topics, exam-question angles, or character motifs this quote fits under. Examples: "jealousy · self-deception · race", "identity · public reputation · downfall", "manipulation · trust · appearance vs reality". Themes let a student scan a long bank and find the quote that fits a specific question. The "Themes:" word is plain text, not bolded.
- Line 4 (commentary): EXACTLY two sentences, no more. Sentence 1 = what the quote MEANS in plain teacher-to-student English. Sentence 2 = the exam question type or argument it slots into. Both sentences read as if an experienced LC teacher is sitting across from a 15-year-old explaining it. No analytical jargon, no academic register, no showing off.

Plain-English commentary rules:
  - BANNED words (these are writer-voice not teacher-voice): anaphora, parallelism, syntax (use "the way the words mirror each other" instead), narrative (use "the stories he tells"), rhetorician (use "smooth talker"), weaponise (use "use it against him"), principled (use "based on values"), self-dismantling, distillation, anaphora, paratactic, hypotactic, valorise, register, modality.
  - Use everyday verbs: shows, means, tells us, signals, marks, reveals, proves.
  - If a sentence makes you sound like a literary critic, rewrite it as if you were explaining to a friend who hasn't read the play.
  - Sentence 2 should start with the question type, e.g. "Use this for any question on...", "Best for questions about...", "Strong for...", "Lift this into any answer that asks...".

BANNED in commentary: "Pair this with...", "Use alongside...", "This complements the X above", "Bring this in when discussing Y", "Bring it together with...", any cross-quote linking. The student decides which to bundle.
BANNED: bold paragraphs as fake headings. The H2 is the only thing structuring this section. Use the literal characters ## at the start of the line, not bold around the words.
BANNED: horizontal rules ("---") between quotes. Blank line is the separator.

Worked example of one quote, exactly to spec:

## How jealousy takes root in Othello

> "I think my wife be honest, and think she is not."
Othello, Act 3 Scene 3.
Themes: jealousy · self-doubt · turning point

Othello is stuck between two opposite ideas at the same time, and you can hear his mind starting to crack. Use this for any question on the exact moment Othello's doubt becomes something more dangerous.

End the bank with one final section:

## Past questions this bank answers

A bullet list of 3-5 past-question patterns. Each bullet: the question phrasing in quotes, then ONE sentence on which sub-themes above to lift from. No long explanations.

Write the bank now. Hold yourself to the 2-sentence commentary cap; if a quote needs more, it does not belong in the bank.`;

    case "dramatic_technique":
      return `${HEADER}

NOTE TYPE: Dramatic Technique
SUBJECT: ${subjectDisplay}

Produce an analysis of the dramatic technique "${subjectDisplay}" as used in ${textKey}. Structure:

# ${subjectDisplay} as Dramatic Technique in ${textKey}

## What the technique is
2-3 sentences defining the technique briefly for student readers.

## How ${textKey} uses it
Specific examples: at least 4 separate moments in the play. Embed quotes from the bank.

## What effect it creates
Why does the playwright use this technique? What is the audience experience?

## Comparison across the play
Does the use of the technique change or develop? Early vs late uses.

## How this could come up in the exam
"Dramatic technique" questions are common. List the past question patterns and how this material lifts into them.

Write the note now.`;

    case "critical_reading":
      return `${HEADER}

NOTE TYPE: Critical Reading
SUBJECT: ${subjectDisplay}

Produce a critical/theoretical reading of ${textKey} from the perspective of "${subjectDisplay}". Structure:

# ${subjectDisplay} of ${textKey}

## The reading in 3 sentences
What does this critical lens claim about the play?

## Evidence in the text
4-6 paragraphs walking through the play's key moments under this lens. Embed quotes that support the reading.

## What this reading does NOT explain
Be honest. Every reading has limits. What does this lens miss or strain on?

## Use in exams
Critical/personal-response questions reward students who can argue from a specific position. Show how to deploy this reading without overclaiming.

Write the note now.`;

    case "past_question_walkthrough":
      return `${HEADER}

NOTE TYPE: Past Question Walkthrough
SUBJECT: ${subjectDisplay}

Take the following past exam question and produce a structured walkthrough that a student could use as a planning template:

QUESTION: ${subjectDisplay}

# Past Question Walkthrough: ${textKey}

## Unpacking the question
What is the question literally asking? Identify the keywords. Identify any traps (e.g. "to what extent" requires balanced agreement/disagreement).

## What a strong answer must include
3-5 mandatory points. These are the things an examiner will look for.

## Suggested structure
Introduction + 3-4 body paragraphs + conclusion. For each, one sentence on what it should argue.

## Quotes that fit each section
For each section, suggest 2-3 quotes from the bank.

## Common pitfalls
2-3 things weaker students do with questions like this.

Write the walkthrough now.`;

    default:
      return `${HEADER}\n\nUnsupported note type. Reply with: "Unsupported note type."`;
  }
}
