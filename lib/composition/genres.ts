/**
 * Composition genres and guide types for LC English Paper 1 Section II.
 *
 * Section II (the Composition) is worth 100 marks — the single
 * highest-value question on either paper. Students choose ONE of
 * seven titles, written in the genre indicated by the title (Write
 * a personal essay..., Write a speech..., Write a feature article...).
 *
 * This module is the single source of truth for which genres the
 * Composition guide tooling supports and what kind of guide content
 * the operator can request for each.
 */

export type CompositionGenre =
  | "personal_essay"
  | "short_story"
  | "speech"
  | "discursive_essay"
  | "feature_article"
  | "descriptive_essay"
  | "diary_entry"
  | "letter"
  | "talk_podcast"
  | "memoir";

export type CompositionGuideType =
  | "overview"
  | "features"
  | "worked_example"
  | "lift_phrases"
  | "common_mistakes"
  | "plan_a_title";

export interface GenreMeta {
  key: CompositionGenre;
  label: string;
  shortLabel: string;
  oneLiner: string;
  // Substantive paragraph used as the core framing in every prompt for
  // this genre. Should establish what the genre IS, what makes it
  // distinct from neighbouring genres, and what the examiner rewards.
  framing: string;
  // Genre-specific distinctive techniques — used by the 'features'
  // guide type. Plain English names a student would recognise.
  features: string[];
  // The most common student trap for this genre. Used by the 'common
  // mistakes' guide type as the hardest-hitting point.
  primaryTrap: string;
  // Typical word target for HL.
  targetLength: string;
}

