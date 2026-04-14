namespace HouseholdOps.Modules.Households.Contracts;

public sealed record HouseholdContextResponse(
    string HouseholdId,
    string HouseholdName,
    string TimeZoneId,
    string ActiveRole,
    string MembershipStatus);
