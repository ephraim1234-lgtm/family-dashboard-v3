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

        return app;
    }
}
