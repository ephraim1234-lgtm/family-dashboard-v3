namespace HouseholdOps.Modules.Identity;

public sealed class User
{
    public Guid Id { get; set; }

    public string Email { get; set; } = string.Empty;

    public string NormalizedEmail { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;

    public DateTimeOffset CreatedAtUtc { get; set; }
}

