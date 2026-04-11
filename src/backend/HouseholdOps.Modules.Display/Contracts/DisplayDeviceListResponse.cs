namespace HouseholdOps.Modules.Display.Contracts;

public sealed record DisplayDeviceListResponse(
    IReadOnlyList<DisplayDeviceSummaryResponse> Devices);
