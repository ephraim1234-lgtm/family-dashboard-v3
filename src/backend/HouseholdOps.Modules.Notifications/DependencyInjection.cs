using HouseholdOps.Modules.Identity;
using HouseholdOps.Modules.Notifications.Contracts;
using HouseholdOps.SharedKernel.Time;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace HouseholdOps.Modules.Notifications;

public static class DependencyInjection
{
    public static IServiceCollection AddNotificationsModule(
        this IServiceCollection services) => services;

    public static IEndpointRouteBuilder MapNotificationsModule(
        this IEndpointRouteBuilder app)
    {
        var readGroup = app.MapGroup("/api/notifications")
            .RequireAuthorization();

        readGroup.MapGet("/reminders", async (
            IIdentityAccessService identityAccessService,
            IEventReminderService reminderService,
            CancellationToken cancellationToken) =>
        {
            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
            {
                return Results.Unauthorized();
            }

            var response = await reminderService.ListRemindersAsync(
                householdId,
                string.Equals(session.ActiveHouseholdRole, "Owner", StringComparison.Ordinal),
                cancellationToken);

            return Results.Ok(response);
        });

        var group = app.MapGroup("/api/notifications")
            .RequireAuthorization("ActiveHouseholdOwner");

        group.MapPost("/reminders", async (
            CreateEventReminderRequest? request,
            IIdentityAccessService identityAccessService,
            IEventReminderService reminderService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            if (request is null)
            {
                return Results.BadRequest("A reminder request is required.");
            }

            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
            {
                return Results.Unauthorized();
            }

            var result = await reminderService.CreateReminderAsync(
                householdId,
                request,
                clock.UtcNow,
                cancellationToken);

            return result.Status switch
            {
                EventReminderMutationStatus.Succeeded => Results.Ok(result.Reminder),
                EventReminderMutationStatus.ValidationFailed => Results.BadRequest(result.Error),
                _ => Results.BadRequest("Unable to create reminder.")
            };
        });

        group.MapPost("/reminders/{reminderId:guid}/dismiss", async (
            Guid reminderId,
            IIdentityAccessService identityAccessService,
            IEventReminderService reminderService,
            CancellationToken cancellationToken) =>
        {
            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
            {
                return Results.Unauthorized();
            }

            var result = await reminderService.DismissReminderAsync(
                householdId,
                reminderId,
                cancellationToken);

            return result.Status switch
            {
                EventReminderMutationStatus.Succeeded => Results.Ok(result.Reminder),
                EventReminderMutationStatus.NotFound => Results.NotFound(),
                _ => Results.BadRequest("Unable to dismiss reminder.")
            };
        });

        group.MapPost("/reminders/{reminderId:guid}/snooze", async (
            Guid reminderId,
            SnoozeReminderRequest? request,
            IIdentityAccessService identityAccessService,
            IEventReminderService reminderService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            if (request is null)
            {
                return Results.BadRequest("A snooze request is required.");
            }

            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
            {
                return Results.Unauthorized();
            }

            var result = await reminderService.SnoozeReminderAsync(
                householdId,
                reminderId,
                request.SnoozeMinutes,
                clock.UtcNow,
                cancellationToken);

            return result.Status switch
            {
                EventReminderMutationStatus.Succeeded => Results.Ok(result.Reminder),
                EventReminderMutationStatus.NotFound => Results.NotFound(),
                EventReminderMutationStatus.ValidationFailed => Results.BadRequest(result.Error),
                _ => Results.BadRequest("Unable to snooze reminder.")
            };
        });

        group.MapDelete("/reminders/{reminderId:guid}", async (
            Guid reminderId,
            IIdentityAccessService identityAccessService,
            IEventReminderService reminderService,
            CancellationToken cancellationToken) =>
        {
            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
            {
                return Results.Unauthorized();
            }

            var deleted = await reminderService.DeleteReminderAsync(
                householdId,
                reminderId,
                cancellationToken);

            return deleted.Status switch
            {
                EventReminderMutationStatus.Succeeded => Results.NoContent(),
                EventReminderMutationStatus.NotFound => Results.NotFound(),
                _ => Results.BadRequest(deleted.Error ?? "Unable to delete reminder.")
            };
        });

        return app;
    }
}
