using HouseholdOps.Modules.Households.Contracts;
using HouseholdOps.Modules.Identity;
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
        var group = app.MapGroup("/api/households").RequireAuthorization();

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
        });

        group.MapGet("/members", async (
            IIdentityAccessService identityAccessService,
            IHouseholdContextService householdContextService,
            CancellationToken cancellationToken) =>
        {
            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
                return Results.Unauthorized();

            var response = await householdContextService.ListMembersAsync(householdId, cancellationToken);
            return Results.Ok(response);
        });

        return app;
    }
}
