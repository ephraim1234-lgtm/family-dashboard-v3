namespace HouseholdOps.Modules.Display.Contracts;

public sealed record DisplayDeviceSummaryResponse(
    Guid DeviceId,
    string DeviceName,
    bool IsActive,
    string AccessTokenHint,
    DateTimeOffset CreatedAtUtc);
