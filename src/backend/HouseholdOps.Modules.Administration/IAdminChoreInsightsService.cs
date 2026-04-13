using HouseholdOps.Modules.Administration.Contracts;

namespace HouseholdOps.Modules.Administration;

public interface IAdminChoreInsightsService
{
    Task<AdminChoreInsightsResponse> GetChoreInsightsAsync(Guid householdId, CancellationToken cancellationToken);
}
