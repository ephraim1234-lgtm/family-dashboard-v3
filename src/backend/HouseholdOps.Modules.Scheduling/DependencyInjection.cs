using HouseholdOps.Modules.Identity;
using HouseholdOps.Modules.Scheduling.Contracts;
using HouseholdOps.SharedKernel.Time;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace HouseholdOps.Modules.Scheduling;

public static class DependencyInjection
{
    public static IServiceCollection AddSchedulingModule(this IServiceCollection services) => services;

    public static IEndpointRouteBuilder MapSchedulingModule(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/scheduling")
            .RequireAuthorization("ActiveHouseholdOwner");

        group.MapGet("/events", async (
            IIdentityAccessService identityAccessService,
            IAgendaQueryService agendaQueryService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
            {
                return Results.Unauthorized();
            }

            var windowStart = clock.UtcNow;
            var windowEnd = windowStart.AddDays(30);

            var response = await agendaQueryService.GetUpcomingEventsAsync(
                new UpcomingEventsRequest(householdId, windowStart, windowEnd, IsOwner: true),
                cancellationToken);

            return Results.Ok(response);
        });

        group.MapGet("/events/browse", async (
            IIdentityAccessService identityAccessService,
            IScheduleBrowseQueryService browseQueryService,
            IClock clock,
            HttpRequest request,
            CancellationToken cancellationToken) =>
        {
            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
            {
                return Results.Unauthorized();
            }

            var windowDays = ScheduleWindowQueryParser.ParseWindowDays(request.Query["days"]);
            var windowStart = ScheduleWindowQueryParser.ParseWindowStartUtc(request.Query["startUtc"], clock.UtcNow);
            var windowEnd = windowStart.AddDays(windowDays);

            var response = await browseQueryService.GetUpcomingBrowseAsync(
                new ScheduleBrowseRequest(householdId, windowStart, windowEnd, windowDays),
                cancellationToken);

            return Results.Ok(response);
        });

        group.MapPost("/events", async (
            CreateScheduledEventRequest? request,
            IIdentityAccessService identityAccessService,
            IScheduledEventManagementService eventManagementService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            if (request is null || string.IsNullOrWhiteSpace(request.Title))
            {
                return Results.BadRequest("Title is required.");
            }

            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
            {
                return Results.Unauthorized();
            }

            var created = await eventManagementService.CreateEventAsync(
                householdId,
                request,
                clock.UtcNow,
                cancellationToken);

            return created.Status switch
            {
                ScheduledEventMutationStatus.Succeeded => Results.Ok(created.Event),
                ScheduledEventMutationStatus.ValidationFailed => Results.BadRequest(created.Error),
                _ => Results.BadRequest("Unable to create scheduled event.")
            };
        });

        group.MapGet("/events/series", async (
            IIdentityAccessService identityAccessService,
            IScheduledEventManagementService eventManagementService,
            CancellationToken cancellationToken) =>
        {
            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
            {
                return Results.Unauthorized();
            }

            var response = await eventManagementService.ListEventsAsync(
                householdId,
                cancellationToken);

            return Results.Ok(response);
        });

        group.MapPut("/events/{eventId:guid}", async (
            Guid eventId,
            UpdateScheduledEventRequest? request,
            IIdentityAccessService identityAccessService,
            IScheduledEventManagementService eventManagementService,
            CancellationToken cancellationToken) =>
        {
            if (request is null || string.IsNullOrWhiteSpace(request.Title))
            {
                return Results.BadRequest("Title is required.");
            }

            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
            {
                return Results.Unauthorized();
            }

            var updated = await eventManagementService.UpdateEventAsync(
                householdId,
                eventId,
                request,
                cancellationToken);

            return updated.Status switch
            {
                ScheduledEventMutationStatus.Succeeded => Results.Ok(updated.Event),
                ScheduledEventMutationStatus.ValidationFailed => Results.BadRequest(updated.Error),
                ScheduledEventMutationStatus.ReadOnly => Results.Conflict(updated.Error),
                ScheduledEventMutationStatus.NotFound => Results.NotFound(),
                _ => Results.BadRequest("Unable to update scheduled event.")
            };
        });

        group.MapDelete("/events/{eventId:guid}", async (
            Guid eventId,
            IIdentityAccessService identityAccessService,
            IScheduledEventManagementService eventManagementService,
            CancellationToken cancellationToken) =>
        {
            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
            {
                return Results.Unauthorized();
            }

            var deleted = await eventManagementService.DeleteEventAsync(
                householdId,
                eventId,
                cancellationToken);

            return deleted.Status switch
            {
                ScheduledEventMutationStatus.Succeeded => Results.NoContent(),
                ScheduledEventMutationStatus.ReadOnly => Results.Conflict(deleted.Error),
                ScheduledEventMutationStatus.NotFound => Results.NotFound(),
                _ => Results.BadRequest("Unable to delete scheduled event.")
            };
        });

        var memberGroup = app.MapGroup("/api/scheduling")
            .RequireAuthorization();

        memberGroup.MapPost("/events/member", async (
            CreateMemberEventRequest? request,
            IIdentityAccessService identityAccessService,
            IScheduledEventManagementService eventManagementService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            if (request is null || string.IsNullOrWhiteSpace(request.Title))
            {
                return Results.BadRequest("Title is required.");
            }

            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
            {
                return Results.Unauthorized();
            }

            var createRequest = new CreateScheduledEventRequest(
                request.Title,
                request.Description,
                request.IsAllDay,
                request.StartsAtUtc,
                request.EndsAtUtc,
                Recurrence: null);

            var created = await eventManagementService.CreateEventAsync(
                householdId,
                createRequest,
                clock.UtcNow,
                cancellationToken);

            return created.Status switch
            {
                ScheduledEventMutationStatus.Succeeded => Results.Ok(created.Event),
                ScheduledEventMutationStatus.ValidationFailed => Results.BadRequest(created.Error),
                _ => Results.BadRequest("Unable to create event.")
            };
        });

        memberGroup.MapGet("/agenda", async (
            IIdentityAccessService identityAccessService,
            IAgendaQueryService agendaQueryService,
            IClock clock,
            HttpRequest request,
            CancellationToken cancellationToken) =>
        {
            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
            {
                return Results.Unauthorized();
            }

            var windowDays = ScheduleWindowQueryParser.ParseWindowDays(
                request.Query["days"],
                fallbackDays: 14);
            var windowStart = ScheduleWindowQueryParser.ParseWindowStartUtc(
                request.Query["startUtc"],
                clock.UtcNow);
            var windowEnd = windowStart.AddDays(windowDays);

            var response = await agendaQueryService.GetUpcomingEventsAsync(
                new UpcomingEventsRequest(
                    householdId,
                    windowStart,
                    windowEnd,
                    IsOwner: string.Equals(
                        session.ActiveHouseholdRole,
                        "Owner",
                        StringComparison.Ordinal)),
                cancellationToken);

            return Results.Ok(response);
        });

        return app;
    }
}
