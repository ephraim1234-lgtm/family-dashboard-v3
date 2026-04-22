using HouseholdOps.Modules.Households;
using Microsoft.AspNetCore.Authentication.Cookies;
using System.Security.Claims;

namespace HouseholdOps.Infrastructure.Auth;

public static class SessionPrincipalFactory
{
    public static ClaimsPrincipal Create(
        Guid sessionId,
        Guid userId,
        string email,
        string displayName,
        Guid? householdId,
        HouseholdRole? householdRole)
    {
        var claims = new List<Claim>
        {
            new Claim(SessionClaimTypes.SessionId, sessionId.ToString()),
            new Claim(SessionClaimTypes.UserId, userId.ToString()),
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Name, displayName),
            new Claim(ClaimTypes.Email, email)
        };

        if (householdId.HasValue)
        {
            claims.Add(new Claim(SessionClaimTypes.HouseholdId, householdId.Value.ToString()));
        }

        if (householdRole.HasValue)
        {
            claims.Add(new Claim(SessionClaimTypes.HouseholdRole, householdRole.Value.ToString()));
            claims.Add(new Claim(ClaimTypes.Role, householdRole.Value.ToString()));
        }

        var identity = new ClaimsIdentity(
            claims,
            CookieAuthenticationDefaults.AuthenticationScheme);

        return new ClaimsPrincipal(identity);
    }
}
