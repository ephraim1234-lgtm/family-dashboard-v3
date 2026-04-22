using HouseholdOps.Infrastructure.Options;
using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Modules.Households;
using HouseholdOps.Modules.Identity;
using HouseholdOps.Modules.Identity.Contracts;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Security.Claims;

namespace HouseholdOps.Infrastructure.Auth;

public sealed class IdentityAccessService(
    IHttpContextAccessor httpContextAccessor,
    HouseholdOpsDbContext dbContext,
    IPasswordHasher<User> passwordHasher,
    IOptions<AuthOptions> authOptions) : IIdentityAccessService
{
    public CurrentIdentityAccess GetCurrentAccess()
    {
        var current = new CurrentHouseholdContext(httpContextAccessor);
        var principal = httpContextAccessor.HttpContext?.User;

        return new CurrentIdentityAccess(
            ParseGuid(current.SessionId),
            ParseGuid(current.UserId),
            principal?.FindFirst(ClaimTypes.Email)?.Value,
            principal?.FindFirst(ClaimTypes.Name)?.Value,
            ParseGuid(current.HouseholdId),
            current.HouseholdRole);
    }

    public SessionResponse GetCurrentSession()
    {
        var current = GetCurrentAccess();
        if (!current.IsAuthenticated
            || !current.UserId.HasValue
            || string.IsNullOrWhiteSpace(current.Email)
            || string.IsNullOrWhiteSpace(current.DisplayName))
        {
            return new SessionResponse(false, null, null, null, false, false);
        }

        return new SessionResponse(
            true,
            new SessionUserResponse(
                current.UserId.Value.ToString(),
                current.Email,
                current.DisplayName),
            current.ActiveHouseholdId?.ToString(),
            current.ActiveHouseholdRole,
            current.HasActiveHousehold,
            current.NeedsOnboarding);
    }

    public async Task<IdentityCommandResult> SignUpAsync(
        SignUpRequest request,
        CancellationToken cancellationToken)
    {
        var email = NormalizeEmail(request.Email);
        var displayName = request.DisplayName.Trim();
        var password = request.Password ?? string.Empty;

        if (string.IsNullOrWhiteSpace(email))
        {
            return IdentityCommandResult.ValidationFailure("Email is required.");
        }

        if (string.IsNullOrWhiteSpace(displayName))
        {
            return IdentityCommandResult.ValidationFailure("Display name is required.");
        }

        if (password.Length < 8)
        {
            return IdentityCommandResult.ValidationFailure("Password must be at least 8 characters.");
        }

        var existingUser = await dbContext.Users.SingleOrDefaultAsync(
            item => item.NormalizedEmail == email,
            cancellationToken);

        if (existingUser is not null)
        {
            return IdentityCommandResult.Conflict("An account with this email already exists.");
        }

        var now = DateTimeOffset.UtcNow;
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = request.Email.Trim().ToLowerInvariant(),
            NormalizedEmail = email,
            DisplayName = displayName,
            CreatedAtUtc = now
        };
        user.PasswordHash = passwordHasher.HashPassword(user, password);

        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync(cancellationToken);

        var session = await CreateAndSignInSessionAsync(user, cancellationToken);
        return IdentityCommandResult.Success(session);
    }

    public async Task<IdentityCommandResult> LoginAsync(
        LoginRequest request,
        CancellationToken cancellationToken)
    {
        var normalizedEmail = NormalizeEmail(request.Email);
        if (string.IsNullOrWhiteSpace(normalizedEmail) || string.IsNullOrWhiteSpace(request.Password))
        {
            return IdentityCommandResult.InvalidCredentials();
        }

        var user = await dbContext.Users.SingleOrDefaultAsync(
            item => item.NormalizedEmail == normalizedEmail,
            cancellationToken);

        if (user is null || string.IsNullOrWhiteSpace(user.PasswordHash))
        {
            return IdentityCommandResult.InvalidCredentials();
        }

        var verificationResult = passwordHasher.VerifyHashedPassword(
            user,
            user.PasswordHash,
            request.Password);

        if (verificationResult == PasswordVerificationResult.Failed)
        {
            return IdentityCommandResult.InvalidCredentials();
        }

        var session = await CreateAndSignInSessionAsync(user, cancellationToken);
        return IdentityCommandResult.Success(session);
    }

    public async Task<SessionResponse?> SetActiveHouseholdAsync(
        Guid householdId,
        string householdRole,
        CancellationToken cancellationToken)
    {
        var current = GetCurrentAccess();
        if (!current.IsAuthenticated || !current.SessionId.HasValue || !current.UserId.HasValue)
        {
            return null;
        }

        var session = await dbContext.Sessions.SingleOrDefaultAsync(
            item => item.Id == current.SessionId.Value && item.UserId == current.UserId.Value,
            cancellationToken);

        if (session is null)
        {
            return null;
        }

        session.ActiveHouseholdId = householdId;
        session.LastSeenAtUtc = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        await RefreshCookieAsync(
            session.Id,
            current.UserId.Value,
            current.Email ?? string.Empty,
            current.DisplayName ?? string.Empty,
            householdId,
            ParseHouseholdRole(householdRole));

        return GetCurrentSession();
    }

    public async Task SignOutAsync(CancellationToken cancellationToken)
    {
        var current = GetCurrentAccess();
        var httpContext = httpContextAccessor.HttpContext
            ?? throw new InvalidOperationException("An active HTTP context is required.");

        if (current.SessionId.HasValue)
        {
            var session = await dbContext.Sessions.SingleOrDefaultAsync(
                x => x.Id == current.SessionId.Value,
                cancellationToken);

            if (session is not null && session.RevokedAtUtc is null)
            {
                session.RevokedAtUtc = DateTimeOffset.UtcNow;
                await dbContext.SaveChangesAsync(cancellationToken);
            }
        }

        await httpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
    }

    private async Task<SessionResponse> CreateAndSignInSessionAsync(
        User user,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var membership = await dbContext.Memberships
            .Where(item => item.UserId == user.Id)
            .OrderBy(item => item.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        var session = new Session
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            ActiveHouseholdId = membership?.HouseholdId,
            CreatedAtUtc = now,
            LastSeenAtUtc = now,
            ExpiresAtUtc = now.AddDays(authOptions.Value.SessionLifetimeDays)
        };

        dbContext.Sessions.Add(session);
        await dbContext.SaveChangesAsync(cancellationToken);

        await RefreshCookieAsync(
            session.Id,
            user.Id,
            user.Email,
            user.DisplayName,
            membership?.HouseholdId,
            membership?.Role);

        return new SessionResponse(
            true,
            new SessionUserResponse(user.Id.ToString(), user.Email, user.DisplayName),
            membership?.HouseholdId.ToString(),
            membership?.Role.ToString(),
            membership is not null,
            membership is null);
    }

    private async Task RefreshCookieAsync(
        Guid sessionId,
        Guid userId,
        string email,
        string displayName,
        Guid? householdId,
        HouseholdRole? householdRole)
    {
        var httpContext = httpContextAccessor.HttpContext
            ?? throw new InvalidOperationException("An active HTTP context is required.");

        var principal = SessionPrincipalFactory.Create(
            sessionId,
            userId,
            email,
            displayName,
            householdId,
            householdRole);

        await httpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            principal);
    }

    private static Guid? ParseGuid(string? value) =>
        Guid.TryParse(value, out var parsed) ? parsed : null;

    private static string NormalizeEmail(string? email) =>
        (email ?? string.Empty).Trim().ToUpperInvariant();

    private static HouseholdRole? ParseHouseholdRole(string? role) =>
        Enum.TryParse<HouseholdRole>(role, ignoreCase: true, out var parsedRole)
            ? parsedRole
            : null;
}

