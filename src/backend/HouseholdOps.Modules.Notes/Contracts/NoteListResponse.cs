namespace HouseholdOps.Modules.Notes.Contracts;

public sealed record NoteListResponse(IReadOnlyList<NoteItem> Notes);
