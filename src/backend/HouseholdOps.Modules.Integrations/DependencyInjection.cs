using HouseholdOps.Modules.Identity;
using HouseholdOps.Modules.Integrations.Contracts;
using HouseholdOps.SharedKernel.Time;
using System.Security.Cryptography;
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
        app.MapGet("/api/integrations/google-oauth/callback", async (
            HttpContext httpContext,
            IIdentityAccessService identityAccessService,
            IGoogleCalendarIntegrationService integrationService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            var state = httpContext.Request.Query["state"].ToString();
            var code = httpContext.Request.Query["code"].ToString();
            var error = httpContext.Request.Query["error"].ToString();
            var expectedState = httpContext.Request.Cookies[GoogleOAuthStateCookieName];
            var session = identityAccessService.GetCurrentSession();

            httpContext.Response.Cookies.Delete(GoogleOAuthStateCookieName, BuildStateCookieOptions(httpContext, clock.UtcNow));

            if (!string.IsNullOrWhiteSpace(error))
            {
                return Results.Redirect($"/admin?google_oauth=error&reason={Uri.EscapeDataString(error)}");
            }

            if (string.IsNullOrWhiteSpace(state)
                || string.IsNullOrWhiteSpace(expectedState)
                || !string.Equals(state, expectedState, StringComparison.Ordinal))
            {
                return Results.Redirect("/admin?google_oauth=invalid-state");
            }

            if (!session.IsAuthenticated
                || !Guid.TryParse(session.ActiveHouseholdId, out var householdId)
                || !Guid.TryParse(session.UserId, out var userId))
            {
                return Results.Redirect("/admin?google_oauth=missing-session");
            }

            if (!string.Equals(session.ActiveHouseholdRole, "Owner", StringComparison.Ordinal))
            {
                return Results.Redirect("/admin?google_oauth=forbidden");
            }

            if (string.IsNullOrWhiteSpace(code))
            {
                return Results.Redirect("/admin?google_oauth=missing-code");
            }

            try
            {
                await integrationService.CompleteOAuthLinkAsync(
                    householdId,
                    userId,
                    code,
                    clock.UtcNow,
                    cancellationToken);

                return Results.Redirect("/admin?google_oauth=linked");
            }
            catch (Exception exception)
            {
                return Results.Redirect($"/admin?google_oauth=failed&reason={Uri.EscapeDataString(exception.Message)}");
            }
        });

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

        group.MapGet("/google-oauth/accounts", async (
            IIdentityAccessService identityAccessService,
            IGoogleCalendarIntegrationService integrationService,
            CancellationToken cancellationToken) =>
        {
            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
            {
                return Results.Unauthorized();
            }

            var response = await integrationService.ListOAuthAccountsAsync(
                householdId,
                cancellationToken);

            return Results.Ok(response);
        });

        group.MapGet("/google-oauth/calendars", async (
            IIdentityAccessService identityAccessService,
            IGoogleCalendarIntegrationService integrationService,
            CancellationToken cancellationToken) =>
        {
            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
            {
                return Results.Unauthorized();
            }

            var response = await integrationService.ListOAuthCalendarsAsync(
                householdId,
                cancellationToken);

            return Results.Ok(response);
        });

        group.MapPost("/google-oauth/calendars/link", async (
            CreateManagedGoogleCalendarLinkRequest? request,
            IIdentityAccessService identityAccessService,
            IGoogleCalendarIntegrationService integrationService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            if (request is null)
            {
                return Results.BadRequest("A discovered Google calendar request is required.");
            }

            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
            {
                return Results.Unauthorized();
            }

            var created = await integrationService.CreateManagedLinkAsync(
                householdId,
                request,
                clock.UtcNow,
                cancellationToken);

            return created.Status switch
            {
                GoogleCalendarLinkMutationStatus.Succeeded => Results.Ok(created.Link),
                GoogleCalendarLinkMutationStatus.ValidationFailed => Results.BadRequest(created.Error),
                GoogleCalendarLinkMutationStatus.Duplicate => Results.Conflict(created.Error),
                _ => Results.BadRequest("Unable to create the managed Google Calendar link.")
            };
        });

        group.MapGet("/google-oauth/readiness", (
            IGoogleCalendarIntegrationService integrationService) =>
            Results.Ok(integrationService.GetOAuthReadiness()));

        group.MapPost("/google-oauth/start", (
            HttpContext httpContext,
            IGoogleCalendarIntegrationService integrationService,
            IClock clock) =>
        {
            var state = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
            httpContext.Response.Cookies.Append(
                GoogleOAuthStateCookieName,
                state,
                BuildStateCookieOptions(httpContext, clock.UtcNow));

            return Results.Ok(integrationService.BeginOAuthLink(state));
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

    private const string GoogleOAuthStateCookieName = "google_oauth_state";

    private static CookieOptions BuildStateCookieOptions(
        HttpContext httpContext,
        DateTimeOffset now) =>
        new()
        {
            HttpOnly = true,
            IsEssential = true,
            SameSite = SameSiteMode.Lax,
            Secure = httpContext.Request.IsHttps,
            Expires = now.AddMinutes(10),
            Path = "/api/integrations/google-oauth/callback"
        };
}
