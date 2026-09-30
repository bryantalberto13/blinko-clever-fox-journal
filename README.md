# Clever Fox Journal (for Blinko)

A structured AM/PM journaling plugin, inspired by Clever Fox Journal's paper layout.

## What it does (v0.1)

- **Two toolbar buttons** — Morning Journal (sunrise icon) and Evening Journal (crescent icon) —
  each opens a clean form instead of making you type raw Markdown.
- **Morning fields:** Daily Focus, Gratitude, Self-Compassion Intention.
- **Evening fields:** Evening Wins, What Actually Absorbed My Time Today, Reflection / Tomorrow's Focus.
- **Persistent "Top 3 Weekly Goals"** card: editable each morning, shown read-only each evening,
  and automatically injected at the top of every morning entry. Stored via the plugin's own
  config (`window.Blinko.api.config.*`), keyed to the ISO week so it prompts a refresh weekly.
- **Auto-tagging:** every entry is saved with `#journal/morning` or `#journal/evening`, plus a
  per-day tag (`#journal/YYYY-MM-DD`) so a single day's AM/PM pair is easy to pull together later.
  Blinko extracts these automatically from note content — no separate tag API call needed.

## v0.3 additions

- **Evening pre-fill:** the evening form shows this morning's Daily Focus and turns the weekly goals
  into a check-off list ("moved forward today"), saved in the note as a `**Goal Check**` section.
- **Edit in place:** if today's morning/evening entry already exists, the form loads it and saving
  updates that note instead of creating a duplicate.
- **Mood & energy:** 1-5 pickers on both forms, saved as `**Mood:** 4/5 | **Energy:** 3/5`.
- **Journal Insights panel:** streak counter, mood/energy chart, per-goal follow-through bars, and
  two AI actions over your configured Main Chat Model (`ai.completions`, RAG/tools off):
  - *Analyze trends* (7/14/30 days): mood patterns, blockers, goal progress, and morning-intention
    vs. evening-reality discrepancies matched by the `#journal/YYYY-MM-DD` tag.
  - *Weekly review*: goal completion, wins, time sinks, mood, plus 3 suggested goals. "Use as next
    week's goals" stores them and pre-fills the first morning form of the new week.
  - Either result can be saved as a note (`#journal/insights` or `#journal/review`).

Entry parsing/formatting and stats are covered by `bun test`.

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
