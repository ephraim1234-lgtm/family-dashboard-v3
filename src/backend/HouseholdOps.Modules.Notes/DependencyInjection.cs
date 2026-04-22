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
            var access = identityAccessService.GetCurrentAccess();
            if (!access.ActiveHouseholdId.HasValue)
            {
                return Results.Forbid();
            }

            var result = await notesService.ListNotesAsync(access.ActiveHouseholdId.Value, cancellationToken);
            return Results.Ok(result);
        });

        memberGroup.MapPatch("/{noteId:guid}", async (
            Guid noteId,
            UpdateNoteRequest? request,
            IIdentityAccessService identityAccessService,
            INotesService notesService,
            CancellationToken cancellationToken) =>
        {
            if (request is null)
            {
                return Results.BadRequest("Request body is required.");
            }

            var access = identityAccessService.GetCurrentAccess();
            if (!access.ActiveHouseholdId.HasValue || !access.UserId.HasValue)
            {
                return Results.Forbid();
            }

            var (result, item) = await notesService.UpdateNoteAsync(
                access.ActiveHouseholdId.Value,
                noteId,
                access.UserId.Value,
                request,
                cancellationToken);

            return result.Status switch
            {
                NoteMutationStatus.Succeeded => Results.Ok(item),
                NoteMutationStatus.ValidationFailed => Results.BadRequest(result.Error),
                NoteMutationStatus.Forbidden => Results.Forbid(),
                NoteMutationStatus.NotFound => Results.NotFound(),
                _ => Results.BadRequest("Unable to update note.")
            };
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

            var access = identityAccessService.GetCurrentAccess();
            if (!access.ActiveHouseholdId.HasValue || !access.UserId.HasValue)
            {
                return Results.Forbid();
            }

            var (result, item) = await notesService.CreateNoteAsync(
                access.ActiveHouseholdId.Value,
                access.UserId.Value,
                request,
                clock.UtcNow,
                cancellationToken);

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
            var access = identityAccessService.GetCurrentAccess();
            if (!access.ActiveHouseholdId.HasValue)
            {
                return Results.Forbid();
            }

            var result = await notesService.DeleteNoteAsync(access.ActiveHouseholdId.Value, noteId, cancellationToken);

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
            var access = identityAccessService.GetCurrentAccess();
            if (!access.ActiveHouseholdId.HasValue)
            {
                return Results.Forbid();
            }

            var (result, item) = await notesService.TogglePinAsync(access.ActiveHouseholdId.Value, noteId, cancellationToken);

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
