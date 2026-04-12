using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Modules.Households;
using HouseholdOps.Modules.Households.Contracts;
using HouseholdOps.Modules.Identity;
using Microsoft.EntityFrameworkCore;

namespace HouseholdOps.Infrastructure.Auth;

public sealed class HouseholdMemberService(
    HouseholdOpsDbContext dbContext) : IHouseholdMemberService
{
    public async Task<HouseholdMemberListResponse> ListMembersAsync(
        Guid householdId,
        CancellationToken cancellationToken)
    {
        var items = await (
            from membership in dbContext.Memberships
            join user in dbContext.Users on membership.UserId equals user.Id
            where membership.HouseholdId == householdId
            orderby membership.CreatedAtUtc
            select new HouseholdMemberSummary(
                membership.Id.ToString(),
                user.Id.ToString(),
                user.Email,
                user.DisplayName,
                membership.Role.ToString(),
                membership.CreatedAtUtc))
            .ToListAsync(cancellationToken);

        return new HouseholdMemberListResponse(items);
    }

    public async Task<HouseholdMemberMutationResult> AddMemberAsync(
        Guid householdId,
        AddHouseholdMemberRequest request,
        DateTimeOffset createdAtUtc,
        CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(email))
        {
            return HouseholdMemberMutationResult.ValidationFailure("Email is required.");
        }

        if (string.IsNullOrWhiteSpace(request.DisplayName))
        {
            return HouseholdMemberMutationResult.ValidationFailure("Display name is required.");
        }

        var role = HouseholdRole.Member;
        if (!string.IsNullOrWhiteSpace(request.Role)
            && Enum.TryParse<HouseholdRole>(request.Role, ignoreCase: true, out var parsedRole))
        {
            role = parsedRole;
        }

        var user = await dbContext.Users
            .SingleOrDefaultAsync(u => u.Email == email, cancellationToken);

        if (user is null)
        {
            user = new User
            {
                Id = Guid.NewGuid(),
                Email = email,
                DisplayName = request.DisplayName.Trim(),
                CreatedAtUtc = createdAtUtc
            };
            dbContext.Users.Add(user);
        }

        var existing = await dbContext.Memberships
            .SingleOrDefaultAsync(
                m => m.HouseholdId == householdId && m.UserId == user.Id,
                cancellationToken);

        if (existing is not null)
        {
            return HouseholdMemberMutationResult.Conflict(
                $"{email} is already a member of this household.");
        }

        var membership = new Membership
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            UserId = user.Id,
            Role = role,
            CreatedAtUtc = createdAtUtc
        };
        dbContext.Memberships.Add(membership);

        await dbContext.SaveChangesAsync(cancellationToken);

        return HouseholdMemberMutationResult.Success(new HouseholdMemberSummary(
            membership.Id.ToString(),
            user.Id.ToString(),
            user.Email,
            user.DisplayName,
            membership.Role.ToString(),
            membership.CreatedAtUtc));
    }

    public async Task<HouseholdMemberMutationResult> RemoveMemberAsync(
        Guid householdId,
        Guid membershipId,
        CancellationToken cancellationToken)
    {
        var membership = await dbContext.Memberships
            .SingleOrDefaultAsync(
                m => m.HouseholdId == householdId && m.Id == membershipId,
                cancellationToken);

        if (membership is null)
        {
            return HouseholdMemberMutationResult.NotFound();
        }

        if (membership.Role == HouseholdRole.Owner)
        {
            var ownerCount = await dbContext.Memberships
                .CountAsync(
                    m => m.HouseholdId == householdId && m.Role == HouseholdRole.Owner,
                    cancellationToken);

            if (ownerCount <= 1)
            {
                return HouseholdMemberMutationResult.Conflict(
                    "Cannot remove the last owner of a household.");
            }
        }

        dbContext.Memberships.Remove(membership);
        await dbContext.SaveChangesAsync(cancellationToken);

        return HouseholdMemberMutationResult.Deleted();
    }
}
