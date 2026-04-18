# Index patterns in this repo

## Existing patterns

- Household-scoped indexes for lookups by `HouseholdId`
- Composite unique identity for imported scheduled events
- Filtered unique indexes for optional external identity columns
- Reminder due-time index by status and due timestamp
- Completion and notes indexes optimized for recent household views

## Review questions

- What exact query or uniqueness rule requires this index?
- Does the left-most order of a composite index match the main filter pattern?
- Would a partial index reduce write cost and index size without hiding needed rows?
- Does the changed query return only the columns it really needs?
