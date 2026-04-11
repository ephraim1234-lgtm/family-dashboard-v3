namespace HouseholdOps.Modules.Display.Contracts;

public sealed record DisplayDeviceSummaryResponse(
    Guid DeviceId,
    string DeviceName,
    bool IsActive,
    string PresentationMode,
    string AgendaDensityMode,
    string AccessTokenHint,
    DateTimeOffset CreatedAtUtc);
