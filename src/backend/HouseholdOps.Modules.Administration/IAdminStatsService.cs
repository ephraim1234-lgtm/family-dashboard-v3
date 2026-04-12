using HouseholdOps.Modules.Administration.Contracts;

namespace HouseholdOps.Modules.Administration;

public interface IAdminStatsService
{
    Task<AdminStatsResponse> GetStatsAsync(Guid householdId, CancellationToken cancellationToken);
}
