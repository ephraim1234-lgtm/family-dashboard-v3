namespace HouseholdOps.Modules.Display.Contracts;

public sealed record CreateDisplayDeviceResponse(
    Guid DeviceId,
    string DeviceName,
    string AccessToken,
    string AccessTokenHint,
    string DisplayPath,
    DateTimeOffset CreatedAtUtc);
