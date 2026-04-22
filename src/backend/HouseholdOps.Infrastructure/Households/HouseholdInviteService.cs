using System.Security.Cryptography;
using System.Text;
using HouseholdOps.Infrastructure.Auth;
using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Modules.Households;
using HouseholdOps.Modules.Households.Contracts;
using HouseholdOps.Modules.Identity;
using Microsoft.EntityFrameworkCore;

namespace HouseholdOps.Infrastructure.Households;

public sealed class HouseholdInviteService(
    HouseholdOpsDbContext dbContext,
    IIdentityAccessService identityAccessService) : IHouseholdInviteService
{
    private const int DefaultInviteLifetimeDays = 7;

    public async Task<HouseholdInviteListResponse> ListAsync(
        Guid householdId,
        CancellationToken cancellationToken)
    {
        var items = await dbContext.HouseholdInvites
            .Where(item => item.HouseholdId == householdId && item.AcceptedAtUtc == null)
            .OrderByDescending(item => item.CreatedAtUtc)
            .Select(item => new HouseholdInviteSummary(
                item.Id.ToString(),
                item.Email,
                item.Role.ToString(),
                item.CreatedAtUtc,
                item.ExpiresAtUtc))
            .ToListAsync(cancellationToken);

        return new HouseholdInviteListResponse(items);
    }

    public async Task<HouseholdInviteMutationResult> CreateAsync(
        Guid householdId,
        Guid invitedByUserId,
        CreateHouseholdInviteRequest request,
        string acceptUrlBase,
        DateTimeOffset createdAtUtc,
        CancellationToken cancellationToken)
    {
        var email = (request.Email ?? string.Empty).Trim().ToLowerInvariant();
        var normalizedEmail = NormalizeEmail(request.Email);
        if (string.IsNullOrWhiteSpace(normalizedEmail))
        {
            return HouseholdInviteMutationResult.ValidationFailure("Email is required.");
        }

        var role = HouseholdRole.Member;
        if (!string.IsNullOrWhiteSpace(request.Role)
            && !Enum.TryParse<HouseholdRole>(request.Role, ignoreCase: true, out role))
        {
            return HouseholdInviteMutationResult.ValidationFailure("Role must be Owner or Member.");
        }

        var existingMember = await (
            from membership in dbContext.Memberships
            join user in dbContext.Users on membership.UserId equals user.Id
            where membership.HouseholdId == householdId && user.NormalizedEmail == normalizedEmail
            select membership.Id)
            .AnyAsync(cancellationToken);

        if (existingMember)
        {
            return HouseholdInviteMutationResult.Conflict("That account is already a member of this household.");
        }

        var existingInvite = await dbContext.HouseholdInvites.AnyAsync(
            item => item.HouseholdId == householdId
                && item.NormalizedEmail == normalizedEmail
                && item.AcceptedAtUtc == null
                && item.ExpiresAtUtc > createdAtUtc,
            cancellationToken);

        if (existingInvite)
        {
            return HouseholdInviteMutationResult.Conflict("A pending invite already exists for that email.");
        }

        var rawToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(24)).ToLowerInvariant();
        var invite = new HouseholdInvite
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            Email = email,
            NormalizedEmail = normalizedEmail,
            Role = role,
            TokenHash = HashToken(rawToken),
            InvitedByUserId = invitedByUserId,
            CreatedAtUtc = createdAtUtc,
            ExpiresAtUtc = createdAtUtc.AddDays(DefaultInviteLifetimeDays)
        };

        dbContext.HouseholdInvites.Add(invite);
        await dbContext.SaveChangesAsync(cancellationToken);

        var summary = new HouseholdInviteSummary(
            invite.Id.ToString(),
            invite.Email,
            invite.Role.ToString(),
            invite.CreatedAtUtc,
            invite.ExpiresAtUtc);

        return HouseholdInviteMutationResult.Created(new CreateHouseholdInviteResponse(
            summary,
            $"{acceptUrlBase}?token={rawToken}"));
    }

    public async Task<HouseholdInvitePreviewResponse?> PreviewAsync(
        string token,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var tokenHash = HashToken(token);
        return await (
            from invite in dbContext.HouseholdInvites
            join household in dbContext.Households on invite.HouseholdId equals household.Id
            where invite.TokenHash == tokenHash && invite.AcceptedAtUtc == null
            select new HouseholdInvitePreviewResponse(
                household.Name,
                invite.Email,
                invite.Role.ToString(),
                invite.ExpiresAtUtc,
                invite.ExpiresAtUtc <= now))
            .SingleOrDefaultAsync(cancellationToken);
    }

    public async Task<HouseholdInviteMutationResult> AcceptAsync(
        Guid userId,
        string token,
        DateTimeOffset acceptedAtUtc,
        CancellationToken cancellationToken)
    {
        var access = identityAccessService.GetCurrentAccess();
        if (!access.IsAuthenticated || !access.UserId.HasValue || access.UserId.Value != userId)
        {
            return HouseholdInviteMutationResult.Unauthorized();
        }

        if (access.HasActiveHousehold || await dbContext.Memberships.AnyAsync(item => item.UserId == userId, cancellationToken))
        {
            return HouseholdInviteMutationResult.Conflict("This account already belongs to a household.");
        }

        var tokenHash = HashToken(token);
        var invite = await dbContext.HouseholdInvites.SingleOrDefaultAsync(
            item => item.TokenHash == tokenHash && item.AcceptedAtUtc == null,
            cancellationToken);

        if (invite is null)
        {
            return HouseholdInviteMutationResult.NotFound();
        }

        if (invite.ExpiresAtUtc <= acceptedAtUtc)
        {
            return HouseholdInviteMutationResult.Conflict("This invite has expired.");
        }

        var user = await dbContext.Users.SingleOrDefaultAsync(item => item.Id == userId, cancellationToken);
        if (user is null)
        {
            return HouseholdInviteMutationResult.Unauthorized();
        }

        if (!string.Equals(user.NormalizedEmail, invite.NormalizedEmail, StringComparison.Ordinal))
        {
            return HouseholdInviteMutationResult.Conflict("This invite does not match the signed-in account email.");
        }

        var household = await dbContext.Households.SingleOrDefaultAsync(
            item => item.Id == invite.HouseholdId,
            cancellationToken);

        if (household is null)
        {
            return HouseholdInviteMutationResult.NotFound();
        }

        var membership = new Membership
        {
            Id = Guid.NewGuid(),
            HouseholdId = invite.HouseholdId,
            UserId = userId,
            Role = invite.Role,
            CreatedAtUtc = acceptedAtUtc
        };

        invite.AcceptedAtUtc = acceptedAtUtc;
        dbContext.Memberships.Add(membership);
        await dbContext.SaveChangesAsync(cancellationToken);

        await identityAccessService.SetActiveHouseholdAsync(
            household.Id,
            invite.Role.ToString(),
            cancellationToken);

        return HouseholdInviteMutationResult.Accepted(new HouseholdContextResponse(
            household.Id.ToString(),
            household.Name,
            household.TimeZoneId,
            invite.Role.ToString(),
            "Active"));
    }

    public async Task<HouseholdInviteMutationResult> RevokeAsync(
        Guid householdId,
        Guid inviteId,
        CancellationToken cancellationToken)
    {
        var invite = await dbContext.HouseholdInvites.SingleOrDefaultAsync(
            item => item.HouseholdId == householdId && item.Id == inviteId,
            cancellationToken);

        if (invite is null)
        {
            return HouseholdInviteMutationResult.NotFound();
        }

        dbContext.HouseholdInvites.Remove(invite);
        await dbContext.SaveChangesAsync(cancellationToken);
        return HouseholdInviteMutationResult.Deleted();
    }

    private static string NormalizeEmail(string? email) =>
        (email ?? string.Empty).Trim().ToUpperInvariant();

    private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token ?? string.Empty));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
