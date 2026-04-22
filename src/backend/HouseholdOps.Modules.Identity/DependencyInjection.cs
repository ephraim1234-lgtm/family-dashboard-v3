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

        group.MapPost("/signup", async (
            SignUpRequest? request,
            IIdentityAccessService service,
            CancellationToken cancellationToken) =>
        {
            if (request is null)
            {
                return Results.BadRequest("Request body is required.");
            }

            var result = await service.SignUpAsync(request, cancellationToken);
            return result.Status switch
            {
                IdentityCommandStatus.Succeeded => Results.Ok(result.Session),
                IdentityCommandStatus.ValidationFailed => Results.BadRequest(result.Error),
                IdentityCommandStatus.Conflict => Results.Conflict(result.Error),
                _ => Results.BadRequest("Unable to create the account.")
            };
        });

        group.MapPost("/login", async (
            LoginRequest? request,
            IIdentityAccessService service,
            CancellationToken cancellationToken) =>
        {
            if (request is null)
            {
                return Results.BadRequest("Request body is required.");
            }

            var result = await service.LoginAsync(request, cancellationToken);
            return result.Status switch
            {
                IdentityCommandStatus.Succeeded => Results.Ok(result.Session),
                IdentityCommandStatus.InvalidCredentials => Results.Unauthorized(),
                IdentityCommandStatus.ValidationFailed => Results.BadRequest(result.Error),
                _ => Results.BadRequest("Unable to sign in.")
            };
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
