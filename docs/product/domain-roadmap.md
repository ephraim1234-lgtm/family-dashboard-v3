# Domain Roadmap

## Purpose

This document tracks active core domains, active expansion domains, and future candidate domains.

It exists to preserve long-term product intent while keeping implementation scope disciplined.

A domain listed here is not automatically fully implemented, but domains marked as active expansion are approved areas for real implementation work.

---

## Active core domains

### Households

**Purpose**
Provide the household context that all other domains operate within.

**Likely responsibilities**
- household identity
- membership
- coarse roles
- household settings root
- household-scoped access decisions

**Likely key entities**
- Household
- Member
- Membership
- HouseholdSettings

**Current scope**
Active core.

**Notes**
This is foundational and should remain simple early on.

---

### Identity

**Purpose**
Provide authentication and user/session resolution into household context.

**Likely responsibilities**
- authentication
- session identity
- current user resolution
- household membership binding
- authorization helpers/policies
- display token/device access separation

**Likely key entities**
- User
- Session/Auth identity
- DisplayAccessToken or DisplayDeviceCredential

**Current scope**
Active core.

**Notes**
Keep this boring and coherent. Do not build an elaborate permission system in v1.

---

### Scheduling

**Purpose**
Manage the household schedule and provide agenda-oriented planning views.

**Likely responsibilities**
- event lifecycle
- timed and all-day events
- recurrence
- exceptions/overrides
- agenda and time-window queries
- future integration ingestion boundaries

**Likely key entities**
- Event
- EventSeries / RecurrenceRule
- EventException / Override
- EventOccurrence projection or query model

**Current scope**
Active core.

**Notes**
This is a primary product core and a high-risk domain because of recurrence and time semantics.

---

### Display

**Purpose**
Provide ambient household visibility on shared screens and display devices.

**Likely responsibilities**
- display device registration/access
- layout/configuration
- display-safe projections
- device-specific display snapshots
- agenda-focused rendering support

**Likely key entities**
- DisplayDevice
- DisplayLayout
- DisplayConfiguration
- DisplaySnapshot DTO / projection

**Current scope**
Active core.

**Notes**
Display must consume projection/read-model APIs. It should not own scheduling rules.

---

### Administration

**Purpose**
Provide management workflows for household owners/admins.

**Likely responsibilities**
- member management
- household settings management
- display device/layout management
- coarse role management
- admin-oriented workflows

**Likely key entities**
- Admin-facing view models and workflows around existing domains

**Current scope**
Active core.

**Notes**
This is partly a dedicated functional area and partly an application-layer grouping.

---

### Notes

**Purpose**
Provide lightweight shared household notes and pinned information without turning into a generalized document platform.

**Likely responsibilities**
- shared notes
- pinned notes or messages
- simple household information capture
- note-management workflows

**Likely key entities**
- Note

**Current scope**
Implemented support surface, kept intentionally narrow.

**Notes**
Do not use this as evidence that Documents or broader knowledge-management work should be activated.

**Target maturity inside current product scope**
- make note capture, pinning, editing, and visibility feel complete for lightweight household coordination
- support practical shared-information use without introducing document storage, attachments, or knowledge-base abstractions

---

## Active expansion domains

These are approved next implementation areas.

They should be built in narrow, useful slices once the current task justifies forward feature movement. They are not merely "maybe later" ideas.

### Notifications / Reminders

**Why it exists**
The scheduling system becomes much more useful once it can actively remind household members about relevant upcoming events and routines.

**Likely dependencies**
- Households
- Identity
- Scheduling
- Worker infrastructure

**Possible responsibilities**
- reminder scheduling
- digest generation
- future notification channels
- event-based reminder policies

**What should remain deferred initially**
- multi-channel notification complexity
- advanced preference matrices
- broad cross-domain reminder engine

**Possible worker involvement**
High.

**Status**
Active expansion.

**Implementation bias**
Prefer a narrow first slice such as event reminders or a simple household digest before broader notification infrastructure.

**Current implemented slice**
- event reminders tied to scheduled events
- reminder persistence and due-time processing in the worker
- admin reminder management visibility
- reminder-aware display projection support

**Target maturity inside current product scope**
- clearer pending vs overdue vs fired review states
- stronger owner triage flows in Admin and stronger member-facing triage on the app home surface
- dependable reminder ergonomics before any expansion into broader delivery channels

---

### Calendar Integrations

**Why it exists**
Households often need to pull in or align with external calendars.

**Likely dependencies**
- Identity
- Scheduling
- Worker infrastructure
- provider account/linking patterns

**Possible responsibilities**
- external calendar linking
- sync state
- external-to-local mapping
- import/update orchestration

**What should remain deferred initially**
- complex conflict resolution
- too many providers at once
- deep bidirectional sync until local scheduling is solid

**Implementation/testing note**
Future provider work will likely need environment variables such as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, and some OAuth callback or sync-management flows may need hosted-environment validation in addition to local Docker testing.

**Possible worker involvement**
High.

**Status**
Active expansion slice.

**Implementation bias**
Prefer a first narrow provider path and clear sync ownership before broad integration coverage.

**Current first slice**
- Google Calendar iCal feed linking
- manual one-way import into local scheduling
- sync status visibility per linked calendar
- imported events treated as read-only in Scheduling

