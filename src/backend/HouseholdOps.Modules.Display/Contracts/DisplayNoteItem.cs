namespace HouseholdOps.Modules.Display.Contracts;

public sealed record DisplayNoteItem(
    string Title,
    string? Body,
    string AuthorDisplayName);
