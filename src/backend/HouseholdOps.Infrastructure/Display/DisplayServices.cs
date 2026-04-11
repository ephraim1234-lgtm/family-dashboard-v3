using System.Security.Cryptography;
using System.Text;
using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Modules.Display;
using HouseholdOps.Modules.Display.Contracts;
using HouseholdOps.SharedKernel.Time;
using Microsoft.EntityFrameworkCore;

namespace HouseholdOps.Infrastructure.Display;

public sealed class DisplayProjectionService(
    HouseholdOpsDbContext dbContext,
    IClock clock) : IDisplayProjectionService
{
    public async Task<DisplayProjectionResponse?> GetProjectionAsync(
        string accessToken,
        CancellationToken cancellationToken)
    {
        var tokenHash = DisplayTokenHasher.Hash(accessToken);

        var result = await (
            from token in dbContext.DisplayAccessTokens
            join device in dbContext.DisplayDevices on token.DisplayDeviceId equals device.Id
            join household in dbContext.Households on device.HouseholdId equals household.Id
            where token.TokenHash == tokenHash
                && token.RevokedAtUtc == null
                && device.IsActive
            select new
            {
                DeviceName = device.Name,
                HouseholdName = household.Name,
                token.TokenHint
            })
            .SingleOrDefaultAsync(cancellationToken);

        if (result is null)
        {
            return null;
        }

        return new DisplayProjectionResponse(
            AccessMode: "DisplayToken",
            DeviceName: result.DeviceName,
            HouseholdName: result.HouseholdName,
            AccessTokenHint: result.TokenHint,
            GeneratedAtUtc: clock.UtcNow,
            Sections: new[]
            {
                new DisplayProjectionSectionResponse(
                    "Today agenda",
                    "Scheduling projection wiring will land here next."),
                new DisplayProjectionSectionResponse(
                    "Upcoming events",
                    "This projection is display-safe and intentionally separate from app/admin session auth."),
                new DisplayProjectionSectionResponse(
                    "Household status",
                    $"Rendering for {result.HouseholdName} on {result.DeviceName}.")
            });
    }
}

public sealed class DisplayManagementService(
    HouseholdOpsDbContext dbContext,
    IClock clock) : IDisplayManagementService
{
    public async Task<DisplayDeviceListResponse> ListDevicesAsync(
        Guid householdId,
        CancellationToken cancellationToken)
    {
        var devices = await (
            from device in dbContext.DisplayDevices
            where device.HouseholdId == householdId
            orderby device.CreatedAtUtc descending
            select new DisplayDeviceSummaryResponse(
                device.Id,
                device.Name,
                device.IsActive,
                dbContext.DisplayAccessTokens
                    .Where(token => token.DisplayDeviceId == device.Id && token.RevokedAtUtc == null)
                    .OrderByDescending(token => token.CreatedAtUtc)
                    .Select(token => token.TokenHint)
                    .FirstOrDefault() ?? "None",
                device.CreatedAtUtc))
            .ToListAsync(cancellationToken);

        return new DisplayDeviceListResponse(devices);
    }

    public async Task<CreateDisplayDeviceResponse> CreateDeviceAsync(
        Guid householdId,
        string? requestedName,
        CancellationToken cancellationToken)
    {
        var createdAtUtc = clock.UtcNow;
        var accessToken = DisplayTokenHasher.GenerateToken();

        var device = new DisplayDevice
        {
            HouseholdId = householdId,
            Name = string.IsNullOrWhiteSpace(requestedName)
                ? $"Kitchen Display {createdAtUtc:MMdd-HHmm}"
                : requestedName.Trim(),
            CreatedAtUtc = createdAtUtc
        };

        var token = new DisplayAccessToken
        {
            DisplayDeviceId = device.Id,
            TokenHash = DisplayTokenHasher.Hash(accessToken),
            TokenHint = DisplayTokenHasher.GetHint(accessToken),
            CreatedAtUtc = createdAtUtc
        };

        dbContext.DisplayDevices.Add(device);
        dbContext.DisplayAccessTokens.Add(token);
        await dbContext.SaveChangesAsync(cancellationToken);

        return new CreateDisplayDeviceResponse(
            device.Id,
            device.Name,
            accessToken,
            token.TokenHint,
            $"/display/{accessToken}",
            createdAtUtc);
    }
}

internal static class DisplayTokenHasher
{
    public static string GenerateToken() =>
        Convert.ToHexString(RandomNumberGenerator.GetBytes(18)).ToLowerInvariant();

    public static string Hash(string accessToken)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(accessToken));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    public static string GetHint(string accessToken) =>
        accessToken[..Math.Min(accessToken.Length, 8)];
}
