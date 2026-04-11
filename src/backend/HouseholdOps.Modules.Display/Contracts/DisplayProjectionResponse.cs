namespace HouseholdOps.Modules.Display.Contracts;

public sealed record DisplayProjectionResponse(
    string AccessMode,
    string DeviceName,
    string HouseholdName,
    string AccessTokenHint,
    DateTimeOffset GeneratedAtUtc,
    IReadOnlyList<DisplayProjectionSectionResponse> Sections);
