export function buildScriptSystemPrompt(): string {
  return `You are converting a poetry teaching note into a spoken video script. The video will show the poem on screen whilst a teacher's voice analyses it.

ABSOLUTE RULES:
- Write in UK English at all times (colour, analyse, recognise, etc.)
- NEVER use em dashes or en dashes anywhere. Use commas, full stops, or colons instead.
- NEVER use semicolons. Use short sentences instead.
- Never use these words: delve, nuanced, landscape (figuratively), multifaceted, tapestry.
- Maximum 20 words per sentence. Shorter is better.
- Write for SPEECH, not reading. This will be spoken aloud by a teacher.
- Use natural spoken English. Sound like an experienced teacher talking to a student.
- Address the viewer as "you" directly.
- Do NOT say "in this video we will" or "let us examine" or "we shall now look at". Just start teaching.
- Do NOT start consecutive sentences with the same word.
- Vary sentence length. Mix very short sentences with slightly longer ones.
- Total script length: 800 to 1200 words (roughly 5 to 8 minutes when spoken at natural pace).
- Never hallucinate quotes. Only quote lines that appear in the poem text provided.

RESPONSE FORMAT:
Return ONLY valid JSON. No markdown fences. No explanation before or after. The response must start with { and end with }.`;
}

export function buildScriptUserPrompt(
  poet: string,
  poem: string,
  poemText: string,
  poetryNote: string,
  poemLineCount: number
): string {
  return `Convert the following poetry teaching note into a spoken video script.

POET: ${poet}
POEM: "${poem}"

POEM TEXT (${poemLineCount} lines, 0-indexed from line 0 to line ${poemLineCount - 1}):
---
${poemText}
---

TEACHING NOTE TO CONVERT:
---
${poetryNote}
---

SCRIPT STRUCTURE (follow this order):

1. INTRO section (type: "intro", highlightLines: [])
   - 3 to 4 sentences maximum
   - Brief context about the poet and this poem
   - No lines highlighted on screen during the intro

2. STANZA ANALYSIS sections (type: "stanza_analysis", highlightLines: [relevant 0-indexed line numbers])
   - One section per stanza or logical group of lines
   - For each section: say what is happening, name one key technique, explain why it matters for the exam
   - Quote directly from the poem text provided above
   - highlightLines must be 0-indexed line numbers from the poem text

3. THEMES section (type: "theme", highlightLines: [])
   - 2 to 3 key themes in 2 to 3 sentences each
   - Connect to exam question patterns
   - No lines highlighted

4. EXAM CONNECTION section (type: "exam_connection", highlightLines: [])
   - 1 to 2 sentences on what exam question types this poem suits
   - Which other poems by this poet it links to
   - No lines highlighted

5. OUTRO section (type: "outro", highlightLines: [])
   - One sentence wrap-up
   - No lines highlighted

JSON SCHEMA:
{
  "poemTitle": "string",
  "poet": "string",
  "totalEstimatedDuration": number (total seconds, roughly wordCount / 2.5),
  "sections": [
    {
      "id": "string (e.g. 'intro', 'stanza_1', 'theme', 'exam', 'outro')",
      "type": "intro" | "stanza_analysis" | "theme" | "exam_connection" | "outro",
      "spokenText": "string (the words the voiceover will say)",
      "highlightLines": [0, 1, 2, 3],
      "estimatedDuration": number (seconds, roughly wordCount / 2.5)
    }
  ]
}

Return ONLY the JSON object. No other text.`;
}
