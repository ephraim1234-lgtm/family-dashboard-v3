using HouseholdOps.Modules.Scheduling.Contracts;

namespace HouseholdOps.Modules.Scheduling;

public interface IScheduleBrowseQueryService
{
    Task<ScheduleBrowseResponse> GetUpcomingBrowseAsync(
        ScheduleBrowseRequest request,
        CancellationToken cancellationToken);
}
