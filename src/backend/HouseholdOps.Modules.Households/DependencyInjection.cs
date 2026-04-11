using HouseholdOps.Modules.Households.Contracts;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace HouseholdOps.Modules.Households;

public static class DependencyInjection
{
    public static IServiceCollection AddHouseholdsModule(this IServiceCollection services) => services;

    public static IEndpointRouteBuilder MapHouseholdsModule(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/households");

        group.MapGet("/current", async (
            IHouseholdContextService service,
            CancellationToken cancellationToken) =>
        {
            var householdContext = await service.GetCurrentAsync(cancellationToken);

            if (householdContext is null)
            {
                return Results.Unauthorized();
            }

            return Results.Ok(householdContext);
        }).RequireAuthorization();

        return app;
    }
}
