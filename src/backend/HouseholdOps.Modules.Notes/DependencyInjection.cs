using HouseholdOps.Modules.Identity;
using HouseholdOps.Modules.Notes.Contracts;
using HouseholdOps.SharedKernel.Time;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace HouseholdOps.Modules.Notes;

public static class DependencyInjection
{
    public static IServiceCollection AddNotesModule(this IServiceCollection services) => services;

    public static IEndpointRouteBuilder MapNotesModule(this IEndpointRouteBuilder app)
    {
        var memberGroup = app.MapGroup("/api/notes")
            .RequireAuthorization();

        memberGroup.MapGet("", async (
            IIdentityAccessService identityAccessService,
            INotesService notesService,
            CancellationToken cancellationToken) =>
        {
            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
            {
                return Results.Unauthorized();
            }

            var result = await notesService.ListNotesAsync(householdId, cancellationToken);
            return Results.Ok(result);
        });

        memberGroup.MapPost("", async (
            CreateNoteRequest? request,
            IIdentityAccessService identityAccessService,
            INotesService notesService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            if (request is null || string.IsNullOrWhiteSpace(request.Title))
            {
                return Results.BadRequest("Title is required.");
            }

            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId)
                || !Guid.TryParse(session.UserId, out var userId))
            {
                return Results.Unauthorized();
            }

            var (result, item) = await notesService.CreateNoteAsync(
                householdId, userId, request, clock.UtcNow, cancellationToken);

            return result.Status switch
            {
                NoteMutationStatus.Succeeded => Results.Ok(item),
                NoteMutationStatus.ValidationFailed => Results.BadRequest(result.Error),
                _ => Results.BadRequest("Unable to create note.")
            };
        });

        var ownerGroup = app.MapGroup("/api/notes")
            .RequireAuthorization("ActiveHouseholdOwner");

        ownerGroup.MapDelete("/{noteId:guid}", async (
            Guid noteId,
            IIdentityAccessService identityAccessService,
            INotesService notesService,
            CancellationToken cancellationToken) =>
        {
            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
            {
                return Results.Unauthorized();
            }

            var result = await notesService.DeleteNoteAsync(householdId, noteId, cancellationToken);

            return result.Status switch
            {
                NoteMutationStatus.Deleted => Results.NoContent(),
                NoteMutationStatus.NotFound => Results.NotFound(),
                _ => Results.BadRequest("Unable to delete note.")
            };
        });

        ownerGroup.MapPatch("/{noteId:guid}/pin", async (
            Guid noteId,
            IIdentityAccessService identityAccessService,
            INotesService notesService,
            CancellationToken cancellationToken) =>
        {
            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
            {
                return Results.Unauthorized();
            }

            var (result, item) = await notesService.TogglePinAsync(householdId, noteId, cancellationToken);

            return result.Status switch
            {
                NoteMutationStatus.Succeeded => Results.Ok(item),
                NoteMutationStatus.NotFound => Results.NotFound(),
                _ => Results.BadRequest("Unable to toggle pin.")
            };
        });

        return app;
    }
}
