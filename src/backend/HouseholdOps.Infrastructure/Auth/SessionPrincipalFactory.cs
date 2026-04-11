using HouseholdOps.Modules.Households;
using Microsoft.AspNetCore.Authentication.Cookies;
using System.Security.Claims;

namespace HouseholdOps.Infrastructure.Auth;

public static class SessionPrincipalFactory
{
    public static ClaimsPrincipal Create(
        Guid sessionId,
        Guid userId,
        string displayName,
        Guid householdId,
        HouseholdRole householdRole)
    {
        var claims = new[]
        {
            new Claim(SessionClaimTypes.SessionId, sessionId.ToString()),
            new Claim(SessionClaimTypes.UserId, userId.ToString()),
            new Claim(SessionClaimTypes.HouseholdId, householdId.ToString()),
            new Claim(SessionClaimTypes.HouseholdRole, householdRole.ToString()),
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Name, displayName),
            new Claim(ClaimTypes.Role, householdRole.ToString())
        };

        var identity = new ClaimsIdentity(
            claims,
            CookieAuthenticationDefaults.AuthenticationScheme);

        return new ClaimsPrincipal(identity);
    }
}

