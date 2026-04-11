using HouseholdOps.Modules.Display.Contracts;

namespace HouseholdOps.Modules.Display;

public interface IDisplayManagementService
{
    Task<DisplayDeviceListResponse> ListDevicesAsync(
        Guid householdId,
        CancellationToken cancellationToken);

    Task<CreateDisplayDeviceResponse> CreateDeviceAsync(
        Guid householdId,
        string? requestedName,
        CancellationToken cancellationToken);

    Task<DisplayDeviceSummaryResponse?> UpdatePresentationModeAsync(
        Guid householdId,
        Guid deviceId,
        DisplayPresentationMode presentationMode,
        CancellationToken cancellationToken);

    Task<DisplayDeviceSummaryResponse?> UpdateAgendaDensityModeAsync(
        Guid householdId,
        Guid deviceId,
        DisplayAgendaDensityMode agendaDensityMode,
        CancellationToken cancellationToken);
}
