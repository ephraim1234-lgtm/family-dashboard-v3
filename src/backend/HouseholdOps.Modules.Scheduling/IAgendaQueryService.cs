using HouseholdOps.Modules.Scheduling.Contracts;

namespace HouseholdOps.Modules.Scheduling;

public interface IAgendaQueryService
{
    Task<UpcomingEventsResponse> GetUpcomingEventsAsync(
        UpcomingEventsRequest request,
        CancellationToken cancellationToken);
}
