namespace HouseholdOps.Modules.Notes;

public sealed class Note
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Body { get; set; }
    public Guid? AuthorMembershipId { get; set; }
    public string AuthorDisplayName { get; set; } = string.Empty;
    public bool IsPinned { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
}
