namespace HouseholdOps.Modules.Chores.Contracts;

public sealed record ChoreCompletionListResponse(IReadOnlyList<ChoreCompletionItem> Completions);
