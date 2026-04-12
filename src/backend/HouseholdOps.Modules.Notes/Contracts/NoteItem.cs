namespace HouseholdOps.Modules.Notes.Contracts;

public sealed record NoteItem(
    Guid Id,
    string Title,
    string? Body,
    string AuthorDisplayName,
    bool IsPinned,
    DateTimeOffset CreatedAtUtc);