export const GENRES: GenreMeta[] = [
  {
    key: "personal_essay",
    label: "Personal Essay",
    shortLabel: "Personal Essay",
    oneLiner: "Reflective, voice-driven writing on a personal angle to a topic.",
    framing:
      "A personal essay is reflective writing in the first person. The voice is the point: you are not arguing a thesis, you are showing a thoughtful person making sense of something. The strongest personal essays move between the specific (a moment, a memory, a detail) and the general (a broader insight about life, people, or the world). The examiner rewards honesty, controlled voice, and the ability to give a small thing weight without inflating it.",
    features: [
      "Anecdote that opens with a specific moment, not a thesis",
      "Movement between scene and reflection",
      "Honest, unguarded register (avoid academic over-polish)",
      "Sensory detail used for atmosphere not decoration",
      "A turn or pivot near the end where the meaning crystallises",
      "Light humour where it sits naturally",
      "Specific concrete nouns (the brand of biscuit, the make of car)",
    ],
    primaryTrap:
      "Students write a discursive essay with 'I' inserted at the start of paragraphs. A personal essay is grounded in lived specifics, not in argument from authority.",
    targetLength: "1000-1300 words for HL",
  },
  {
    key: "short_story",
    label: "Short Story",
    shortLabel: "Short Story",
    oneLiner: "Narrative fiction with a clear arc, character, and resonance.",
    framing:
      "A short story is fiction with a defined arc: an opening that hooks the reader, a middle that develops tension or change, and an ending that lands. Characters need to feel real, dialogue needs to sound spoken, setting needs to be sketched in concrete detail. The examiner rewards control of pacing, a clear climax or turn, and an ending that leaves a residue.",
    features: [
      "In medias res opening — drop the reader into the action",
      "Show through action and dialogue rather than telling",
      "Concrete sensory detail to establish setting",
      "Dialogue that sounds spoken (contractions, interruptions, silence)",
      "A turning point where something shifts irrevocably",
      "Resolved or resonant ending — not a twist or a 'it was a dream'",
      "Controlled point of view (first or third, kept consistent)",
    ],
    primaryTrap:
      "Students rush the ending and tag a moral on. The ending should feel inevitable in retrospect, not bolted on.",
    targetLength: "1000-1300 words for HL",
  },
  {
    key: "speech",
    label: "Speech",
    shortLabel: "Speech",
    oneLiner: "Spoken-word piece addressed to a named audience and occasion.",
    framing:
      "A speech is written to be heard, not read. It opens with direct audience address and an attention-grab, builds a clear argument or vision, and closes with something memorable — a call to action, a refrain, an image. Rhetorical devices (anaphora, tricolons, rhetorical questions, direct address) are not decorations; they carry the structure. The examiner rewards a recognisable spoken rhythm, a clear sense of audience and occasion, and a conclusion that lands.",
    features: [
      "Direct address to a named audience in the opening",
      "Rhetorical questions to draw the listener in",
      "Anaphora (repetition at the start of consecutive sentences)",
      "Tricolons — sentences in threes for rhythm",
      "Personal anecdote to establish credibility and warmth",
      "Pivot from problem to vision to action",
      "Memorable closing image, refrain, or call to action",
      "Sentence rhythm that sounds spoken (mix of long flowing and short punchy)",
    ],
    primaryTrap:
      "Students write a discursive essay with 'Ladies and gentlemen' tacked on at the start. A speech needs spoken rhythm and audience awareness throughout, not just at the opening.",
    targetLength: "1000-1200 words for HL (about 8-10 minutes spoken)",
  },
  {
    key: "discursive_essay",
    label: "Discursive Essay",
    shortLabel: "Discursive",
    oneLiner: "Balanced exploration of an issue from multiple sides.",
    framing:
      "A discursive essay considers an issue from multiple sides before reaching a measured position. It is not a polemic. The structure is the form: introduce the topic, present arguments for and against (or two competing perspectives), and conclude with a considered personal position that has earned the right to stand. The examiner rewards nuance, fair engagement with opposing viewpoints, and clear paragraph-level argument.",
    features: [
      "Topic sentences at the start of each paragraph",
      "Counterargument acknowledged and engaged with, not dismissed",
      "Measured tone — neither aggressive nor evasive",
      "Specific examples to ground abstract claims",
      "Linking phrases: 'However', 'On the other hand', 'It would be wrong to assume'",
      "Conclusion that takes a position after weighing the arguments",
      "Avoidance of the first person (or use it sparingly)",
    ],
    primaryTrap:
      "Students pick a side in the introduction and ignore the other side. The whole point of the genre is the weighing, not the position.",
    targetLength: "1100-1300 words for HL",
  },
  {
    key: "feature_article",
    label: "Feature Article",
    shortLabel: "Feature Article",
    oneLiner: "Magazine/newspaper article on a topic, with a hook and structure.",
    framing:
      "A feature article is written for publication in a newspaper or magazine — broadsheet, weekend supplement, or online. It needs a catchy headline (the title in the brief or one you invent), an engaging opening (the lede), and a body that mixes anecdote, fact, opinion, and where appropriate invented quotation. Subheadings are allowed and often welcome. The closing should circle back to the opening or leave the reader with something to think about.",
    features: [
      "Strong headline — pun, question, or vivid image",
      "Lede that hooks: anecdote, statistic, or arresting image",
      "Standfirst — a one-sentence summary under the headline (optional but professional)",
      "Subheadings to break the body into sections",
      "Invented quotation from an expert or insider (made up but credible)",
      "Mix of personal voice and journalistic distance",
      "Closing that circles back or pivots to a broader point",
      "Implied publication — choose where the article would run and write to that audience",
    ],
    primaryTrap:
      "Students write a personal essay and call it a feature article. A feature article has a publication, an audience, journalistic conventions, and an external focus — it is not a memoir.",
    targetLength: "1100-1300 words for HL",
  },
  {
    key: "descriptive_essay",
    label: "Descriptive Essay",
    shortLabel: "Descriptive",
    oneLiner: "Vivid sensory writing that creates a place, person, mood, or moment.",
    framing:
      "A descriptive essay creates a vivid picture of a place, person, event, or experience through sustained sensory writing. The examiner rewards specific concrete detail over vague generality. Use all five senses where they fit. Hold a controlling mood or atmosphere throughout. Structure can be spatial (moving through a place), chronological (moving through time), or emotional (moving through a feeling). The strongest descriptive writing uses precise nouns and strong verbs rather than piles of adjectives.",
    features: [
      "Sensory writing across all five senses where appropriate",
      "Specific concrete nouns over vague abstractions",
      "Strong verbs over adjective stacks",
      "A controlling mood — sustained throughout, not just stated",
      "Movement through space, time, or feeling as structural spine",
      "Imagery (simile, metaphor) used sparingly and precisely",
      "Sentence rhythm matched to the subject — long and flowing for calm, short and clipped for tension",
    ],
    primaryTrap:
      "Students list adjectives instead of describing. 'It was a beautiful, peaceful, calm, idyllic morning' is weak. 'The kettle had not yet whistled' is strong.",
    targetLength: "900-1100 words for HL",
  },
  {
    key: "diary_entry",
    label: "Diary Entry",
    shortLabel: "Diary",
    oneLiner: "First-person dated entries from a chosen persona's perspective.",
    framing:
      "A diary entry is intimate first-person writing, dated, in the voice of a specific persona (which may or may not be the student's own). When the brief asks for several entries, they should track development across time — a change in mood, understanding, or circumstance. The voice should match the persona; a diary entry from a soldier in 1916 should not sound like a 17-year-old in 2026. The examiner rewards consistent voice, persuasive interiority, and the sense that you are reading something private.",
    features: [
      "Date header (not 'Dear Diary' unless the persona would write that)",
      "First-person interiority — thoughts, doubts, second-guessing",
      "Voice that matches the persona's age, era, education, situation",
      "Concrete daily detail to ground the emotional content",
      "Across multiple entries: development, change, contrast",
      "Privacy markers — things the diarist would NOT say aloud",
      "Implied audience: the diarist's future self, or no audience at all",
    ],
    primaryTrap:
      "Students write a personal essay with date headers. A diary entry should feel private and unguarded; it should contain things the persona would not say in a public piece.",
    targetLength: "1000-1300 words for HL (often 2-3 dated entries)",
  },
  {
    key: "letter",
    label: "Letter",
    shortLabel: "Letter",
    oneLiner: "Formal, informal, or open letter — register matched to audience.",
    framing:
      "A letter is written to a named or implied recipient. The register depends on the recipient: formal for an institution or stranger, informal for a friend or family member, public for an open letter to a public figure or community. Conventions vary — formal letters need address blocks and proper sign-offs; informal letters can be loose. An open letter is addressed to one person but written to be read by many. The examiner rewards register awareness, conventions appropriate to type, and a clear purpose.",
    features: [
      "Salutation appropriate to the type (Dear Sir/Madam, Dear [name], To the Editor)",
      "Opening that establishes who is writing and why",
      "Body paragraphs that build the purpose: information, request, advocacy, narrative",
      "Sign-off that matches register (Yours sincerely, Yours faithfully, Love, Best wishes)",
      "Conversational features for informal: contractions, asides, shared references",
      "Formal markers for formal: passive voice, structured paragraphs, no contractions",
      "Open letter: rhetorical force, public-facing rhetoric, an implied wider audience",
    ],
    primaryTrap:
      "Students mix registers — using a formal sign-off after a chatty informal body, or vice versa. Pick one register and hold it from salutation to sign-off.",
    targetLength: "1000-1200 words for HL",
  },
  {
    key: "talk_podcast",
    label: "Talk or Podcast Script",
    shortLabel: "Talk / Podcast",
    oneLiner: "Spoken script — radio talk, podcast, presentation.",
    framing:
      "A talk or podcast script is written to be spoken aloud, but unlike a speech it is more conversational and less rhetorical. Direct address to the listener, a clear topic, and a personal angle. For a podcast, audio cues are welcome (sound effects in brackets, music in italics). Pacing is for the ear: shorter sentences, natural breath points, signposting ('I want to tell you about...', 'And here is the strange thing...'). The examiner rewards a clear sense of the medium, conversational warmth, and structure that a listener can follow without scrolling back.",
    features: [
      "Direct address to a single implied listener ('you')",
      "Conversational rhythm — contractions, asides, natural breath",
      "Signposting language: 'I want to tell you...', 'Here is what struck me...'",
      "A personal angle — the host's perspective, anecdote, encounter",
      "Audio cues for podcast (sound effects in brackets, music in italics)",
      "A clear three-part shape — open, develop, land",
      "Closing that gives the listener something to take away",
    ],
    primaryTrap:
      "Students write a speech and call it a podcast. A podcast is more conversational, more personal, and less rhetorically heightened than a speech.",
    targetLength: "1000-1200 words for HL (about 8-10 minutes audio)",
  },
  {
    key: "memoir",
    label: "Memoir / Autobiographical Writing",
    shortLabel: "Memoir",
    oneLiner: "True personal narrative with reflective adult voice on past experience.",
    framing:
      "Memoir is true autobiographical narrative — the writer telling a real story from their own past, with the adult-self reflecting on the younger-self. Unlike a personal essay it is anchored in narrative; unlike a short story it is grounded in fact (or presented as fact). The strongest memoir layers two voices: the younger self in the moment, and the older self looking back with understanding. The examiner rewards honest narration, specific period detail, and the layering of past and present.",
    features: [
      "Past-tense narrative grounded in specific scene",
      "Specific period detail (the song that was playing, the brand of trainer)",
      "Two voices layered: the younger self in the moment, the older self reflecting",
      "Sensory detail to make the past concrete",
      "Restraint — telling, not over-telling, the meaning",
      "A scene that turns or shifts something for the writer",
      "Movement between scene and reflection",
    ],
    primaryTrap:
      "Students confuse memoir with personal essay. Memoir is grounded in a sustained narrative; personal essay can range across moments and reflections more freely.",
    targetLength: "1000-1300 words for HL",
  },
];

