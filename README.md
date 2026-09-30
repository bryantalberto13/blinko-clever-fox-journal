# Clever Fox Journal (for Blinko)

A structured AM/PM journaling plugin, inspired by Clever Fox Journal's paper layout.

## What it does (v0.5)

Three tabs in Blinko's sidebar (after To-dos); the editor toolbar is untouched.

### Personal Check Ins

- **Guided check-ins:** full-page Morning and Evening check-ins (not a popover).
  - Morning: mood, energy, daily focus, gratitude, self-compassion, and your weekly top-3 goals.
  - Evening: mood, energy, this morning's plan for reference, a goal check-off list, wins, what
    absorbed your time, and reflection.
- **Descriptive moods with icons:** 😄 Joyful, 🥰 Grateful, 🤩 Motivated, 😊 Content, 😌 Calm,
  🙂 Hopeful, 😐 Neutral, 😴 Tired, 😰 Anxious, 😤 Frustrated, 😔 Sad, 😩 Overwhelmed; energy:
  ⚡ Charged, 🔥 Energized, 🔋 Steady, 🪫 Low, 💤 Drained. Stored as text
  (`**Mood:** 😊 Content | **Energy:** 🪫 Low`); older `N/5` entries still parse.
- **Dashboard:** today's status, streak, last-14-days mood strip and chart, goal follow-through,
  and a history list where any check-in can be edited in place (no duplicates).
- **📈 Analyze trends** (7/14/30 days) and **📅 Weekly report**, run over your configured Main Chat
  Model (`ai.completions`, RAG/tools off). The report suggests 3 goals; "Use as next week's goals"
  pre-fills the first morning check-in of the new week. Results can be saved as notes.
- Check-ins are ordinary notes (type Blinko) tagged `#journal/morning` / `#journal/evening` plus
  `#journal/YYYY-MM-DD`, so they also appear in the normal feed and search.

### Guided Journal

**✨ Generate a prompt** asks your configured Main Chat Model for one fresh reflective prompt plus two
"go deeper" questions. Each request is seeded with a random theme and angle and the last few prompts
(kept in plugin config) so results differ from run to run. Write a response and save it as a note
tagged `#journal/guided`; earlier entries are listed below.

### Guided Exploration

Describe the problem or thoughts, pick one of four frameworks, and get 3-4 sequential questions:

| Option | Lens | Best for |
|---|---|---|
| 1 The Thought-Loop Untangler | CBT | Negative thinking, worry, self-doubt |
| 2 The Deep-Dive Chain Reaction | DBT | A specific reaction or impulsive behavior |
| 3 The Value & Meaning Alignment | ACT | Feeling stuck, avoiding hard choices |
| 4 The Root Pattern Tracer | Psychodynamic | The same problem recurring |

The system prompt (`src/prompts.ts`) is the framework template with a safety line: if someone
describes a crisis, the model is told to respond with care and point to real support instead of
running the exercise. Answers can be saved as a note tagged `#journal/exploration`. This is a
self-reflection tool, not therapy.

### How the tabs are added

Blinko's plugin API has no menu/page hook, so the plugin pushes entries into
`window.Blinko.store.baseStore.routerList` (what the sidebar renders) and, while the URL is
`/?path=<tab>`, mounts that tab's page inside Blinko's `.layout-container`. This relies on Blinko
internals and may need adjusting after major Blinko UI changes.

## Not included / out of scope

- **Handwriting/stylus canvas + OCR** — not feasible with the current plugin API (no canvas
  primitive or OCR pipeline exposed); would require a separate external service.
- **Calendar integration** — no calendar hook exists in the plugin API; would need a from-scratch
  integration with your calendar provider's own API.

## Install

1. Zip this folder (or point Blinko's plugin loader at it, per Blinko's plugin dev docs).
2. In Blinko: Settings → Plugin Setting → Install/Load plugin.
3. Two new icons appear in the note-editor toolbar.

## Development

Built on the official `blinko-plugin-template` (Preact + SystemJS). See `blinko-plugin-marketplace`
DEV.md for the standard build/package flow (`bun install && bun run build`, then zip `release/`).
