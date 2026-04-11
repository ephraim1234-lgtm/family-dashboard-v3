namespace HouseholdOps.Modules.Display.Contracts;

public sealed record CreateDisplayDeviceResponse(
    Guid DeviceId,
    string DeviceName,
    string PresentationMode,
    string AgendaDensityMode,
    string AccessToken,
    string AccessTokenHint,
    string DisplayPath,
    DateTimeOffset CreatedAtUtc);
