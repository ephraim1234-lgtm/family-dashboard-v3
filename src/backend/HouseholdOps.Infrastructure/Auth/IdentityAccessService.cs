using HouseholdOps.Infrastructure.Options;
using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Modules.Households;
using HouseholdOps.Modules.Identity;
using HouseholdOps.Modules.Identity.Contracts;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace HouseholdOps.Infrastructure.Auth;

public sealed class IdentityAccessService(
    IHttpContextAccessor httpContextAccessor,
    IHostEnvironment environment,
    HouseholdOpsDbContext dbContext,
    IOptions<AuthOptions> authOptions) : IIdentityAccessService
{
    public SessionResponse GetCurrentSession()
    {
        var current = new CurrentHouseholdContext(httpContextAccessor);

        if (!current.IsAuthenticated)
        {
            return new SessionResponse(false, null, null, null);
        }

        return new SessionResponse(
            true,
            current.UserId,
            current.HouseholdId,
            current.HouseholdRole);
    }

    public async Task<SessionResponse?> SignInDevelopmentAsync(CancellationToken cancellationToken)
    {
        if (!environment.IsDevelopment())
        {
            return null;
        }

        var httpContext = httpContextAccessor.HttpContext
            ?? throw new InvalidOperationException("An active HTTP context is required.");

        var now = DateTimeOffset.UtcNow;
        const string bootstrapEmail = "owner@bootstrap.householdops.local";
        const string bootstrapDisplayName = "Bootstrap Owner";
        const string bootstrapHouseholdName = "Bootstrap Household";

        var user = await dbContext.Users.SingleOrDefaultAsync(
            x => x.Email == bootstrapEmail,
            cancellationToken);

        if (user is null)
        {
            user = new User
            {
                Id = Guid.NewGuid(),
                Email = bootstrapEmail,
                DisplayName = bootstrapDisplayName,
                CreatedAtUtc = now
            };
            dbContext.Users.Add(user);
        }

        var household = await dbContext.Households.SingleOrDefaultAsync(
            x => x.Name == bootstrapHouseholdName,
            cancellationToken);

        if (household is null)
        {
            household = new Household
            {
                Id = Guid.NewGuid(),
                Name = bootstrapHouseholdName,
                CreatedAtUtc = now
            };
            dbContext.Households.Add(household);
        }

        var membership = await dbContext.Memberships.SingleOrDefaultAsync(
            x => x.UserId == user.Id && x.HouseholdId == household.Id,
            cancellationToken);

        if (membership is null)
        {
            membership = new Membership
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                HouseholdId = household.Id,
                Role = HouseholdRole.Owner,
                CreatedAtUtc = now
            };
            dbContext.Memberships.Add(membership);
        }

        var session = new Session
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            ActiveHouseholdId = household.Id,
            CreatedAtUtc = now,
            LastSeenAtUtc = now,
            ExpiresAtUtc = now.AddDays(authOptions.Value.SessionLifetimeDays)
        };
        dbContext.Sessions.Add(session);

        await dbContext.SaveChangesAsync(cancellationToken);

        var principal = SessionPrincipalFactory.Create(
            session.Id,
            user.Id,
            user.DisplayName,
            household.Id,
            membership.Role);

        await httpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            principal);

        return new SessionResponse(
            true,
            user.Id.ToString(),
            household.Id.ToString(),
            membership.Role.ToString());
    }

    public async Task SignOutAsync(CancellationToken cancellationToken)
    {
        var current = new CurrentHouseholdContext(httpContextAccessor);
        var httpContext = httpContextAccessor.HttpContext
            ?? throw new InvalidOperationException("An active HTTP context is required.");

        if (Guid.TryParse(current.SessionId, out var sessionId))
        {
            var session = await dbContext.Sessions.SingleOrDefaultAsync(
                x => x.Id == sessionId,
                cancellationToken);

            if (session is not null && session.RevokedAtUtc is null)
            {
                session.RevokedAtUtc = DateTimeOffset.UtcNow;
                await dbContext.SaveChangesAsync(cancellationToken);
            }
        }

        await httpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
    }
}

