using Microsoft.AspNetCore.Http;

namespace HouseholdOps.Infrastructure.Auth;

public sealed class CurrentHouseholdContext(IHttpContextAccessor httpContextAccessor)
{
    public string? SessionId => Find(SessionClaimTypes.SessionId);

    public string? UserId => Find(SessionClaimTypes.UserId);

    public string? HouseholdId => Find(SessionClaimTypes.HouseholdId);

    public string? HouseholdRole => Find(SessionClaimTypes.HouseholdRole);

    public bool IsAuthenticated =>
        httpContextAccessor.HttpContext?.User?.Identity?.IsAuthenticated == true;

    private string? Find(string claimType) =>
        httpContextAccessor.HttpContext?.User?.FindFirst(claimType)?.Value;
}
