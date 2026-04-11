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
}
