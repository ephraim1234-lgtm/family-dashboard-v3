namespace HouseholdOps.Modules.Chores.Contracts;

public sealed record ChoreCompletionItem(
    Guid Id,
    Guid ChoreId,
    string ChoreTitle,
    Guid? CompletedByMembershipId,
    string CompletedByDisplayName,
    DateTimeOffset CompletedAtUtc,
    string? Notes);
