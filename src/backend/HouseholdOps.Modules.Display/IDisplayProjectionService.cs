using HouseholdOps.Modules.Display.Contracts;

namespace HouseholdOps.Modules.Display;

public interface IDisplayProjectionService
{
    Task<DisplayProjectionResponse?> GetProjectionAsync(
        string accessToken,
        CancellationToken cancellationToken);
}
