namespace HouseholdOps.Modules.Administration.Contracts;

public sealed record AdminOverviewResponse(
    IReadOnlyList<string> ActiveModuleAreas,
    IReadOnlyList<string> Notes);
