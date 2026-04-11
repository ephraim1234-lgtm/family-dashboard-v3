using HouseholdOps.Modules.Scheduling.Contracts;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace HouseholdOps.Modules.Scheduling;

public static class DependencyInjection
{
    public static IServiceCollection AddSchedulingModule(this IServiceCollection services) => services;

    public static IEndpointRouteBuilder MapSchedulingModule(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/scheduling");

        group.MapGet("/agenda", () =>
        {
            var response = new AgendaWindowResponse(
                RangeStartUtc: DateTimeOffset.UtcNow,
                RangeEndUtc: DateTimeOffset.UtcNow.AddDays(7),
                Notes: new[]
                {
                    "Scheduling owns recurrence behavior.",
                    "Bootstrap only wires an explicit agenda contract; recurrence expansion is not implemented yet."
                });

            return Results.Ok(response);
        });

        return app;
    }
}
