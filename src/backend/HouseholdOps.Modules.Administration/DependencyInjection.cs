using HouseholdOps.Modules.Administration.Contracts;
using HouseholdOps.Modules.Identity;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace HouseholdOps.Modules.Administration;

public static class DependencyInjection
{
    public static IServiceCollection AddAdministrationModule(this IServiceCollection services) => services;

    public static IEndpointRouteBuilder MapAdministrationModule(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin");

        group.MapGet("/overview", () =>
        {
            var response = new AdminOverviewResponse(
                ActiveModuleAreas: new[]
                {
                    "Households",
                    "Identity",
                    "Scheduling",
                    "Display",
                    "Administration"
                },
                Notes: new[]
                {
                    "Admin is an application/workflow surface over core domains.",
                    "Coarse household roles only in v1."
                });

            return Results.Ok(response);
        }).RequireAuthorization("ActiveHouseholdOwner");

        group.MapGet("/stats", async (
            IIdentityAccessService identityAccessService,
            IAdminStatsService adminStatsService,
            CancellationToken cancellationToken) =>
        {
            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
            {
                return Results.Unauthorized();
            }

            var stats = await adminStatsService.GetStatsAsync(householdId, cancellationToken);
            return Results.Ok(stats);
        }).RequireAuthorization("ActiveHouseholdOwner");

        group.MapGet("/chore-insights", async (
            IIdentityAccessService identityAccessService,
            IAdminChoreInsightsService adminChoreInsightsService,
            CancellationToken cancellationToken) =>
        {
            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
            {
                return Results.Unauthorized();
            }

            var insights = await adminChoreInsightsService.GetChoreInsightsAsync(householdId, cancellationToken);
            return Results.Ok(insights);
        }).RequireAuthorization("ActiveHouseholdOwner");

        return app;
    }
}
