using HouseholdOps.Modules.Identity.Contracts;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace HouseholdOps.Modules.Identity;

public static class DependencyInjection
{
    public static IServiceCollection AddIdentityModule(this IServiceCollection services)
    {
        services.AddHttpContextAccessor();
        return services;
    }

    public static IEndpointRouteBuilder MapIdentityModule(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/identity");

        group.MapGet("/session", (IIdentityAccessService service) =>
            Results.Ok(service.GetCurrentSession()));

        group.MapPost("/dev-login", async (
            IIdentityAccessService service,
            CancellationToken cancellationToken) =>
        {
            var session = await service.SignInDevelopmentAsync(cancellationToken);
            return session is null ? Results.NotFound() : Results.Ok(session);
        });

        group.MapPost("/logout", async (
            IIdentityAccessService service,
            CancellationToken cancellationToken) =>
        {
            await service.SignOutAsync(cancellationToken);
            return Results.NoContent();
        });

        return app;
    }
}
