using HouseholdOps.Modules.Administration.Contracts;
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

        return app;
    }
}
