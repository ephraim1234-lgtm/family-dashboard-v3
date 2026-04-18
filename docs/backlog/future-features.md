# Future Features Parking Lot

## Purpose

This file is the repo parking lot for ideas that should be remembered without becoming immediate implementation scope.

Items here are not commitments. They are captured ideas for future evaluation.

This file should not become a hidden backlog for things that have already been promoted into active implementation elsewhere.

---

## Promotion rule

When an idea becomes an approved active implementation area, the main ownership/status should move to the roadmap and agent guidance docs.

This file may still keep deferred sub-ideas, but it should not be the main home for currently active product work.

---

## Active expansion follow-ons

The following areas are now active expansion tracks elsewhere in the repo docs:

- reminders / notifications
- external calendar sync
- chores / routines

Keep only deferred sub-ideas or future enhancements for those areas here.

---

## Notifications / reminders follow-ons

- richer reminder timing options
- household digest customization
- more delivery channels
- reminder preference tuning
- reminder grouping / batching behavior

Notes:
Do not build a broad generalized notification engine before a narrow useful reminder slice proves itself.

---

## Calendar integration follow-ons

- multi-provider support
- deeper sync controls
- conflict-management UX
- import-review flows
- bidirectional sync for selected cases

Notes:
Start narrow. Do not assume broad provider coverage or complex sync semantics up front.

---

## Chores / routines follow-ons

- child-specific task views
- due-today household work items
- completion streaks
- gentle accountability views
- display integration for chores

Notes:
Avoid designing reward systems or gamification until the basic task/routine model proves useful.

---

## Strong future candidates

- richer display agenda modes
- display messages / pinned notices
- household-specific quick actions
- multiple display layouts by room/device
- more personalized member views
- color coding or affinity views by household member
- recurring weekly household rhythm views
- simpler guest or viewer display modes
- household dashboard summary page beyond schedule

---

## Food operations ideas

- recipe management
- meal planning calendar
- pantry inventory
- shopping list generation
- cooking mode
- ingredient-to-shopping workflows

Notes:
Keep these grouped as a future Food domain rather than scattering them into unrelated modules early.

---

## Notes / documents ideas

- emergency contact info
- school reference info
- important household documents
- expiration reminders for documents/cards
- quick access info for the display or admin area

Notes:
Basic household notes already exist. Keep future work here focused on broader shared-information and document capabilities beyond the current lightweight notes slice.

---

## Maintenance / operations ideas

- recurring maintenance tasks
- HVAC/filter reminders
- appliance care schedules
- supply replacement reminders
- service history logging

---

## Finance / bill ideas

- bill due date tracking
- reminder support for payments
- budgeting support
- category-level financial planning

Notes:
Treat this as uncertain future scope unless a strong use case emerges.

---

## Integration / testing notes

- future Google Calendar work will likely require `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- some OAuth callback flows and sync-management checks may only be fully verifiable on a hosted machine or other callback-capable environment
- keep local Docker validation strong, but do not assume every external-integration path can be proven only through the local loop

---

## Frictions noticed while using the app

Use this section to capture real-world pain points during development or household usage.

Examples:
- creating recurring events is too cumbersome
- display is visually too noisy from a distance
- member permissions are too coarse in practice
- mobile event editing takes too many taps
- agenda queries are missing an obvious household use case

---

## Ideas needing validation

Use this section for ideas that sound promising but are not yet clearly worth building.

Examples:
- voice-assisted display interaction
- per-room display behavior
- lightweight kiosk interactions from TV
- document OCR or auto-categorization
- heavily personalized schedule views

---

## Rejected or postponed

Use this section to record ideas you intentionally do not want right now, so they do not keep resurfacing without context.

Examples:
- full native mobile apps
- generalized widget marketplace
- deep automation engine
- microservice split by business domain
