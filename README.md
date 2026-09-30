# Clever Fox Journal (for Blinko)

A structured AM/PM journaling plugin, inspired by Clever Fox Journal's paper layout.

## What it does (v0.4)

A **Personal Check Ins** tab in Blinko's sidebar (after To-dos). Everything lives there; the editor
toolbar is untouched.

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

### How the tab is added

Blinko's plugin API has no menu/page hook, so the plugin pushes an entry into
`window.Blinko.store.baseStore.routerList` (what the sidebar renders) and, while the URL is
`/?path=checkins`, mounts its page inside Blinko's `.layout-container`. This relies on Blinko
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
