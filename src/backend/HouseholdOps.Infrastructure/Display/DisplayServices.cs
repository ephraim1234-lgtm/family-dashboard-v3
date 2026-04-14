using System.Security.Cryptography;
using System.Text;
using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Modules.Chores;
using HouseholdOps.Modules.Display;
using HouseholdOps.Modules.Display.Contracts;
using HouseholdOps.Modules.Households;
using HouseholdOps.Modules.Notes;
using HouseholdOps.Modules.Notifications;
using HouseholdOps.Modules.Scheduling;
using HouseholdOps.Modules.Scheduling.Contracts;
using HouseholdOps.SharedKernel.Time;
using Microsoft.EntityFrameworkCore;

namespace HouseholdOps.Infrastructure.Display;

public sealed class DisplayProjectionService(
    HouseholdOpsDbContext dbContext,
    IClock clock,
    IAgendaQueryService agendaQueryService) : IDisplayProjectionService
{
    private static string ToDayLabel(DateOnly date, DateOnly today)
    {
        if (date == today)
        {
            return "Today";
        }

        if (date == today.AddDays(1))
        {
            return "Tomorrow";
        }

        return date.ToString("ddd, MMM d");
    }

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
                device.PresentationMode,
                device.AgendaDensityMode,
                HouseholdName = household.Name,
                HouseholdId = household.Id,
                HouseholdTimeZoneId = household.TimeZoneId,
                token.TokenHint
            })
            .SingleOrDefaultAsync(cancellationToken);

        if (result is null)
        {
            return null;
        }

        // Anchor the 7-day agenda window to the household's local midnight so
        // kiosk grouping and "Today/Tomorrow" labels match the family's wall
        // clock, not server UTC.
        var nowUtc = clock.UtcNow;
        var timeZone = HouseholdTimeBoundary.ResolveTimeZone(result.HouseholdTimeZoneId);
        var (todayStartUtc, todayEndUtc) = HouseholdTimeBoundary.GetTodayWindowUtc(nowUtc, timeZone);
        var windowStart = nowUtc;
        var windowEnd = todayEndUtc.AddDays(6);

        var agenda = await agendaQueryService.GetUpcomingEventsAsync(
            new UpcomingEventsRequest(result.HouseholdId, windowStart, windowEnd),
            cancellationToken);

        var agendaItems = agenda.Items
            .Select(i => new DisplayAgendaItemResponse(
                i.Title,
                i.StartsAtUtc,
                i.EndsAtUtc,
                i.IsAllDay,
                i.Description))
            .ToList();

        var allDayItems = agendaItems
            .Where(i => i.IsAllDay)
            .ToList();

        var timedItems = agendaItems
            .Where(i => !i.IsAllDay)
            .OrderBy(i => i.StartsAtUtc)
            .ToList();

        var nextItem = timedItems
            .FirstOrDefault();

        var today = HouseholdTimeBoundary.ToLocalDate(nowUtc, timeZone);
        var soonCutoff = windowStart.AddHours(6);

        var soonItems = timedItems
            .Where(i =>
                i.StartsAtUtc.HasValue
                && i.StartsAtUtc.Value <= soonCutoff
                && (nextItem is null
                    || i.Title != nextItem.Title
                    || i.StartsAtUtc != nextItem.StartsAtUtc))
            .ToList();

        var laterTodayItems = timedItems
            .Where(i =>
                i.StartsAtUtc.HasValue
                && HouseholdTimeBoundary.ToLocalDate(i.StartsAtUtc.Value, timeZone) == today
                && i.StartsAtUtc.Value > soonCutoff)
            .ToList();

        // Group items by household-local day once; produce both the legacy
        // summary list (counts + first start) and the richer group list that
        // matches the /app home shape (per-day event detail).
        var itemsByLocalDay = agendaItems
            .GroupBy(i =>
                HouseholdTimeBoundary.ToLocalDate(
                    i.StartsAtUtc ?? windowStart, timeZone))
            .OrderBy(group => group.Key)
            .ToList();

        var upcomingDays = itemsByLocalDay
            .Select(group =>
            {
                var items = group.ToList();
                var firstTimed = items
                    .Where(item => item.StartsAtUtc.HasValue)
                    .OrderBy(item => item.StartsAtUtc)
                    .FirstOrDefault();

                return new DisplayAgendaDaySummaryResponse(
                    group.Key,
                    ToDayLabel(group.Key, today),
                    items.Count,
                    items.Count(item => item.IsAllDay),
                    items.Count(item => !item.IsAllDay),
                    firstTimed?.StartsAtUtc);
            })
            .ToList();

        var upcomingDayGroups = itemsByLocalDay
            .Select(group => new DisplayAgendaDayGroupResponse(
                group.Key,
                ToDayLabel(group.Key, today),
                group
                    .OrderBy(i => i.IsAllDay ? 0 : 1)
                    .ThenBy(i => i.StartsAtUtc)
                    .ToList()))
            .ToList();

        var reminderCutoff = windowStart.AddMinutes(30);
        var upcomingReminders = await dbContext.EventReminders
            .Where(r =>
                r.HouseholdId == result.HouseholdId
                && r.Status == EventReminderStatuses.Pending
                && r.DueAtUtc <= reminderCutoff)
            .OrderBy(r => r.DueAtUtc)
            .Select(r => new DisplayReminderItem(r.EventTitle, r.MinutesBefore, r.DueAtUtc))
            .ToListAsync(cancellationToken);

        // Chore weekday bitmask anchored to the household's local day so a
        // "Monday" chore lights up when it is Monday at home.
        var localNow = TimeZoneInfo.ConvertTime(nowUtc, timeZone);
        var todayDayBit = 1 << (int)localNow.DayOfWeek;
        var dueChores = await dbContext.Chores
            .Where(c => c.HouseholdId == result.HouseholdId
                && c.IsActive
                && (c.RecurrenceKind == ChoreRecurrenceKind.Daily
                    || (c.RecurrenceKind == ChoreRecurrenceKind.Weekly
                        && (c.WeeklyDaysMask & todayDayBit) != 0)))
            .OrderBy(c => c.Title)
            .Take(6)
            .Select(c => new DisplayChoreItem(c.Title, c.AssignedMemberName, c.RecurrenceKind.ToString()))
            .ToListAsync(cancellationToken);

        var pinnedNotes = await dbContext.Notes
            .Where(n => n.HouseholdId == result.HouseholdId && n.IsPinned)
            .OrderByDescending(n => n.CreatedAtUtc)
            .Take(4)
            .Select(n => new DisplayNoteItem(n.Title, n.Body, n.AuthorDisplayName))
            .ToListAsync(cancellationToken);

        return new DisplayProjectionResponse(
            AccessMode: "DisplayToken",
            DeviceName: result.DeviceName,
            HouseholdName: result.HouseholdName,
            PresentationMode: result.PresentationMode.ToString(),
            AgendaDensityMode: result.AgendaDensityMode.ToString(),
            AccessTokenHint: result.TokenHint,
            GeneratedAtUtc: clock.UtcNow,
            Sections: new[]
            {
                new DisplayProjectionSectionResponse(
                    "Household",
                    $"{result.HouseholdName} on {result.DeviceName}")
            },
            AgendaSection: new DisplayAgendaSectionResponse(
                WindowStartUtc: agenda.WindowStartUtc,
                WindowEndUtc: agenda.WindowEndUtc,
                NextItem: nextItem,
                AllDayItems: allDayItems,
                SoonItems: soonItems,
                LaterTodayItems: laterTodayItems,
                UpcomingDays: upcomingDays,
                UpcomingDayGroups: upcomingDayGroups,
                Items: agendaItems),
            UpcomingReminders: upcomingReminders,
            DueChores: dueChores,
            PinnedNotes: pinnedNotes);
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
                device.PresentationMode.ToString(),
                device.AgendaDensityMode.ToString(),
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
            device.PresentationMode.ToString(),
            device.AgendaDensityMode.ToString(),
            accessToken,
            token.TokenHint,
            $"/display/{accessToken}",
            createdAtUtc);
    }

    public async Task<DisplayDeviceSummaryResponse?> UpdatePresentationModeAsync(
        Guid householdId,
        Guid deviceId,
        DisplayPresentationMode presentationMode,
        CancellationToken cancellationToken)
    {
        var device = await dbContext.DisplayDevices
            .SingleOrDefaultAsync(
                item => item.HouseholdId == householdId && item.Id == deviceId,
                cancellationToken);

        if (device is null)
        {
            return null;
        }

        device.PresentationMode = presentationMode;
        await dbContext.SaveChangesAsync(cancellationToken);

        var tokenHint = await dbContext.DisplayAccessTokens
            .Where(token => token.DisplayDeviceId == device.Id && token.RevokedAtUtc == null)
            .OrderByDescending(token => token.CreatedAtUtc)
            .Select(token => token.TokenHint)
            .FirstOrDefaultAsync(cancellationToken) ?? "None";

        return new DisplayDeviceSummaryResponse(
            device.Id,
            device.Name,
            device.IsActive,
            device.PresentationMode.ToString(),
            device.AgendaDensityMode.ToString(),
            tokenHint,
            device.CreatedAtUtc);
    }

    public async Task<DisplayDeviceSummaryResponse?> UpdateAgendaDensityModeAsync(
        Guid householdId,
        Guid deviceId,
        DisplayAgendaDensityMode agendaDensityMode,
        CancellationToken cancellationToken)
    {
        var device = await dbContext.DisplayDevices
            .SingleOrDefaultAsync(
                item => item.HouseholdId == householdId && item.Id == deviceId,
                cancellationToken);

        if (device is null)
        {
            return null;
        }

        device.AgendaDensityMode = agendaDensityMode;
        await dbContext.SaveChangesAsync(cancellationToken);

        var tokenHint = await dbContext.DisplayAccessTokens
            .Where(token => token.DisplayDeviceId == device.Id && token.RevokedAtUtc == null)
            .OrderByDescending(token => token.CreatedAtUtc)
            .Select(token => token.TokenHint)
            .FirstOrDefaultAsync(cancellationToken) ?? "None";

        return new DisplayDeviceSummaryResponse(
            device.Id,
            device.Name,
            device.IsActive,
            device.PresentationMode.ToString(),
            device.AgendaDensityMode.ToString(),
            tokenHint,
            device.CreatedAtUtc);
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
