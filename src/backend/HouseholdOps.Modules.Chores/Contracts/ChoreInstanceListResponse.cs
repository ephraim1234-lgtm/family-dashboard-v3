namespace HouseholdOps.Modules.Chores.Contracts;

public sealed record ChoreInstanceListResponse(IReadOnlyList<ChoreInstanceSummaryResponse> Items);
