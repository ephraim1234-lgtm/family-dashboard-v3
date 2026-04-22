using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Modules.Households;
using HouseholdOps.Modules.Households.Contracts;
using HouseholdOps.Modules.Identity;
using Microsoft.EntityFrameworkCore;

namespace HouseholdOps.Infrastructure.Auth;

public sealed class HouseholdContextService(
    HouseholdOpsDbContext dbContext,
    IIdentityAccessService identityAccessService) : IHouseholdContextService
{
    public async Task<HouseholdContextMutationResult> CreateAsync(
        CreateHouseholdRequest request,
        CancellationToken cancellationToken)
    {
        var access = identityAccessService.GetCurrentAccess();
        if (!access.IsAuthenticated || !access.UserId.HasValue)
        {
            return HouseholdContextMutationResult.Unauthorized();
        }

        var trimmedName = request.Name.Trim();
        if (string.IsNullOrWhiteSpace(trimmedName))
        {
            return HouseholdContextMutationResult.ValidationFailure("Household name is required.");
        }

        var hasMembership = await dbContext.Memberships.AnyAsync(
            item => item.UserId == access.UserId.Value,
            cancellationToken);

        if (hasMembership || access.HasActiveHousehold)
        {
            return HouseholdContextMutationResult.Conflict("This account already belongs to a household.");
        }

        var timeZoneId = string.IsNullOrWhiteSpace(request.TimeZoneId)
            ? "UTC"
            : request.TimeZoneId.Trim();

        try
        {
            _ = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        }
        catch (TimeZoneNotFoundException)
        {
            return HouseholdContextMutationResult.ValidationFailure(
                $"Unknown time zone id '{timeZoneId}'.");
        }
        catch (InvalidTimeZoneException)
        {
            return HouseholdContextMutationResult.ValidationFailure(
                $"Time zone '{timeZoneId}' is corrupt or unsupported.");
        }

        var now = DateTimeOffset.UtcNow;
        var household = new Household
        {
            Id = Guid.NewGuid(),
            Name = trimmedName,
            CreatedByUserId = access.UserId.Value,
            TimeZoneId = timeZoneId,
            CreatedAtUtc = now
        };

        var membership = new Membership
        {
            Id = Guid.NewGuid(),
            HouseholdId = household.Id,
            UserId = access.UserId.Value,
            Role = HouseholdRole.Owner,
            CreatedAtUtc = now
        };

        dbContext.Households.Add(household);
        dbContext.Memberships.Add(membership);
        await dbContext.SaveChangesAsync(cancellationToken);

        await identityAccessService.SetActiveHouseholdAsync(
            household.Id,
            membership.Role.ToString(),
            cancellationToken);

        return HouseholdContextMutationResult.Success(new HouseholdContextResponse(
            household.Id.ToString(),
            household.Name,
            household.TimeZoneId,
            membership.Role.ToString(),
            "Active"));
    }

    public async Task<HouseholdContextResponse?> GetCurrentAsync(CancellationToken cancellationToken)
    {
        var access = identityAccessService.GetCurrentAccess();
        if (!access.IsAuthenticated
            || !access.ActiveHouseholdId.HasValue
            || !access.UserId.HasValue)
        {
            return null;
        }

        return await (
            from household in dbContext.Households
            join membership in dbContext.Memberships on household.Id equals membership.HouseholdId
            where household.Id == access.ActiveHouseholdId.Value && membership.UserId == access.UserId.Value
            select new HouseholdContextResponse(
                household.Id.ToString(),
                household.Name,
                household.TimeZoneId,
                membership.Role.ToString(),
                "Active"))
            .SingleOrDefaultAsync(cancellationToken);
    }

    public async Task<HouseholdContextResponse?> RenameAsync(
        string name,
        CancellationToken cancellationToken)
    {
        var access = identityAccessService.GetCurrentAccess();
        if (!access.IsAuthenticated
            || !access.ActiveHouseholdId.HasValue
            || !access.UserId.HasValue)
        {
            return null;
        }

        var household = await dbContext.Households
            .SingleOrDefaultAsync(h => h.Id == access.ActiveHouseholdId.Value, cancellationToken);

        if (household is null)
        {
            return null;
        }

        household.Name = name.Trim();
        await dbContext.SaveChangesAsync(cancellationToken);

        var membership = await dbContext.Memberships
            .SingleOrDefaultAsync(
                m => m.HouseholdId == access.ActiveHouseholdId.Value && m.UserId == access.UserId.Value,
                cancellationToken);

        return new HouseholdContextResponse(
            household.Id.ToString(),
            household.Name,
            household.TimeZoneId,
            membership?.Role.ToString() ?? "Member",
            "Active");
    }

    public async Task<HouseholdTimeZoneUpdateResult> UpdateTimeZoneAsync(
        string timeZoneId,
        CancellationToken cancellationToken)
    {
        var access = identityAccessService.GetCurrentAccess();
        if (!access.IsAuthenticated
            || !access.ActiveHouseholdId.HasValue
            || !access.UserId.HasValue)
        {
            return new HouseholdTimeZoneUpdateResult(
                HouseholdTimeZoneUpdateStatus.Unauthorized, null, null);
        }

        var trimmed = (timeZoneId ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            return new HouseholdTimeZoneUpdateResult(
                HouseholdTimeZoneUpdateStatus.ValidationFailed, null, "Time zone id is required.");
        }

        try
        {
            // Validate against the system time zone database. Accepts both IANA
            // ids (via ICU on Linux/Windows 10+) and Windows ids.
            _ = TimeZoneInfo.FindSystemTimeZoneById(trimmed);
        }
        catch (TimeZoneNotFoundException)
        {
            return new HouseholdTimeZoneUpdateResult(
                HouseholdTimeZoneUpdateStatus.ValidationFailed,
                null,
                $"Unknown time zone id '{trimmed}'.");
        }
        catch (InvalidTimeZoneException)
        {
            return new HouseholdTimeZoneUpdateResult(
                HouseholdTimeZoneUpdateStatus.ValidationFailed,
                null,
                $"Time zone '{trimmed}' is corrupt or unsupported.");
        }

        var household = await dbContext.Households
            .SingleOrDefaultAsync(h => h.Id == access.ActiveHouseholdId.Value, cancellationToken);

        if (household is null)
        {
            return new HouseholdTimeZoneUpdateResult(
                HouseholdTimeZoneUpdateStatus.Unauthorized, null, null);
        }

        household.TimeZoneId = trimmed;
        await dbContext.SaveChangesAsync(cancellationToken);

        var membership = await dbContext.Memberships
            .SingleOrDefaultAsync(
                m => m.HouseholdId == access.ActiveHouseholdId.Value && m.UserId == access.UserId.Value,
                cancellationToken);

        return new HouseholdTimeZoneUpdateResult(
            HouseholdTimeZoneUpdateStatus.Succeeded,
            new HouseholdContextResponse(
                household.Id.ToString(),
                household.Name,
                household.TimeZoneId,
                membership?.Role.ToString() ?? "Member",
                "Active"),
            null);
    }
}
