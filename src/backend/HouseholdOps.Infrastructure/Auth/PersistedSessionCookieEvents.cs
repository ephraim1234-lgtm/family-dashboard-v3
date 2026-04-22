using HouseholdOps.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication;
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
            where session.Id == sessionId
                && session.RevokedAtUtc == null
                && session.ExpiresAtUtc > now
            select new
            {
                Session = session,
                User = user
            })
            .SingleOrDefaultAsync(context.HttpContext.RequestAborted);

        if (sessionData is null)
        {
            logger.LogWarning("Rejecting cookie principal because persisted session {SessionId} was invalid.", sessionId);
            await RejectAsync(context, "Persisted session was not found or expired.");
            return;
        }

        HouseholdOps.Modules.Households.HouseholdRole? householdRole = null;
        Guid? householdId = null;

        if (sessionData.Session.ActiveHouseholdId.HasValue)
        {
            householdId = sessionData.Session.ActiveHouseholdId.Value;

            var membership = await dbContext.Memberships.SingleOrDefaultAsync(
                item => item.UserId == sessionData.Session.UserId
                    && item.HouseholdId == householdId.Value,
                context.HttpContext.RequestAborted);

            var householdExists = await dbContext.Households.AnyAsync(
                item => item.Id == householdId.Value,
                context.HttpContext.RequestAborted);

            if (!householdExists || membership is null)
            {
                logger.LogWarning(
                    "Rejecting cookie principal because session {SessionId} lost access to household {HouseholdId}.",
                    sessionId,
                    householdId);

                await RejectAsync(context, "Persisted session lost access to the active household.");
                return;
            }

            householdRole = membership.Role;
        }

        sessionData.Session.LastSeenAtUtc = now;
        await dbContext.SaveChangesAsync(context.HttpContext.RequestAborted);

        context.ReplacePrincipal(SessionPrincipalFactory.Create(
            sessionData.Session.Id,
            sessionData.User.Id,
            sessionData.User.Email,
            sessionData.User.DisplayName,
            householdId,
            householdRole));
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
