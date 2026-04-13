namespace HouseholdOps.Modules.Households.Contracts;

public sealed record ActivityFeedResponse(IReadOnlyList<ActivityFeedItem> Items);

public sealed record ActivityFeedItem(
    string Kind,
    string Title,
    string? Detail,
    string ActorDisplayName,
    DateTimeOffset OccurredAtUtc);
