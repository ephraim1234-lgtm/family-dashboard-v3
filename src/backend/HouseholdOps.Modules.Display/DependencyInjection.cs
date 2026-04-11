using HouseholdOps.Modules.Display.Contracts;
using HouseholdOps.Modules.Identity;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace HouseholdOps.Modules.Display;

public static class DependencyInjection
{
    public static IServiceCollection AddDisplayModule(this IServiceCollection services) => services;

    public static IEndpointRouteBuilder MapDisplayModule(this IEndpointRouteBuilder app)
    {
        var displayGroup = app.MapGroup("/api/display");

        displayGroup.MapGet("/projection/{token}", async (
            string token,
            IDisplayProjectionService projectionService,
            CancellationToken cancellationToken) =>
        {
            var response = await projectionService.GetProjectionAsync(token, cancellationToken);

            return response is null ? Results.NotFound() : Results.Ok(response);
        });

        var adminGroup = app.MapGroup("/api/admin/display")
            .RequireAuthorization("ActiveHouseholdOwner");

        adminGroup.MapGet("/devices", async (
            IIdentityAccessService identityAccessService,
            IDisplayManagementService displayManagementService,
            CancellationToken cancellationToken) =>
        {
            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
            {
                return Results.Unauthorized();
            }

            var response = await displayManagementService.ListDevicesAsync(
                householdId,
                cancellationToken);

            return Results.Ok(response);
        });

        adminGroup.MapPost("/devices", async (
            CreateDisplayDeviceRequest? request,
            IIdentityAccessService identityAccessService,
            IDisplayManagementService displayManagementService,
            CancellationToken cancellationToken) =>
        {
            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
            {
                return Results.Unauthorized();
            }

            var response = await displayManagementService.CreateDeviceAsync(
                householdId,
                request?.Name,
                cancellationToken);

            return Results.Ok(response);
        });

        adminGroup.MapPut("/devices/{deviceId}/presentation-mode", async (
            Guid deviceId,
            UpdateDisplayPresentationModeRequest? request,
            IIdentityAccessService identityAccessService,
            IDisplayManagementService displayManagementService,
            CancellationToken cancellationToken) =>
        {
            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
            {
                return Results.Unauthorized();
            }

            if (!Enum.TryParse<DisplayPresentationMode>(
                    request?.PresentationMode,
                    ignoreCase: true,
                    out var presentationMode))
            {
                return Results.BadRequest("Presentation mode must be Balanced or FocusNext.");
            }

            var response = await displayManagementService.UpdatePresentationModeAsync(
                householdId,
                deviceId,
                presentationMode,
                cancellationToken);

            return response is null ? Results.NotFound() : Results.Ok(response);
        });

        adminGroup.MapPut("/devices/{deviceId}/agenda-density-mode", async (
            Guid deviceId,
            UpdateDisplayAgendaDensityModeRequest? request,
            IIdentityAccessService identityAccessService,
            IDisplayManagementService displayManagementService,
            CancellationToken cancellationToken) =>
        {
            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
            {
                return Results.Unauthorized();
            }

            if (!Enum.TryParse<DisplayAgendaDensityMode>(
                    request?.AgendaDensityMode,
                    ignoreCase: true,
                    out var agendaDensityMode))
            {
                return Results.BadRequest("Agenda density mode must be Comfortable or Dense.");
            }

            var response = await displayManagementService.UpdateAgendaDensityModeAsync(
                householdId,
                deviceId,
                agendaDensityMode,
                cancellationToken);

            return response is null ? Results.NotFound() : Results.Ok(response);
        });

        return app;
    }
}