export interface GuideTypeMeta {
  key: CompositionGuideType;
  label: string;
  shortLabel: string;
  description: string;
  needsTitle: boolean; // 'plan_a_title' needs a title input
}

export const GUIDE_TYPES: GuideTypeMeta[] = [
  {
    key: "overview",
    label: "Overview",
    shortLabel: "Overview",
    description:
      "What this genre is, when it appears, conventions, structure, length. The umbrella guide.",
    needsTitle: false,
  },
  {
    key: "features",
    label: "Features and Devices",
    shortLabel: "Features",
    description:
      "Genre-specific language techniques and devices, with brief examples of each.",
    needsTitle: false,
  },
  {
    key: "worked_example",
    label: "Worked Example",
    shortLabel: "Worked Example",
    description:
      "A complete strong opening, two middle paragraphs, and a closing — annotated with what each move does.",
    needsTitle: false,
  },
  {
    key: "lift_phrases",
    label: "Lift-ready Phrases",
    shortLabel: "Phrases",
    description:
      "10-15 sentences and transitions a student can adapt directly into their answer.",
    needsTitle: false,
  },
  {
    key: "common_mistakes",
    label: "Common Mistakes",
    shortLabel: "Mistakes",
    description:
      "Where students lose marks in this genre, with the corrective move for each.",
    needsTitle: false,
  },
  {
    key: "plan_a_title",
    label: "Plan a Title",
    shortLabel: "Plan",
    description:
      "Given a sample title, walk through the 5-minute plan and a paragraph-by-paragraph structure.",
    needsTitle: true,
  },
];

export function findGenre(key: string): GenreMeta | undefined {
  return GENRES.find((g) => g.key === key);
}

export function findGuideType(key: string): GuideTypeMeta | undefined {
  return GUIDE_TYPES.find((g) => g.key === key);
}
