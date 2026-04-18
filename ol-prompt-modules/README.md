# OL Prompt Modules (Build-Ready Skeletons)

**Date:** 18 April 2026
**Belongs to:** OL-SAMPLE-ANSWER-SPEC.md build order, Day 0/1/2
**Location in repo:** these map 1:1 to `lib/claude/olPromptModules/*.ts`

Seven modules, one per OL exam section. Each module exports the same pair of functions:

```typescript
buildSystemPrompt(tier: 'O1' | 'O4' | 'O6'): string
buildUserMessage(input: OLSectionInput): string
```

Shared pieces (declared once in `olPromptShared.ts`, imported by each module):

- `sharedOLRules` (the absolute-rules block)
- `tierOverlays.O1`, `tierOverlays.O4`, `tierOverlays.O6`

Per-module pieces (declared in each module file):

- `sectionRules` (a string, inserted between shared and tier overlay)
- `antiPatternsByTier[tier]` (optional, adds section-specific anti-patterns)
- `buildUserMessage` (the user-message builder; signature differs per section)

Build order of reading: start with `00-olPromptShared.md`, then read any section in any order.

Files in this folder:

1. `00-olPromptShared.md`
2. `01-olComposingPrompt.md`
3. `02-olCompQAPrompt.md`
4. `03-olCompQBPrompt.md`
5. `04-olUnseenPoetryPrompt.md`
6. `05-olPrescribedPoetryPrompt.md`
7. `06-olSingleTextPrompt.md`
8. `07-olComparativePrompt.md`

Each file is a drop-in specification. A Claude Code agent should read the file and produce the corresponding `.ts` file. Prose blocks in triple backticks are the literal prompt text to include in the module.
