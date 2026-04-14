namespace HouseholdOps.Modules.Chores.Contracts;

// Inline reassignment from the home chore row: null clears the assignment
// (nobody owns it) and a membership id transfers ownership. Validated
// server-side to ensure the membership actually belongs to this household.
public sealed record ReassignChoreRequest(Guid? AssignedMembershipId);
