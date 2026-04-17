namespace HouseholdOps.Modules.Chores.Contracts;

public sealed record ChoreListResponse(IReadOnlyList<ChoreSummaryResponse> Items);
