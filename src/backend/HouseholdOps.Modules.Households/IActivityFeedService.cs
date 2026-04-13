using HouseholdOps.Modules.Households.Contracts;

namespace HouseholdOps.Modules.Households;

public interface IActivityFeedService
{
    Task<ActivityFeedResponse> GetRecentActivityAsync(Guid householdId, CancellationToken cancellationToken);
}
