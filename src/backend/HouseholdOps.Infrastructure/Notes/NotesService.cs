using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Modules.Notes;
using HouseholdOps.Modules.Notes.Contracts;
using Microsoft.EntityFrameworkCore;

namespace HouseholdOps.Infrastructure.Notes;

public sealed class NotesService(HouseholdOpsDbContext dbContext) : INotesService
{
    public async Task<NoteListResponse> ListNotesAsync(
        Guid householdId,
        CancellationToken cancellationToken)
    {
        var notes = await dbContext.Notes
            .Where(n => n.HouseholdId == householdId)
            .OrderByDescending(n => n.IsPinned)
            .ThenByDescending(n => n.CreatedAtUtc)
            .Select(n => ToItem(n))
            .ToListAsync(cancellationToken);

        return new NoteListResponse(notes);
    }

    public async Task<(NoteMutationResult Result, NoteItem? Item)> CreateNoteAsync(
        Guid householdId,
        Guid userId,
        CreateNoteRequest request,
        DateTimeOffset createdAtUtc,
        CancellationToken cancellationToken)
    {
        var title = request.Title?.Trim();
        if (string.IsNullOrWhiteSpace(title))
        {
            return (NoteMutationResult.ValidationFailure("Title is required."), null);
        }

        var authorName = await (
            from m in dbContext.Memberships
            join u in dbContext.Users on m.UserId equals u.Id
            where m.HouseholdId == householdId && m.UserId == userId
            select u.DisplayName)
            .FirstOrDefaultAsync(cancellationToken) ?? "Unknown";

        var membershipId = await dbContext.Memberships
            .Where(m => m.HouseholdId == householdId && m.UserId == userId)
            .Select(m => (Guid?)m.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var note = new Note
        {
            HouseholdId = householdId,
            Title = title,
            Body = request.Body?.Trim(),
            AuthorMembershipId = membershipId,
            AuthorDisplayName = authorName,
            IsPinned = false,
            CreatedAtUtc = createdAtUtc
        };

        dbContext.Notes.Add(note);
        await dbContext.SaveChangesAsync(cancellationToken);

        return (NoteMutationResult.Success(), ToItem(note));
    }

    public async Task<NoteMutationResult> DeleteNoteAsync(
        Guid householdId,
        Guid noteId,
        CancellationToken cancellationToken)
    {
        var note = await dbContext.Notes
            .SingleOrDefaultAsync(n => n.HouseholdId == householdId && n.Id == noteId, cancellationToken);

        if (note is null)
        {
            return NoteMutationResult.NotFound();
        }

        dbContext.Notes.Remove(note);
        await dbContext.SaveChangesAsync(cancellationToken);

        return NoteMutationResult.Deleted();
    }

    public async Task<(NoteMutationResult Result, NoteItem? Item)> TogglePinAsync(
        Guid householdId,
        Guid noteId,
        CancellationToken cancellationToken)
    {
        var note = await dbContext.Notes
            .SingleOrDefaultAsync(n => n.HouseholdId == householdId && n.Id == noteId, cancellationToken);

        if (note is null)
        {
            return (NoteMutationResult.NotFound(), null);
        }

        note.IsPinned = !note.IsPinned;
        await dbContext.SaveChangesAsync(cancellationToken);

        return (NoteMutationResult.Success(), ToItem(note));
    }

    public async Task<(NoteMutationResult Result, NoteItem? Item)> UpdateNoteAsync(
        Guid householdId,
        Guid noteId,
        Guid userId,
        UpdateNoteRequest request,
        CancellationToken cancellationToken)
    {
        var note = await dbContext.Notes
            .SingleOrDefaultAsync(n => n.HouseholdId == householdId && n.Id == noteId, cancellationToken);

        if (note is null)
        {
            return (NoteMutationResult.NotFound(), null);
        }

        var membershipId = await dbContext.Memberships
            .Where(m => m.HouseholdId == householdId && m.UserId == userId)
            .Select(m => (Guid?)m.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (note.AuthorMembershipId != membershipId)
        {
            return (NoteMutationResult.Forbidden(), null);
        }

        if (request.Title is not null)
        {
            var title = request.Title.Trim();
            if (string.IsNullOrWhiteSpace(title))
            {
                return (NoteMutationResult.ValidationFailure("Title cannot be empty."), null);
            }
            note.Title = title;
        }

        if (request.Body is not null)
        {
            note.Body = request.Body.Trim() is { Length: > 0 } trimmed ? trimmed : null;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return (NoteMutationResult.Success(), ToItem(note));
    }

    private static NoteItem ToItem(Note n) =>
        new(n.Id, n.Title, n.Body, n.AuthorDisplayName, n.IsPinned, n.CreatedAtUtc);
}
