using HouseholdOps.Modules.Identity;
using HouseholdOps.Modules.Integrations.Contracts;
using HouseholdOps.SharedKernel.Time;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace HouseholdOps.Modules.Integrations;

public static class DependencyInjection
{
    public static IServiceCollection AddIntegrationsModule(
        this IServiceCollection services) => services;

    public static IEndpointRouteBuilder MapIntegrationsModule(
        this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/integrations")
            .RequireAuthorization("ActiveHouseholdOwner");

        group.MapGet("/google-calendar-links", async (
            IIdentityAccessService identityAccessService,
            IGoogleCalendarIntegrationService integrationService,
            CancellationToken cancellationToken) =>
        {
            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
            {
                return Results.Unauthorized();
            }

            var response = await integrationService.ListAsync(
                householdId,
                cancellationToken);

            return Results.Ok(response);
        });

        group.MapPost("/google-calendar-links", async (
            CreateGoogleCalendarLinkRequest? request,
            IIdentityAccessService identityAccessService,
            IGoogleCalendarIntegrationService integrationService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            if (request is null)
            {
                return Results.BadRequest("A Google Calendar link request is required.");
            }

            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
            {
                return Results.Unauthorized();
            }

            var created = await integrationService.CreateAsync(
                householdId,
                request,
                clock.UtcNow,
                cancellationToken);

            return created.Status switch
            {
                GoogleCalendarLinkMutationStatus.Succeeded => Results.Ok(created.Link),
                GoogleCalendarLinkMutationStatus.ValidationFailed => Results.BadRequest(created.Error),
                GoogleCalendarLinkMutationStatus.Duplicate => Results.Conflict(created.Error),
                _ => Results.BadRequest("Unable to create Google Calendar link.")
            };
        });

        group.MapDelete("/google-calendar-links/{linkId:guid}", async (
            Guid linkId,
            IIdentityAccessService identityAccessService,
            IGoogleCalendarIntegrationService integrationService,
            CancellationToken cancellationToken) =>
        {
            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
            {
                return Results.Unauthorized();
            }

            var deleted = await integrationService.DeleteAsync(
                householdId,
                linkId,
                cancellationToken);

            return deleted ? Results.NoContent() : Results.NotFound();
        });

        group.MapPut("/google-calendar-links/{linkId:guid}/sync-settings", async (
            Guid linkId,
            UpdateGoogleCalendarLinkSyncSettingsRequest? request,
            IIdentityAccessService identityAccessService,
            IGoogleCalendarIntegrationService integrationService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            if (request is null)
            {
                return Results.BadRequest("Sync settings are required.");
            }

            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
            {
                return Results.Unauthorized();
            }

            var updated = await integrationService.UpdateSyncSettingsAsync(
                householdId,
                linkId,
                request,
                clock.UtcNow,
                cancellationToken);

            return updated.Status switch
            {
                GoogleCalendarLinkMutationStatus.Succeeded => Results.Ok(updated.Link),
                GoogleCalendarLinkMutationStatus.ValidationFailed => Results.BadRequest(updated.Error),
                _ => Results.NotFound()
            };
        });

        group.MapPost("/google-calendar-links/{linkId:guid}/sync", async (
            Guid linkId,
            IIdentityAccessService identityAccessService,
            IGoogleCalendarIntegrationService integrationService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
            {
                return Results.Unauthorized();
            }

            var result = await integrationService.SyncAsync(
                householdId,
                linkId,
                clock.UtcNow,
                cancellationToken);

            return result.Status switch
            {
                GoogleCalendarSyncResultStatus.Succeeded => Results.Ok(result.Link),
                GoogleCalendarSyncResultStatus.NotFound => Results.NotFound(),
                GoogleCalendarSyncResultStatus.Failed => Results.BadRequest(result.Error),
                _ => Results.BadRequest("Unable to sync the linked Google Calendar.")
            };
        });

        return app;
    }
}
