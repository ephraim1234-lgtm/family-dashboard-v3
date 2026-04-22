namespace HouseholdOps.Modules.Households.Contracts;

public sealed record CreateHouseholdInviteResponse(
    HouseholdInviteSummary Invite,
    string AcceptUrl);
