using HouseholdOps.Modules.Notes.Contracts;

namespace HouseholdOps.Modules.Notes;

public interface INotesService
{
    Task<NoteListResponse> ListNotesAsync(Guid householdId, CancellationToken cancellationToken);

    Task<(NoteMutationResult Result, NoteItem? Item)> CreateNoteAsync(
        Guid householdId,
        Guid userId,
        CreateNoteRequest request,
        DateTimeOffset createdAtUtc,
        CancellationToken cancellationToken);

    Task<NoteMutationResult> DeleteNoteAsync(Guid householdId, Guid noteId, CancellationToken cancellationToken);

    Task<(NoteMutationResult Result, NoteItem? Item)> TogglePinAsync(
        Guid householdId,
        Guid noteId,
        CancellationToken cancellationToken);

    Task<(NoteMutationResult Result, NoteItem? Item)> UpdateNoteAsync(
        Guid householdId,
        Guid noteId,
        Guid userId,
        UpdateNoteRequest request,
        CancellationToken cancellationToken);
}

public sealed record NoteMutationResult(NoteMutationStatus Status, string? Error = null)
{
    public static NoteMutationResult Success() => new(NoteMutationStatus.Succeeded);
    public static NoteMutationResult Deleted() => new(NoteMutationStatus.Deleted);
    public static NoteMutationResult ValidationFailure(string error) => new(NoteMutationStatus.ValidationFailed, error);
    public static NoteMutationResult NotFound() => new(NoteMutationStatus.NotFound);
    public static NoteMutationResult Forbidden() => new(NoteMutationStatus.Forbidden);
}

public enum NoteMutationStatus
{
    Succeeded,
    Deleted,
    ValidationFailed,
    NotFound,
    Forbidden
}
