namespace HouseholdOps.Modules.Households.Contracts;

public sealed record HouseholdMemberSummary(
    string MembershipId,
    string UserId,
    string Email,
    string DisplayName,
    string Role,
    DateTimeOffset JoinedAtUtc);