**Current OAuth foundation slice**
- Google account linking start/callback flow through the web-shell callback path
- persisted Google provider account links owned by Integrations
- admin visibility for OAuth readiness and linked Google accounts
- existing iCal import path remains the active scheduling import path for now

**Current OAuth discovery slice**
- linked Google accounts can discover accessible Google calendars through the Google Calendar API
- expired OAuth access tokens are refreshed server-side before discovery when a refresh token is available
- discovery is admin-visible and can now create provider-managed Google calendar links for one-way import

**Current OAuth-managed import slice**
- managed Google calendar links can sync through Google Calendar API without requiring a copied private iCal URL
- imported events still land in Scheduling as read-only external events
- recurring support remains intentionally narrow and recurring exceptions/overrides are still skipped

**Current hardening additions**
- duplicate feed-link prevention per household
- `TZID` parsing support for imported timed events
- invalid-feed failure handling with persisted sync errors
- consistent read-only enforcement for imported event delete/update paths

**Current next slice**
- worker-managed scheduled sync for already-linked calendars
- per-link next-due scheduling state with a fixed sync cadence
- admin visibility for automatic sync cadence and next scheduled run

**Current recurring import slice**
- import supported `DAILY` recurring external events
- import supported `WEEKLY` recurring external events with weekday mapping
- continue skipping unsupported recurrence patterns explicitly

**Still deferred**
- broader external recurrence support beyond the current narrow subset
- bidirectional sync and conflict resolution

**Target maturity inside current product scope**
- make the current one-way Google path trustworthy, understandable, and low-friction for owners
- improve sync hardening, import transparency, and narrow recurrence coverage without turning Integrations into a generalized provider platform

---

### Chores / Routines

**Why it exists**
Households often need recurring operational task management in addition to schedule visibility.

**Likely dependencies**
- Households
- Identity
- Worker
- possibly Notifications

**Possible responsibilities**
- assignable chores
- recurring household routines
- completion tracking
- future reminders

**What should remain deferred initially**
- advanced gamification
- complex scoring/reward systems
- generalized workflow abstractions

**Status**
Active expansion.

**Implementation bias**
Prefer a basic recurring chores/routines model with clear ownership and simple completion flows before richer engagement ideas.

**Current implemented slice**
- recurring chores with household or member assignment
- completion tracking
- owner/admin management flows
- chore insight and admin-summary support

**Target maturity inside current product scope**
- make recurring household chores dependable for daily use
- improve assignment, completion visibility, and lightweight operational insight
- keep the domain focused on household operations rather than generic work-management patterns

---

## Future candidate domains

These remain intentionally deferred. They should influence naming and architectural discipline, but should not receive speculative code until explicitly promoted.

### Food Operations

**Why it exists**
Meal planning and food logistics are major household coordination needs.

**Potential subdomains**
- Recipes
- Meal Plans
- Pantry
- Shopping
- Cooking Sessions

**Likely dependencies**
- Households
- Scheduling
- future Notifications
- possibly Documents/Notes later

**Likely module boundary**
One broad Food module at first, with subdomains inside it rather than separate early modules.

**What not to design yet**
- broad ingredient normalization systems
- predictive shopping logic
- generalized inventory engine
- overly abstract food domain hierarchy

---

## Notes / shared information status

Lightweight Notes support is implemented already.

Broader shared-information, document-management, and household knowledge-base capabilities remain future scope and should only be activated intentionally.

**Status**
Future candidate, not active.

---

### Notes / Shared Information

**Why it exists**
Households need lightweight shared memory and reference data.

**Possible responsibilities**
- shared notes
- family reference info
- household instructions
- pinned reminders/messages

**Likely dependencies**
- Households
- Identity
- Display later

**What not to design yet**
- document management platform abstractions
- generalized CMS-like models

**Status**
Future candidate, not active.

---

### Household Documents

**Why it exists**
Important records and household documents may eventually belong in the platform.

**Possible responsibilities**
- secure document storage
- categorization
- expiration reminders
- household access control

**Likely dependencies**
- Households
- Identity
- Notifications later

**What not to design yet**
- enterprise-grade document workflows
- external storage abstraction layers too early

**Status**
Future candidate, not active.

---

### Maintenance Tracking

**Why it exists**
Households often need recurring maintenance and service tracking.

**Possible responsibilities**
- recurring maintenance items
- service schedules
- supply replacement reminders
- home systems tracking

**Likely dependencies**
- Households
- Scheduling or Notifications
- Worker

**What not to design yet**
- generalized asset-management abstractions

**Status**
Future candidate, not active.

---

### Budgeting / Bills

**Why it exists**
Some households may eventually want due-date and budgeting coordination.

**Likely dependencies**
- Households
- Notifications
- Documents

**What not to design yet**
- accounting-grade models
- payment integrations
- financial product assumptions

**Status**
Future candidate, uncertain priority.

---

## Promotion rule

A future candidate should be promoted to active expansion when:

- it is intentionally selected as a real next product area
- there is a concrete first slice worth implementing
- the module boundary can be described clearly enough to avoid speculative design

An active expansion area may later be treated as part of the active core once it becomes a stable, ongoing part of normal product reality.

This document should be updated as that progression occurs.

