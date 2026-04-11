using Microsoft.AspNetCore.Authentication;
using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Modules.Households;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HouseholdOps.Infrastructure.Auth;

public sealed class PersistedSessionCookieEvents(
    HouseholdOpsDbContext dbContext,
    ILogger<PersistedSessionCookieEvents> logger) : CookieAuthenticationEvents
{
    public override Task RedirectToLogin(RedirectContext<CookieAuthenticationOptions> context)
    {
        if (context.Request.Path.StartsWithSegments("/api"))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        }

        context.Response.Redirect(context.RedirectUri);
        return Task.CompletedTask;
    }

    public override Task RedirectToAccessDenied(RedirectContext<CookieAuthenticationOptions> context)
    {
        if (context.Request.Path.StartsWithSegments("/api"))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        }

        context.Response.Redirect(context.RedirectUri);
        return Task.CompletedTask;
    }

    public override async Task ValidatePrincipal(CookieValidatePrincipalContext context)
    {
        var rawSessionId = context.Principal?.FindFirst(SessionClaimTypes.SessionId)?.Value;

        if (!Guid.TryParse(rawSessionId, out var sessionId))
        {
            logger.LogWarning("Rejecting cookie principal because session_id claim was missing or invalid.");
            await RejectAsync(context, "Missing or invalid session_id claim.");
            return;
        }

        var now = DateTimeOffset.UtcNow;

        var sessionData = await (
            from session in dbContext.Sessions
            join user in dbContext.Users on session.UserId equals user.Id
            join household in dbContext.Households on session.ActiveHouseholdId equals household.Id
            join membership in dbContext.Memberships
                on new { session.UserId, HouseholdId = session.ActiveHouseholdId }
                equals new { membership.UserId, membership.HouseholdId }
            where session.Id == sessionId
                && session.RevokedAtUtc == null
                && session.ExpiresAtUtc > now
            select new
            {
                Session = session,
                User = user,
                Household = household,
                Membership = membership
            })
            .SingleOrDefaultAsync(context.HttpContext.RequestAborted);

        if (sessionData is null)
        {
            logger.LogWarning("Rejecting cookie principal because persisted session {SessionId} was invalid.", sessionId);
            await RejectAsync(context, "Persisted session was not found, expired, or lost membership.");
            return;
        }

        sessionData.Session.LastSeenAtUtc = now;
        await dbContext.SaveChangesAsync(context.HttpContext.RequestAborted);

        context.ReplacePrincipal(SessionPrincipalFactory.Create(
            sessionData.Session.Id,
            sessionData.User.Id,
            sessionData.User.DisplayName,
            sessionData.Household.Id,
            sessionData.Membership.Role));
        context.ShouldRenew = true;
    }

    private static async Task RejectAsync(
        CookieValidatePrincipalContext context,
        string reason)
    {
        context.HttpContext.Items["auth_failure_reason"] = reason;
        context.RejectPrincipal();
        await context.HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
    }
}
